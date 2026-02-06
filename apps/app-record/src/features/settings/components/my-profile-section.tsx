import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useTheme, useTranslation } from '@/shared/hooks';

/**
 * My Profile Section
 *
 * Shows login form if not logged in, or user info if logged in.
 * Follows iOS settings menu styling.
 */
export const MyProfileSection: React.FC = () => {
  const { user, signIn, signOut, isLoading } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async (): Promise<void> => {
    if (!email || !password) {
      Alert.alert(t('common.error'), t('auth.emailPasswordRequired'));
      return;
    }

    try {
      await signIn(email, password);
      Alert.alert(t('common.success'), t('auth.signInSuccess'));
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
    } catch (error) {
      Alert.alert(
        t('auth.signOutFailed'),
        error instanceof Error ? error.message : t('auth.errorOccurred')
      );
    }
  };

  if (user) {
    return (
      <ScrollView style={styles.container}>
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
              {user.email}
            </Text>
          </View>
          {user.id && (
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
            style={[styles.button, { backgroundColor: theme.colors.error }]}
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
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}>
      <View style={styles.iconContainer}>
        <Ionicons
          name='person-circle-outline'
          size={80}
          color={theme.colors.textSecondary}
        />
      </View>

      <View style={styles.form}>
        <TextInput
          style={[styles.input, { color: theme.colors.text }]}
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
          style={[styles.input, { color: theme.colors.text }]}
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

const styles = StyleSheet.create({
  container: {
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
  },
  section: {
    paddingTop: 16,
    borderRadius: 12,
    marginHorizontal: 16,
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
  button: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonFullWidth: {
    width: '100%',
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
