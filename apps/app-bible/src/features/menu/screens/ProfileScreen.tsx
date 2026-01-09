import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useLocalization, useUserProfile } from '@/shared/hooks';
import type { RootStackNavigationProp } from '@/app/navigation/RootNavigator';
import { useAuthContext } from '@/features/auth/hooks/useAuthFromStore';
import { useOnboardingStore } from '@/features/onboarding/store/onboardingStore';
import { Button } from '@everylanguage/shared-native-ui';
import type {
  ProfileScreenProps,
  MenuStackNavigationProp,
} from '../navigation/MenuStackNavigator';
import { SignOutConfirmationModal } from '@/features/auth/components/SignOutConfirmationModal';

export const ProfileScreen: React.FC<ProfileScreenProps> = () => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const navigation = useNavigation<MenuStackNavigationProp>();
  const rootNavigation = useNavigation<RootStackNavigationProp>();
  const { user, signOut } = useAuthContext();
  const { setSignOutInitiated } = useOnboardingStore();
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  // Use the new profile system
  const { profile } = useUserProfile();

  const isAuthenticated =
    !!user && !(user as { is_anonymous?: boolean })?.is_anonymous;

  // Extract user data with fallbacks (keeping for backward compatibility)
  const userEmail =
    profile?.email || (user as { email?: string } | null)?.email;
  const userPhone =
    profile?.phone || (user as { phone?: string } | null)?.phone;
  const userFirstName =
    profile?.first_name ||
    (user as { user_metadata?: { first_name?: string } } | null)?.user_metadata
      ?.first_name;
  const userLastName =
    profile?.last_name ||
    (user as { user_metadata?: { last_name?: string } } | null)?.user_metadata
      ?.last_name;
  // const userId = profile?.id || (user as { id?: string } | null)?.id;

  // Generate initials for avatar
  const getInitials = () => {
    if (userFirstName && userLastName) {
      const initials =
        `${userFirstName.charAt(0)}${userLastName.charAt(0)}`.toUpperCase();
      return initials;
    }
    if (userFirstName) {
      const initial = userFirstName.charAt(0).toUpperCase();
      return initial;
    }
    if (userEmail) {
      const initial = userEmail.charAt(0).toUpperCase();
      return initial;
    }
    return 'U';
  };

  const handleSignOutPress = () => {
    setShowSignOutModal(true);
  };

  const handleSignOutConfirm = async () => {
    try {
      setShowSignOutModal(false);
      // Set flag immediately to show modal when onboarding loads
      setSignOutInitiated(true);
      await signOut();
      // After sign out, user will be redirected to onboarding automatically
      // No need to navigate to AuthModal since onboarding will handle it
    } catch {
      // Clear flag if sign out fails
      setSignOutInitiated(false);
    }
  };

  const handleSignOutCancel = () => {
    setShowSignOutModal(false);
  };

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Handle profile screen interaction
  const handleProfileInteraction = useCallback(() => {
    // Profile interaction handled
  }, []);

  // Handle edit profile
  const handleEditProfile = useCallback(() => {
    rootNavigation.navigate('EditProfileModal');
  }, [rootNavigation]);

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.colors.modalBackground },
      ]}
      onTouchStart={handleProfileInteraction}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons
              name='chevron-back'
              size={24}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            My Profile
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.getParent()?.goBack()}
          style={styles.closeButton}>
          <Ionicons name='close' size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.innerContent}>
        {/* Profile Hero Section */}
        <TouchableOpacity
          style={[
            styles.profileHero,
            { backgroundColor: theme.colors.surface },
          ]}
          onPress={handleProfileInteraction}
          activeOpacity={0.7}>
          {/* Avatar */}
          <View
            style={[
              styles.avatarContainer,
              { backgroundColor: theme.colors.primary },
            ]}>
            <Text
              style={[styles.avatarText, { color: theme.colors.textInverse }]}>
              {getInitials()}
            </Text>
          </View>

          {/* User Info */}
          <View style={styles.userInfoSection}>
            {isAuthenticated ? (
              <>
                {/* Name with Edit Button */}
                <View style={styles.nameContainer}>
                  <Text style={[styles.userName, { color: theme.colors.text }]}>
                    {(() => {
                      const displayName =
                        userFirstName && userLastName
                          ? `${userFirstName} ${userLastName}`
                          : userFirstName || 'User';

                      return displayName;
                    })()}
                  </Text>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={handleEditProfile}
                    accessibilityLabel='Edit profile'>
                    <Ionicons
                      name='pencil'
                      size={16}
                      color={theme.colors.primary}
                    />
                  </TouchableOpacity>
                </View>

                {/* Contact Info */}
                <View style={styles.contactInfo}>
                  {userEmail && (
                    <View style={styles.contactItem}>
                      <Ionicons
                        name='mail'
                        size={16}
                        color={theme.colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.contactText,
                          { color: theme.colors.textSecondary },
                        ]}>
                        {userEmail}
                      </Text>
                    </View>
                  )}
                  {userPhone && (
                    <View style={styles.contactItem}>
                      <Ionicons
                        name='call'
                        size={16}
                        color={theme.colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.contactText,
                          { color: theme.colors.textSecondary },
                        ]}>
                        {userPhone}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Status Badge */}
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: theme.colors.success },
                  ]}>
                  <Ionicons
                    name='checkmark-circle'
                    size={12}
                    color={theme.colors.textInverse}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: theme.colors.textInverse },
                    ]}>
                    Verified Account
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.userName, { color: theme.colors.text }]}>
                  {t('profile.guestUser')}
                </Text>
                <Text
                  style={[
                    styles.guestDescription,
                    { color: theme.colors.textSecondary },
                  ]}>
                  {t('profile.signInPrompt')}
                </Text>
              </>
            )}
          </View>
        </TouchableOpacity>

        {/* Sign In Button for Guest Users */}
        {!isAuthenticated && (
          <View style={styles.actionButtons}>
            <Button
              title={t('auth.signIn')}
              onPress={() => navigation.getParent()?.navigate('AuthModal')}
              variant='primary'
              icon='log-in'
              fullWidth
              style={styles.actionButton}
            />
          </View>
        )}

        {/* Account Information */}
        {isAuthenticated && (
          <View
            style={[
              styles.infoCard,
              { backgroundColor: theme.colors.surface },
            ]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              Account Information
            </Text>
            <View
              style={[
                styles.infoRow,
                { borderBottomColor: theme.colors.border },
              ]}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: theme.colors.textSecondary },
                ]}>
                Email
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {userEmail || 'None'}
              </Text>
            </View>
            <View
              style={[
                styles.infoRow,
                { borderBottomColor: theme.colors.border },
              ]}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: theme.colors.textSecondary },
                ]}>
                Phone
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {userPhone || 'None'}
              </Text>
            </View>
            <View
              style={[
                styles.infoRow,
                { borderBottomColor: theme.colors.border },
              ]}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: theme.colors.textSecondary },
                ]}>
                Account Type
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                Standard
              </Text>
            </View>
            <View
              style={[
                styles.infoRow,
                { borderBottomColor: theme.colors.border },
              ]}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: theme.colors.textSecondary },
                ]}>
                Last Sync
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                Just now
              </Text>
            </View>
          </View>
        )}

        {/* Sign Out Button */}
        {isAuthenticated && (
          <View style={styles.signOutSection}>
            <Button
              title={t('auth.signOut')}
              onPress={handleSignOutPress}
              variant='outline'
              icon='log-out-outline'
              fullWidth
              style={{
                ...styles.signOutButton,
                borderColor: theme.colors.error,
              }}
              textStyle={{ color: theme.colors.error }}
            />
          </View>
        )}
      </ScrollView>

      <SignOutConfirmationModal
        visible={showSignOutModal}
        onConfirm={handleSignOutConfirm}
        onCancel={handleSignOutCancel}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  closeButton: { padding: 8 },
  backButton: { padding: 8, marginLeft: -8 },
  innerContent: { paddingBottom: 24, padding: 16 },

  // Profile Hero Section
  profileHero: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '600',
  },
  userInfoSection: {
    alignItems: 'center',
    width: '100%',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  editButton: {
    marginLeft: 8,
    padding: 4,
    borderRadius: 4,
  },
  contactInfo: {
    width: '100%',
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'center',
  },
  contactText: {
    fontSize: 14,
    marginLeft: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  guestDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Action Buttons
  actionButtons: {
    marginBottom: 24,
    gap: 12,
  },
  actionButton: {
    marginBottom: 0,
  },

  // Account Information Card
  infoCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '400',
  },

  // Sign Out Section
  signOutSection: {
    marginTop: 8,
  },
  signOutButton: {
    borderWidth: 1,
  },
});
