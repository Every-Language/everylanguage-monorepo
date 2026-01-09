import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTheme } from '@/shared/hooks';
import { useUserProfile } from '@/shared/hooks';
import type { RootStackNavigationProp } from '@/app/navigation/RootNavigator';
import { Button } from '@everylanguage/shared-native-ui';
import { ControlledTextInput } from '@/features/auth/components/ControlledTextInput';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = false;

// Validation schema
const editProfileSchema = z.object({
  firstName: z
    .string()
    .min(3, 'First name must be at least 3 characters')
    .max(50, 'First name must be less than 50 characters'),
  lastName: z
    .string()
    .min(3, 'Last name must be at least 3 characters')
    .max(50, 'Last name must be less than 50 characters'),
});

type EditProfileFormData = z.infer<typeof editProfileSchema>;

export const EditProfileModal: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { theme } = useTheme();
  const { profile, updateProfile } = useUserProfile();

  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    mode: 'onSubmit',
    defaultValues: {
      firstName: profile?.first_name ?? '',
      lastName: profile?.last_name ?? '',
    },
  });

  const handleClose = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.getParent()?.goBack();
    }
  }, [navigation]);

  const onSubmit = useCallback(
    async (data: EditProfileFormData) => {
      if (!profile) return;

      setIsUpdating(true);
      setUpdateError(null);

      try {
        logger.info(
          ENABLE_LOGGING,
          'EditProfileModal: Updating profile with data:',
          data
        );

        const success = await updateProfile({
          first_name: data.firstName,
          last_name: data.lastName,
        });

        if (success) {
          logger.info(
            ENABLE_LOGGING,
            'EditProfileModal: Profile updated successfully'
          );
          handleClose();
        } else {
          throw new Error('Failed to update profile');
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to update profile';
        logger.error(
          ENABLE_LOGGING,
          'EditProfileModal: Profile update failed:',
          error
        );
        setUpdateError(errorMessage);
      } finally {
        setIsUpdating(false);
      }
    },
    [profile, updateProfile, handleClose]
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.modalBackground,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    content: {
      flex: 1,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.modalBackground,
    },
    form: {
      gap: theme.spacing.lg,
    },
    errorContainer: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.error,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.md,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: theme.typography.fontSize.sm,
      textAlign: 'center',
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
    },
    buttonContainer: {
      alignItems: 'center',
      marginTop: theme.spacing.xl,
    },
    updateButton: {
      minWidth: 200,
    },
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: theme.colors.modalBackground },
        ]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Update Profile
        </Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {updateError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{updateError}</Text>
            </View>
          )}

          <ControlledTextInput
            name='firstName'
            control={control}
            label='First Name'
            placeholder='Enter your first name'
            autoCapitalize='words'
            autoCorrect={false}
            maxLength={50}
          />

          <ControlledTextInput
            name='lastName'
            control={control}
            label='Last Name'
            placeholder='Enter your last name'
            autoCapitalize='words'
            autoCorrect={false}
            maxLength={50}
          />
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            title={isUpdating ? 'Updating...' : 'Update Profile'}
            variant='primary'
            onPress={handleSubmit(onSubmit)}
            disabled={isUpdating}
            loading={isUpdating}
            style={styles.updateButton}
          />
        </View>
      </ScrollView>
    </View>
  );
};
