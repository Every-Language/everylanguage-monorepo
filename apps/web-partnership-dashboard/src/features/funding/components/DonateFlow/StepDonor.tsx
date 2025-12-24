import React from 'react';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { CustomPhoneInput } from '@/features/auth/components/CustomPhoneInput';
import { LoggedInPartnerOrgSelector } from './LoggedInPartnerOrgSelector';
import { AnonymousPartnerOrgSelector } from './AnonymousPartnerOrgSelector';
import { supabase } from '@/shared/services/supabase';
import { findAnonymousUserByContact } from '../../api/fundingApi';
import { authService } from '@/features/auth/services/auth';
import type { DonateFlow } from '../../hooks/useDonateFlow';

export const StepDonor: React.FC<{ flow: DonateFlow }> = ({ flow }) => {
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [donorMode, setDonorMode] = React.useState<
    'individual' | 'existing' | 'new'
  >('individual');
  const [donorType, setDonorType] = React.useState<
    'individual' | 'organization' | null
  >('individual');
  const [partnerOrgId, setPartnerOrgId] = React.useState('');
  const [selectedOrg, setSelectedOrg] = React.useState<{
    id: string;
    name: string;
    description: string | null;
    isNew?: boolean;
  } | null>(null);
  const [newOrgName, setNewOrgName] = React.useState('');
  const [newOrgDesc, setNewOrgDesc] = React.useState('');
  const [newOrgPublic, setNewOrgPublic] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [user, setUser] = React.useState<any | null>(null);
  const [isAnonymous, setIsAnonymous] = React.useState<boolean | null>(null);
  const [checkingAuth, setCheckingAuth] = React.useState(true);
  const [showLoginForm, setShowLoginForm] = React.useState(false);
  const [matchedEmail, setMatchedEmail] = React.useState<string | null>(null);
  const [matchedPhone, setMatchedPhone] = React.useState<string | null>(null);
  const [loginPassword, setLoginPassword] = React.useState('');
  const [loginLoading, setLoginLoading] = React.useState(false);
  const [loginError, setLoginError] = React.useState<string | null>(null);

  // Check auth status on mount
  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);
          setIsAnonymous(session.user.is_anonymous ?? false);
        } else {
          setIsAnonymous(null);
        }
      } catch (err) {
        console.error('Error checking auth:', err);
        setIsAnonymous(null);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsAnonymous(session.user.is_anonymous ?? false);
      } else {
        setUser(null);
        setIsAnonymous(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async () => {
    // Validation
    const emailValid = /.+@.+\..+/.test(email);
    if (!firstName || !lastName || !emailValid) {
      setError('Please enter first name, last name, and a valid email.');
      return;
    }

    // For anonymous users with new component structure
    if (donorType === 'organization' && !selectedOrg) {
      setError('Please select or create an organization.');
      return;
    }

    // Legacy validation for old structure (if still used)
    if (donorMode === 'new' && !newOrgName) {
      setError('Please enter an organization name.');
      return;
    }

    if (donorMode === 'existing' && !partnerOrgId) {
      setError('Please select an organization.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // For authenticated users (non-anonymous), skip anonymous user creation
      if (user && !isAnonymous) {
        // Set donor details (pre-fill from user if available)
        flow.setDonor({
          firstName: firstName || user.user_metadata?.first_name || '',
          lastName: lastName || user.user_metadata?.last_name || '',
          email: email || user.email || '',
          phone: phone || user.phone || '',
        });

        // Set donor type (handled by LoggedInPartnerOrgSelector)
        if (donorMode === 'individual') {
          flow.setDonorType({ type: 'individual' });
        } else if (donorMode === 'existing') {
          flow.setDonorType({ type: 'partner_org', partnerOrgId });
        } else {
          flow.setDonorType({
            type: 'partner_org',
            newPartnerOrg: {
              name: newOrgName,
              description: newOrgDesc,
              isPublic: newOrgPublic,
            },
          });
        }

        flow.setPaymentMethod('card');
        flow.next();
        return;
      }

      // For anonymous users or no session: ensure we have a session
      // 1. Check for existing session
      let session = await supabase.auth.getSession();

      // 2. If no session, check for existing user by contact info
      if (!session.data.session) {
        const existingUser = await findAnonymousUserByContact(
          email || undefined,
          phone || undefined
        );

        if (existingUser?.user_id) {
          if (existingUser.is_anonymous) {
            // Sign in with existing anonymous user
            // Note: We can't directly sign in with anonymous user credentials
            // Instead, we'll create a new anonymous user and let the backend handle deduplication
            // OR we could store the anonymous user's token somehow - but that's complex
            // For now, we'll create a new anonymous user and the RPC function will help prevent duplicates
          } else {
            // Existing authenticated user - show inline login form
            setMatchedEmail(existingUser.email || email || null);
            setMatchedPhone(existingUser.phone || phone || null);
            setShowLoginForm(true);
            setLoading(false);
            return;
          }
        }

        // 3. Create anonymous user if no existing user found
        const { data: _signInData, error: signInError } =
          await supabase.auth.signInAnonymously();

        if (signInError) {
          setError('Failed to initialize session. Please try again.');
          setLoading(false);
          return;
        }

        // 4. Wait for session and verify access_token exists
        session = await supabase.auth.getSession();
        if (!session.data.session?.access_token) {
          setError('Session not available. Please refresh the page.');
          setLoading(false);
          return;
        }
      }

      // 5. Verify we have a valid session before proceeding
      if (!session.data.session?.access_token) {
        setError('Invalid session. Please refresh the page.');
        setLoading(false);
        return;
      }

      // Set donor details
      flow.setDonor({ firstName, lastName, email, phone });

      // Set donor type - use new structure if available, otherwise fall back to legacy
      if (donorType === 'individual') {
        flow.setDonorType({ type: 'individual' });
      } else if (donorType === 'organization' && selectedOrg) {
        if (selectedOrg.isNew) {
          flow.setDonorType({
            type: 'partner_org',
            newPartnerOrg: {
              name: selectedOrg.name,
              description: selectedOrg.description || undefined,
              isPublic: newOrgPublic,
            },
          });
        } else {
          flow.setDonorType({
            type: 'partner_org',
            partnerOrgId: selectedOrg.id,
          });
        }
      } else if (donorMode === 'individual') {
        flow.setDonorType({ type: 'individual' });
      } else if (donorMode === 'existing') {
        flow.setDonorType({ type: 'partner_org', partnerOrgId });
      } else {
        flow.setDonorType({
          type: 'partner_org',
          newPartnerOrg: {
            name: newOrgName,
            description: newOrgDesc,
            isPublic: newOrgPublic,
          },
        });
      }

      // Automatically set payment method to card and skip payment method selection step
      flow.setPaymentMethod('card');
      flow.next();
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking auth
  if (checkingAuth) {
    return (
      <div className='space-y-4'>
        <div className='text-sm text-neutral-600 dark:text-neutral-400'>
          Loading...
        </div>
      </div>
    );
  }

  // For authenticated users (non-anonymous), show different UI
  if (user && !isAnonymous) {
    return (
      <div className='space-y-4'>
        <div className='text-sm text-neutral-600 dark:text-neutral-400'>
          Welcome back
          {user.user_metadata?.first_name
            ? `, ${user.user_metadata.first_name}`
            : ''}
          !
        </div>
        <LoggedInPartnerOrgSelector
          flow={flow}
          onDonorTypeSelected={(donorType, donorDetails) => {
            // Set donor details if provided
            if (donorDetails) {
              flow.setDonor(donorDetails);
            }

            // Set donor type
            if (donorType.type === 'individual') {
              flow.setDonorType({ type: 'individual' });
            } else if (donorType.type === 'partner_org') {
              if (donorType.partnerOrgId) {
                flow.setDonorType({
                  type: 'partner_org',
                  partnerOrgId: donorType.partnerOrgId,
                });
              } else if (donorType.newPartnerOrg) {
                flow.setDonorType({
                  type: 'partner_org',
                  newPartnerOrg: donorType.newPartnerOrg,
                });
              }
            }

            // Automatically set payment method to card and proceed directly to payment details (step 4)
            flow.setPaymentMethod('card');
            // Go directly to step 4 (Review & Payment)
            flow.next(); // Step 3 -> Step 4
          }}
        />
      </div>
    );
  }

  // For anonymous users or no session, show donor details form
  return (
    <div className='space-y-4'>
      <div className='text-sm text-neutral-600 dark:text-neutral-400'>
        Your details
      </div>

      {/* Donor Details */}
      <div className='space-y-3'>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
          <Input
            placeholder='First name'
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
          />
          <Input
            placeholder='Last name'
            value={lastName}
            onChange={e => setLastName(e.target.value)}
          />
          <div className='sm:col-span-2'>
            <Input
              placeholder='Email'
              type='email'
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className='sm:col-span-2'>
            <CustomPhoneInput value={phone} onChange={v => setPhone(v || '')} />
          </div>
        </div>
      </div>

      {/* Donor Type Selection - New component for anonymous users */}
      <AnonymousPartnerOrgSelector
        donorType={donorType}
        onDonorTypeChange={type => {
          setDonorType(type);
          // Update legacy donorMode for backward compatibility
          if (type === 'individual') {
            setDonorMode('individual');
          } else if (type === 'organization') {
            setDonorMode('existing'); // Default to existing, will be updated when org is selected/created
          }
        }}
        selectedOrgId={selectedOrg?.id || null}
        onOrgSelect={org => {
          setSelectedOrg(org);
          if (org.isNew) {
            setPartnerOrgId('');
            setNewOrgName(org.name);
            setNewOrgDesc(org.description || '');
            setDonorMode('new');
          } else {
            setPartnerOrgId(org.id);
            setDonorMode('existing');
          }
        }}
        newOrgName={newOrgName}
        onNewOrgNameChange={setNewOrgName}
        newOrgDesc={newOrgDesc}
        onNewOrgDescChange={setNewOrgDesc}
        newOrgPublic={newOrgPublic}
        onNewOrgPublicChange={setNewOrgPublic}
      />

      {error && <div className='text-sm text-error-600'>{error}</div>}

      {/* Inline Login Form - shown when existing user is detected */}
      {showLoginForm && (
        <div className='pt-4 border-t border-neutral-200 dark:border-neutral-700 space-y-4'>
          <div className='text-sm text-neutral-600 dark:text-neutral-400'>
            An account with this {matchedEmail ? 'email' : 'phone number'}{' '}
            already exists. Please sign in to continue.
          </div>

          <div className='space-y-3'>
            {(matchedEmail || email) && (
              <Input
                placeholder='Email'
                type='email'
                value={matchedEmail || email}
                disabled
              />
            )}
            {matchedPhone && !matchedEmail && (
              <CustomPhoneInput
                value={matchedPhone}
                onChange={() => {}}
                disabled
              />
            )}
            <Input
              placeholder='Password'
              type='password'
              value={loginPassword}
              onChange={e => {
                setLoginPassword(e.target.value);
                setLoginError(null);
              }}
              autoFocus
            />
            {loginError && (
              <div className='text-sm text-error-600'>{loginError}</div>
            )}
            <div className='flex gap-2'>
              <Button
                variant='outline'
                onClick={() => {
                  setShowLoginForm(false);
                  setMatchedEmail(null);
                  setMatchedPhone(null);
                  setLoginPassword('');
                  setLoginError(null);
                }}
                disabled={loginLoading}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!loginPassword) {
                    setLoginError('Please enter your password.');
                    return;
                  }

                  setLoginLoading(true);
                  setLoginError(null);

                  try {
                    const loginEmail = matchedEmail || email;
                    if (!loginEmail) {
                      setLoginError('Email is required for login.');
                      setLoginLoading(false);
                      return;
                    }

                    // Sign in with email and password
                    await authService.signIn(loginEmail, loginPassword);

                    // Wait for auth state to update
                    await new Promise(resolve => setTimeout(resolve, 100));

                    // Check session
                    const session = await supabase.auth.getSession();
                    if (
                      session.data.session?.user &&
                      !session.data.session.user.is_anonymous
                    ) {
                      // Successfully logged in - update user state
                      // The component will re-render and show LoggedInPartnerOrgSelector
                      setUser(session.data.session.user);
                      setIsAnonymous(false);
                      setShowLoginForm(false);
                      setLoginPassword('');
                      setLoginError(null);
                      // Don't proceed to next step - let the logged-in UI render instead
                    } else {
                      setLoginError(
                        'Login failed. Please check your password.'
                      );
                    }
                  } catch (err) {
                    const errorMsg =
                      err instanceof Error
                        ? err.message
                        : 'Login failed. Please try again.';
                    setLoginError(errorMsg);
                  } finally {
                    setLoginLoading(false);
                  }
                }}
                loading={loginLoading}
                className='flex-1'>
                Sign in
              </Button>
            </div>
          </div>
        </div>
      )}

      {!showLoginForm && (
        <div className='pt-2 flex justify-end'>
          <Button onClick={handleSubmit} loading={loading}>
            Continue
          </Button>
        </div>
      )}
    </div>
  );
};

export default StepDonor;
