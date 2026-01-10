import { supabase } from '@/shared/services/api/supabase';
import { powerSyncConnectionManager } from '@/shared/services/powersync/PowerSyncConnectionManager';
import { networkService } from '@/shared/services/network/NetworkService';
import {
  migrateLocalUserOwnedData,
  purgeLocalUserOwnedData,
} from '@/shared/services/powersync/UserDataMigration';
import { logger } from '@/shared/utils/logger';
import {
  normalizePhoneNumber,
  getPhoneFormats,
} from '@/shared/utils/phoneValidation';
import type { AuthCredentials } from '@/features/auth/types/auth';
import type { Session, User } from '@supabase/supabase-js';
import { getOfflineUserId } from '@/shared/services/auth/OfflineIdentity';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { useProfileStore } from '@/shared/store/profileStore';
import { dataClearingService } from '@/shared/services/DataClearingService';
import { userVersionCheckService } from '@/features/auth/services/userVersionCheckService';

// Logging configuration for this module
const ENABLE_LOGGING = true;

export interface AuthResult {
  success: boolean;
  user?: User;
  session?: Session | null;
  error?: string;
}

export interface SignInOptions {
  shouldMigrateData?: boolean;
  conflictResolution?: 'keep_anonymous' | 'keep_authenticated' | 'merge';
}

let ensureSessionPromise: Promise<void> | null = null;

