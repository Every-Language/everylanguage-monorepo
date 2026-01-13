import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useTheme, useTranslation } from '@/shared/hooks';

export interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Profile Modal
 *
 * Reusable modal component that shows:
 * - Login form when user is logged out
 * - User info and sign out when user is logged in
 *
 * Follows iOS design patterns with proper safe area handling.
 */
export const ProfileModal: React.FC<ProfileModalProps> = ({
  visible,
  onClose,
}) => {
  const { user, signIn, signOut, isLoading } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      setEmail('');
      setPassword('');
    }
  }, [visible]);

  const handleSignIn = async (): Promise<void> => {
    if (!email || !password) {
      Alert.alert(t('common.error'), t('auth.emailPasswordRequired'));
      return;
    }

    try {
      await signIn(email, password);
      Alert.alert(t('common.success'), t('auth.signInSuccess'));
      // Don't close modal automatically - let user see their profile
    } catch (error) {
      Alert.alert(
        t('auth.signInFailed'),
        error instanceof Error ? error.message : t('auth.errorOccurred')
      );
    }
  };

  const handleSignOut = async (): Promise<void> => {
    try {
      await signOut();
      Alert.alert(t('common.success'), t('auth.signOutSuccess'));
      // Don't close modal automatically - let user see login form
    } catch (error) {
      Alert.alert(
        t('auth.signOutFailed'),
        error instanceof Error ? error.message : t('auth.errorOccurred')
      );
    }
  };

  const renderLoginForm = (): React.ReactNode => {
    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps='handled'>
        <View style={styles.iconContainer}>
          <Ionicons
            name='person-circle-outline'
            size={80}
            color={theme.colors.textSecondary}
          />
        </View>

        <View style={styles.form}>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.colors.text,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              },
            ]}
            placeholder={t('auth.email')}
            placeholderTextColor={theme.colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize='none'
            keyboardType='email-address'
            autoComplete='email'
            editable={!isLoading}
          />
          <TextInput
            style={[
              styles.input,
              {
                color: theme.colors.text,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              },
            ]}
            placeholder={t('auth.password')}
            placeholderTextColor={theme.colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize='none'
            autoComplete='password'
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[
              styles.button,
              styles.buttonFullWidth,
              {
                backgroundColor: theme.colors.primary,
              },
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleSignIn}
            disabled={isLoading}>
            <Text
              style={[styles.buttonText, { color: theme.colors.textInverse }]}>
              {isLoading ? t('auth.signingIn') : t('auth.signIn')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderUserInfo = (): React.ReactNode => {
    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.colors.surface,
            },
          ]}>
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.colors.textSecondary },
            ]}>
            {t('auth.account')}
          </Text>
          <View
            style={[
              styles.infoRow,
              { borderBottomColor: theme.colors.border },
            ]}>
            <Text style={[styles.infoLabel, { color: theme.colors.text }]}>
              {t('auth.email')}
            </Text>
            <Text
              style={[styles.infoValue, { color: theme.colors.textSecondary }]}>
              {user?.email}
            </Text>
          </View>
          {user?.id && (
            <View
              style={[
                styles.infoRow,
                { borderBottomColor: theme.colors.border },
              ]}>
              <Text style={[styles.infoLabel, { color: theme.colors.text }]}>
                {t('auth.userId')}
              </Text>
              <Text
                style={[
                  styles.infoValue,
                  { color: theme.colors.textSecondary },
                ]}
                numberOfLines={1}>
                {user.id}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: theme.colors.error,
              },
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleSignOut}
            disabled={isLoading}>
            <Text
              style={[styles.buttonText, { color: theme.colors.textInverse }]}>
              {isLoading ? t('auth.signingOut') : t('auth.signOut')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={onClose}>
      <SafeAreaView
        {...(Platform.OS === 'ios'
          ? { edges: ['bottom', 'left', 'right'] as const }
          : {})}
        style={[
          styles.container,
          { backgroundColor: theme.colors.background },
        ]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: theme.colors.border,
              backgroundColor: theme.colors.background,
            },
          ]}>
          <TouchableOpacity
            style={[
              styles.closeButton,
              { backgroundColor: theme.colors.error },
            ]}
            onPress={onClose}
            accessibilityLabel={t('common.close')}>
            <Ionicons name='close' size={20} color={theme.colors.textInverse} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {user ? t('auth.myProfile') : t('auth.signIn')}
          </Text>
          <View style={styles.headerRight} />
        </View>

        {/* Content */}
        {user ? renderUserInfo() : renderLoginForm()}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 28,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 32,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  input: {
    fontSize: 17,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonFullWidth: {
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  section: {
    paddingTop: 16,
    borderRadius: 12,
    marginHorizontal: 0,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: {
    fontSize: 17,
  },
  infoValue: {
    fontSize: 17,
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
});
