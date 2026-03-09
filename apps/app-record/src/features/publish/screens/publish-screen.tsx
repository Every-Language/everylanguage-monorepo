import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { AppHeader } from '@/shared/ui';
import { useTheme, useAuth, useTranslation } from '@/shared/hooks';
import { ProfileModal } from '@/features/auth/components';

/**
 * Publish Screen
 *
 * Screen for publishing Bible audio projects.
 * Shows login prompt when user is not authenticated.
 * Shows publish interface when user is logged in.
 */
export const PublishScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);

  const handleOpenLoginModal = (): void => {
    setIsProfileModalVisible(true);
  };

  const handleCloseProfileModal = (): void => {
    setIsProfileModalVisible(false);
  };

  const renderNotLoggedIn = (): React.ReactNode => {
    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        <View style={styles.emptyContainer}>
          <Text style={[styles.message, { color: theme.colors.text }]}>
            {t('publish.signInRequired')}
          </Text>
          <TouchableOpacity
            style={[
              styles.loginButton,
              {
                backgroundColor: theme.colors.primary,
              },
            ]}
            onPress={handleOpenLoginModal}>
            <Text
              style={[
                styles.loginButtonText,
                { color: theme.colors.textInverse },
              ]}>
              {t('auth.signIn')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderLoggedIn = (): React.ReactNode => {
    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        <View style={styles.emptyContainer}>
          <Text style={[styles.placeholder, { color: theme.colors.text }]}>
            {t('publish.placeholder')}
          </Text>
          <Text
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {t('publish.subtitle')}
          </Text>
        </View>
      </ScrollView>
    );
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title={t('publish.title')} />
      {user ? renderLoggedIn() : renderNotLoggedIn()}
      <ProfileModal
        visible={isProfileModalVisible}
        onClose={handleCloseProfileModal}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  message: {
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  loginButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 200,
  },
  loginButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  placeholder: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
});