export const authService = {
  /**
   * Check if current user has anonymous session with existing data
   * This helps determine if we should promote anonymous user instead of creating new one
   */
  async hasAnonymousUserData(): Promise<boolean> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Check if user has anonymous session
      if (!session?.user?.is_anonymous) {
        return false;
      }

      // Check if PowerSync is initialized
      if (!powerSyncSystem.isInitialized) {
        return false;
      }

      const userId = session.user.id;

      // Check for any user-owned data
      const checks = await Promise.all([
        // Check for version selections
        powerSyncSystem.get(
          'SELECT COUNT(*) as count FROM user_current_selections WHERE user_id = ?',
          [userId]
        ),
        // Check for saved versions
        powerSyncSystem.get(
          'SELECT COUNT(*) as count FROM user_saved_audio_versions WHERE user_id = ?',
          [userId]
        ),
        powerSyncSystem.get(
          'SELECT COUNT(*) as count FROM user_saved_text_versions WHERE user_id = ?',
          [userId]
        ),
        // Check for bookmarks
        powerSyncSystem.get(
          'SELECT COUNT(*) as count FROM user_bookmarks WHERE user_id = ?',
          [userId]
        ),
        // Check for playlists
        powerSyncSystem.get(
          'SELECT COUNT(*) as count FROM user_playlists WHERE user_id = ?',
          [userId]
        ),
      ]);

      // If any table has data, user has existing data
      const hasData = checks.some(result => (result?.count || 0) > 0);

      logger.info(ENABLE_LOGGING, 'AuthService: Anonymous user data check:', {
        userId,
        hasData,
        counts: {
          selections: checks[0]?.count || 0,
          audioVersions: checks[1]?.count || 0,
          textVersions: checks[2]?.count || 0,
          bookmarks: checks[3]?.count || 0,
          playlists: checks[4]?.count || 0,
        },
      });

      return hasData;
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'AuthService: Error checking anonymous user data:',
        error
      );
      return false;
    }
  },

  /** Ensure there is a Supabase session (anonymous if needed) when online */
  async ensureSessionIfOnline(): Promise<void> {
    // Coalesce concurrent calls to a single run
    if (ensureSessionPromise) return ensureSessionPromise;
    ensureSessionPromise = (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) return; // already have a session

        const isOnline = await networkService.checkOnlineCapabilities();
        if (!isOnline) return; // stay fully offline-first

        const { error } = await supabase.auth.signInAnonymously();
        if (error) {
          throw new Error(`Anonymous session failed: ${error.message}`);
        }

        // Update auth store immediately with the new session
        const {
          data: { session: newSession },
        } = await supabase.auth.getSession();
        if (newSession) {
          const { useAuthStore } = await import('@/shared/store/authStore');
          useAuthStore.getState().setSession(newSession);
        }

        // Nudge PowerSync to connect sooner under the new session
        try {
          // Ensure DB is initialized and seeded before attempting migration to avoid lock contention
          await powerSyncSystem.waitUntilInitialized();
          try {
            // Some seeds run in background; wait best-effort if exposed
            await powerSyncSystem.waitUntilSeeded();
          } catch {
            // best-effort only
          }
          // Migrate local user-owned data from offline device uid to new session uid before connecting
          try {
            const offlineUid = await getOfflineUserId();
            const current = await supabase.auth.getSession();
            const newUid = current?.data?.session?.user?.id ?? null;
            await migrateLocalUserOwnedData(offlineUid, newUid);
          } catch {
            // best-effort only
          }

          // Ensure DB is initialized before connection attempt as well
          await powerSyncSystem.waitUntilInitialized();
          await powerSyncConnectionManager.attemptConnection();
        } catch {
          // best-effort only
        }
      } catch (e) {
        logger.warn(
          ENABLE_LOGGING,
          'AuthService: ensureSessionIfOnline failed',
          e
        );
      } finally {
        ensureSessionPromise = null;
      }
    })();
    return ensureSessionPromise;
  },
  /** Get current auth uid or null */
  async getCurrentUserId(): Promise<string | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data.session?.user?.id ?? null;
  },

  /**
   * Sign in with email and password
   * Handles data migration from anonymous to authenticated user
   */
  async signIn(
    credentials: AuthCredentials,
    _options: SignInOptions = {
      shouldMigrateData: true,
      conflictResolution: 'merge',
    }
  ): Promise<AuthResult> {
    try {
      logger.info(ENABLE_LOGGING, 'AuthService: Starting sign in process');
      const oldUid = await this.getCurrentUserId();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'No user returned from sign in' };
      }

      logger.info(ENABLE_LOGGING, 'AuthService: Sign in successful');

      const newUid = data.user?.id ?? null;

      // Only authenticate if email is confirmed
      if (data.user.email_confirmed_at) {
        // FIRST: Migrate local data BEFORE connecting to PowerSync
        // This ensures local data is preserved and uploaded to server
        await migrateLocalUserOwnedData(oldUid, newUid);

        // SECOND: Connect PowerSync with authenticated session
        await powerSyncConnectionManager.onUserAuthenticated();

        // THIRD: Wait for initial sync to complete
        await this.waitForInitialSync();
      }

      return { success: true, user: data.user, session: data.session };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        ENABLE_LOGGING,
        'AuthService: Sign in failed:',
        errorMessage
      );
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Sign in with phone and password
   * Performs local migration before refreshing PowerSync.
   */
  async signInWithPhonePassword(
    phone: string,
    password: string
  ): Promise<AuthResult> {
    try {
      logger.info(
        ENABLE_LOGGING,
        'AuthService: Starting phone/password sign in'
      );

      const oldUid = await this.getCurrentUserId();

      // Some projects support phone+password in GoTrue; if not enabled, this will return an error
      const { data, error } = await supabase.auth.signInWithPassword({
        phone,
        password,
      } as unknown as { phone: string; password: string });

      if (error) {
        return { success: false, error: error.message };
      }

      const newUid = data.user?.id ?? null;
      if (!newUid) {
        return { success: false, error: 'No user returned from sign in' };
      }

      // Migrate local data before refreshing PowerSync
      await migrateLocalUserOwnedData(oldUid, newUid);

      // Only authenticate if phone is confirmed
      if (data.user.phone_confirmed_at) {
        await powerSyncConnectionManager.onUserAuthenticated();
      }

      return { success: true, user: data.user, session: data.session };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        ENABLE_LOGGING,
        'AuthService: Phone/password sign in failed:',
        errorMessage
      );
      return { success: false, error: errorMessage };
    }
  },

  /** Begin phone OTP sign-in */
  async signInWithPhoneOtpStart(phone: string): Promise<AuthResult> {
    try {
      logger.info(ENABLE_LOGGING, 'AuthService: Starting phone OTP sign in');

      // Log phone number formats for debugging
      const phoneFormats = getPhoneFormats(phone);
      logger.info(ENABLE_LOGGING, '📱 Phone Format Analysis:', {
        rawPhone: phone,
        formats: phoneFormats,
        expectedFormat: 'E.164 (e.g., +61478778288)',
        isAlreadyE164: phoneFormats.e164 === phone,
      });

      // Normalize phone number to E.164 format
      const normalizedPhone = normalizePhoneNumber(phone);

      logger.info(ENABLE_LOGGING, '📱 Supabase OTP Request:', {
        originalPhone: phone,
        normalizedPhone: normalizedPhone,
        phoneChanged: phone !== normalizedPhone,
        supabaseRequest: {
          phone: normalizedPhone,
          options: { shouldCreateUser: false },
        },
      });

      const { error } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
        options: { shouldCreateUser: false },
      });

      if (error) {
        logger.error(ENABLE_LOGGING, '📱 Supabase OTP Error:', {
          originalPhone: phone,
          normalizedPhone: normalizedPhone,
          error: error.message,
          errorCode: error.status,
        });
        return { success: false, error: error.message };
      }

      logger.info(ENABLE_LOGGING, '📱 OTP Request Success:', {
        originalPhone: phone,
        normalizedPhone: normalizedPhone,
        message: 'SMS should be sent to normalized phone number',
      });

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      logger.error(ENABLE_LOGGING, '📱 OTP Request Exception:', {
        originalPhone: phone,
        error: errorMessage,
        errorType:
          error instanceof Error ? error.constructor.name : typeof error,
      });

      return { success: false, error: errorMessage };
    }
  },

  /** Verify phone OTP for sign up or sign in, then complete authentication */
  async verifyPhoneOtp(phone: string, token: string): Promise<AuthResult> {
    try {
      logger.info(ENABLE_LOGGING, 'AuthService: Verifying phone OTP');

      // Log phone number formats for debugging
      const phoneFormats = getPhoneFormats(phone);
      logger.info(
        ENABLE_LOGGING,
        '📱 OTP Verification - Phone Format Analysis:',
        {
          rawPhone: phone,
          formats: phoneFormats,
          expectedFormat: 'E.164 (e.g., +61478778288)',
          isAlreadyE164: phoneFormats.e164 === phone,
        }
      );

      // Normalize phone number to E.164 format
      const normalizedPhone = normalizePhoneNumber(phone);

      logger.info(ENABLE_LOGGING, '📱 OTP Verification - Supabase Request:', {
        originalPhone: phone,
        normalizedPhone: normalizedPhone,
        phoneChanged: phone !== normalizedPhone,
        token: token.substring(0, 2) + '****', // Mask token for security
        supabaseRequest: {
          phone: normalizedPhone,
          token: '****',
          type: 'sms',
        },
      });

      const oldUid = await this.getCurrentUserId();

      const { data, error } = await supabase.auth.verifyOtp({
        phone: normalizedPhone,
        token,
        type: 'sms',
      } as unknown as { phone: string; token: string; type: 'sms' });

      if (error) {
        logger.error(ENABLE_LOGGING, '📱 OTP Verification - Supabase Error:', {
          originalPhone: phone,
          normalizedPhone: normalizedPhone,
          error: error.message,
          errorCode: error.status,
        });
        return { success: false, error: error.message };
      }

      const newUid = data?.user?.id ?? null;
      if (!newUid) {
        logger.error(
          ENABLE_LOGGING,
          '📱 OTP Verification - No User Returned:',
          {
            originalPhone: phone,
            normalizedPhone: normalizedPhone,
            data: data,
          }
        );
        return {
          success: false,
          error: 'No user returned after OTP verification',
        };
      }

      logger.info(ENABLE_LOGGING, '📱 OTP Verification - Success:', {
        originalPhone: phone,
        normalizedPhone: normalizedPhone,
        oldUid,
        newUid,
        willMigrateData: oldUid && oldUid !== newUid,
      });

      // Migrate local data before refreshing PowerSync (if different UIDs)
      if (oldUid && oldUid !== newUid) {
        await migrateLocalUserOwnedData(oldUid, newUid);
      }

      // Complete authentication and refresh PowerSync
      await powerSyncConnectionManager.onUserAuthenticated();

      return {
        success: true,
        ...(data.user ? { user: data.user } : {}),
        session: data.session ?? null,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      logger.error(ENABLE_LOGGING, '📱 OTP Verification - Exception:', {
        originalPhone: phone,
        error: errorMessage,
        errorType:
          error instanceof Error ? error.constructor.name : typeof error,
      });

      return { success: false, error: errorMessage };
    }
  },

  /**
   * Sign up with email and password
   * Creates user account but requires email verification before activation
   * Uses anonymous promotion pattern for consistency with phone signup
   */
  async signUp(
    credentials: AuthCredentials,
    _options: SignInOptions = {
      shouldMigrateData: true,
      conflictResolution: 'merge',
    }
  ): Promise<AuthResult> {
    try {
      logger.info(
        ENABLE_LOGGING,
        'AuthService: Starting email sign up process'
      );

      // First, create an anonymous user
      const { data: anonymousData, error: anonymousError } =
        await supabase.auth.signInAnonymously();
      if (anonymousError) {
        return { success: false, error: anonymousError.message };
      }

      if (!anonymousData.user) {
        return { success: false, error: 'Failed to create anonymous user' };
      }

      // Update the anonymous user with email and password
      const { data, error } = await supabase.auth.updateUser({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'No user returned from email sign up' };
      }

      logger.info(
        ENABLE_LOGGING,
        'AuthService: Email sign up successful, email verification required'
      );

      // Return user data but no session (indicating verification required)
      return {
        success: true,
        user: data.user,
        session: null, // No session until email is verified
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        ENABLE_LOGGING,
        'AuthService: Email sign up failed:',
        errorMessage
      );
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Sign out user and switch to anonymous session
   */
  async signOut(): Promise<AuthResult> {
    try {
      logger.info(ENABLE_LOGGING, 'AuthService: Starting sign out process');

      // Purge local user data immediately for privacy
      try {
        await purgeLocalUserOwnedData();
      } catch (purgeErr) {
        logger.warn(
          ENABLE_LOGGING,
          'AuthService: purge during sign out failed',
          purgeErr
        );
      }

      const { error } = await supabase.auth.signOut();

      if (error) {
        return { success: false, error: error.message };
      }

      // Switch to anonymous session
      await powerSyncConnectionManager.onUserSignedOut();

      logger.info(
        ENABLE_LOGGING,
        'AuthService: Sign out completed, switched to anonymous session'
      );

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        ENABLE_LOGGING,
        'AuthService: Sign out failed:',
        errorMessage
      );
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Promote anonymous user to authenticated user (convert existing account)
   */
  async promoteAnonymousUser(credentials: {
    email?: string;
    phone?: string;
    password?: string;
  }): Promise<AuthResult> {
    try {
      logger.info(
        ENABLE_LOGGING,
        'AuthService: Promoting anonymous user to authenticated user'
      );

      // Update the current anonymous user (email or phone supported by caller)
      const updatePayload: Record<string, string> = {};
      if (credentials.email) updatePayload['email'] = credentials.email;
      if (credentials.phone) updatePayload['phone'] = credentials.phone;
      if (credentials.password)
        updatePayload['password'] = credentials.password;

      const { data, error } = await supabase.auth.updateUser(updatePayload);

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'No user returned from promotion' };
      }

      logger.info(
        ENABLE_LOGGING,
        'AuthService: Anonymous user promotion initiated (awaiting verification if required)'
      );

      return {
        success: true,
        user: data.user,
        session: null,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        ENABLE_LOGGING,
        'AuthService: Anonymous user promotion failed:',
        errorMessage
      );
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Sign up with phone number for new users
   * Creates user account but requires phone verification before activation
   */
  async signUpWithPhone(phone: string, password: string): Promise<AuthResult> {
    try {
      logger.info(
        ENABLE_LOGGING,
        'AuthService: Starting phone sign up process'
      );

      // First, create an anonymous user
      const { data: anonymousData, error: anonymousError } =
        await supabase.auth.signInAnonymously();
      if (anonymousError) {
        return { success: false, error: anonymousError.message };
      }

      if (!anonymousData.user) {
        return { success: false, error: 'Failed to create anonymous user' };
      }

      // Update the anonymous user with phone and password
      const { data, error } = await supabase.auth.updateUser({
        phone,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'No user returned from phone sign up' };
      }

      logger.info(
        ENABLE_LOGGING,
        'AuthService: Phone sign up successful, phone verification required'
      );

      // Return user data but no session (indicating verification required)
      return {
        success: true,
        user: data.user,
        session: null, // No session until phone is verified
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        ENABLE_LOGGING,
        'AuthService: Phone sign up failed:',
        errorMessage
      );
      return { success: false, error: errorMessage };
    }
  },

  /** Begin phone-based promotion (anonymous -> verified phone account) */
  async promoteAnonymousWithPhoneStart(phone: string): Promise<AuthResult> {
    try {
      logger.info(
        ENABLE_LOGGING,
        'AuthService: Starting anonymous promotion with phone'
      );
      const { data, error } = await supabase.auth.updateUser({ phone });
      if (error) return { success: false, error: error.message };
      return { success: true, user: data.user, session: null };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  },

  /** Verify phone for promotion, then refresh PowerSync (uid unchanged) */
  async verifyPhonePromotionOtp(
    phone: string,
    token: string
  ): Promise<AuthResult> {
    try {
      logger.info(ENABLE_LOGGING, 'AuthService: Verifying phone for promotion');
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      } as unknown as { phone: string; token: string; type: 'sms' });
      if (error) return { success: false, error: error.message };

      // uid is preserved; just refresh PowerSync to pick up new JWT claims
      await powerSyncConnectionManager.onUserAuthenticated();

      return {
        success: true,
        ...(data.user ? { user: data.user } : {}),
        session: data.session ?? null,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  },

  async setPassword(password: string): Promise<AuthResult> {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  },

  async updateProfileNames(
    firstName: string,
    lastName: string
  ): Promise<AuthResult> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const id = user?.id;
      if (!id) return { success: false, error: 'Not authenticated' };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('users').upsert(
        {
          id,
          first_name: firstName,
          last_name: lastName,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (error) return { success: false, error: error.message };

      // 🎯 UPDATE PROFILE STORE AFTER SUCCESSFUL UPDATE
      const currentProfile = useProfileStore.getState().profile;
      if (currentProfile) {
        useProfileStore.getState().setProfile({
          ...currentProfile,
          first_name: firstName,
          last_name: lastName,
          updated_at: new Date().toISOString(),
        });
      }

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Reset password for email
   */
  async resetPassword(email: string): Promise<AuthResult> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'your-app://reset-password',
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        ENABLE_LOGGING,
        'AuthService: Password reset failed:',
        errorMessage
      );
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Get current user
   */
  async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    return user;
  },

  /**
   * Get current session
   */
  async getCurrentSession() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    return session;
  },

  /**
   * Check if current session is anonymous
   */
  async isAnonymousSession(): Promise<boolean> {
    try {
      const session = await this.getCurrentSession();
      return session?.user?.is_anonymous ?? false;
    } catch {
      return false;
    }
  },

  // Subscribe to auth state changes
  onAuthStateChange(
    callback: (event: string, session: Session | null) => void
  ) {
    return supabase.auth.onAuthStateChange(callback);
  },

  /**
   * Verify email code and complete authentication
   * Handles both promoted anonymous users and new users
   */
  async verifyEmailCode(code: string, email: string): Promise<AuthResult> {
    try {
      logger.info(ENABLE_LOGGING, 'AuthService: Verifying email code');

      const { data, error } = await supabase.auth.verifyOtp({
        token: code,
        type: 'email',
        email: email,
      });

      if (error) {
        logger.error(
          ENABLE_LOGGING,
          'AuthService: Email verification failed:',
          error.message
        );
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'No user returned after email verification',
        };
      }

      logger.info(
        ENABLE_LOGGING,
        'AuthService: Email verified successfully, completing authentication'
      );

      // Now that email is verified, complete the authentication process
      await powerSyncConnectionManager.onUserAuthenticated();

      // Wait for initial sync to ensure data is properly synced
      await this.waitForInitialSync();

      // Check if user needs version selection (for both promoted and new users)
      try {
        await userVersionCheckService.checkUserVersionNeeds(data.user.id);
      } catch (versionError) {
        logger.warn(
          ENABLE_LOGGING,
          'AuthService: Version check failed (non-fatal):',
          versionError
        );
      }

      return {
        success: true,
        user: data.user,
        session: data.session,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        ENABLE_LOGGING,
        'AuthService: Email verification error:',
        errorMessage
      );
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Wait for PowerSync to complete initial sync to avoid server overwriting local data
   */
  async waitForInitialSync(): Promise<void> {
    const maxWaitTime = 5000; // 5 seconds
    const checkInterval = 500; // 500ms
    let waited = 0;

    logger.info(
      ENABLE_LOGGING,
      'AuthService: Waiting for PowerSync initial sync...'
    );

    while (waited < maxWaitTime) {
      try {
        const status = powerSyncSystem.getStatus();
        if (status.connected && status.status?.lastSyncedAt) {
          logger.info(
            ENABLE_LOGGING,
            'AuthService: PowerSync initial sync completed'
          );
          return;
        }
      } catch {
        // Continue waiting if status check fails
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    logger.warn(
      ENABLE_LOGGING,
      'AuthService: PowerSync initial sync timeout, proceeding with migration'
    );
  },

  /**
   * Resend email verification
   */
  async resendEmailVerification(email: string): Promise<AuthResult> {
    try {
      logger.info(ENABLE_LOGGING, 'AuthService: Resending email verification');

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        logger.error(
          ENABLE_LOGGING,
          'AuthService: Resend email failed:',
          error.message
        );
        return { success: false, error: error.message };
      }

      logger.info(
        ENABLE_LOGGING,
        'AuthService: Email verification resent successfully to:',
        email
      );
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        ENABLE_LOGGING,
        'AuthService: Resend email error:',
        errorMessage
      );
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Sign in with fresh start - clears all data and syncs fresh from server
   * This method provides a clean slate approach for user authentication
   */
  async signInWithFreshStart(
    credentials: AuthCredentials
  ): Promise<AuthResult> {
    try {
      logger.info(
        ENABLE_LOGGING,
        'AuthService: Starting fresh start sign in process'
      );

      // Import sync screen store to update progress
      const { useSyncScreenStore } =
        await import('@/features/auth/store/syncScreenStore');
      const syncStore = useSyncScreenStore.getState();

      // Phase 1: Clear all user data
      syncStore.updateSyncState({
        phase: 'clearing',
        message: 'Starting fresh...',
        progress: 0.1,
      });

      logger.info(ENABLE_LOGGING, 'AuthService: Clearing all user data');
      await dataClearingService.clearAllData();

      // Phase 2: Authenticate with Supabase
      syncStore.updateSyncState({
        phase: 'connecting',
        message: 'Connecting to your account...',
        progress: 0.3,
      });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        syncStore.setError(error.message);
        return { success: false, error: error.message };
      }

      if (!data.user) {
        const errorMsg = 'No user returned from sign in';
        syncStore.setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      logger.info(
        ENABLE_LOGGING,
        'AuthService: Fresh start sign in successful'
      );

      // Only proceed if email is confirmed
      if (data.user.email_confirmed_at) {
        // Phase 3: Connect PowerSync with authenticated session
        syncStore.updateSyncState({
          phase: 'connecting',
          message: 'Syncing your preferences...',
          progress: 0.5,
        });

        await powerSyncConnectionManager.onUserAuthenticated();

        // Phase 4: Wait for initial sync to complete
        syncStore.updateSyncState({
          phase: 'syncing',
          message: 'Downloading your data...',
          progress: 0.7,
        });

        await this.waitForInitialSync();

        // Phase 5: Check version information
        syncStore.updateSyncState({
          phase: 'logging',
          message: 'Preparing your experience...',
          progress: 0.9,
        });

        // Log version information for future functionality
        try {
          const versionCheck =
            await userVersionCheckService.checkUserVersionNeeds(data.user.id);
          const defaultVersions =
            await userVersionCheckService.getDefaultVersions();

          logger.info(
            ENABLE_LOGGING,
            'AuthService: Fresh start version info:',
            {
              needsVersionSelection: versionCheck.needsVersionSelection,
              hasCurrentSelections: versionCheck.hasCurrentSelections,
              hasSavedVersions: versionCheck.hasSavedVersions,
              hasDefaultVersions: versionCheck.hasDefaultVersions,
              availableAudioVersions: defaultVersions.audio.length,
              availableTextVersions: defaultVersions.text.length,
            }
          );
          // Determine version info for sync completion
          const hasVersions =
            versionCheck.hasCurrentSelections || versionCheck.hasSavedVersions;
          const canSkipOnboarding =
            hasVersions && versionCheck.hasDefaultVersions;

          syncStore.completeSync({ hasVersions, canSkipOnboarding });
        } catch (versionError) {
          logger.warn(
            ENABLE_LOGGING,
            'AuthService: Version check failed (non-fatal):',
            versionError
          );
          syncStore.completeSync();
        }
      } else {
        // Email not confirmed - complete sync anyway
        syncStore.completeSync();
      }

      return { success: true, user: data.user, session: data.session };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        ENABLE_LOGGING,
        'AuthService: Fresh start sign in failed:',
        errorMessage
      );

      // Set error in sync store if available
      try {
        const { useSyncScreenStore } =
          await import('@/features/auth/store/syncScreenStore');
        useSyncScreenStore.getState().setError(errorMessage);
      } catch {
        // Ignore if sync store not available
      }

      return { success: false, error: errorMessage };
    }
  },
};
