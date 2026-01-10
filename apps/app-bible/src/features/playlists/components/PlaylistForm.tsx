import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme, useLocalization } from '@/shared/hooks';

const schema = z.object({
  title: z
    .string()
    .min(1, 'playlists.errors.titleRequired')
    .max(50, 'playlists.errors.titleMax'),
  description: z
    .string()
    .max(200, 'playlists.errors.descriptionMax')
    .optional(),
});

export type PlaylistFormValues = z.infer<typeof schema>;

interface PlaylistFormProps {
  initialValues?: PlaylistFormValues;
  onSubmit: (values: PlaylistFormValues) => void | Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  imageUploadComponent?: React.ReactNode;
}

// schema moved above to align inferred types with form values

export const PlaylistForm: React.FC<PlaylistFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel,
  isSubmitting,
  imageUploadComponent,
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<PlaylistFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initialValues?.title ?? '',
      description: initialValues?.description ?? '',
    },
    mode: 'onChange',
  });

  const watchedTitle = watch('title');

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.form}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t('playlists.createOrEditTitle', 'Playlist')}
        </Text>

        {/* <View
          style={[styles.notice, { backgroundColor: theme.colors.surface }]}>
          <Ionicons
            name='information-circle'
            size={20}
            color={theme.colors.primary}
          />
          <Text
            style={[styles.noticeText, { color: theme.colors.textSecondary }]}>
            {t(
              'playlists.singleVersionNote',
              'Note: All chapters in a playlist must use the same audio version. You cannot mix different audio versions in one playlist.'
            )}
          </Text>
        </View> */}

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            {t('playlists.playlistName', 'Playlist Name')} *
          </Text>
          <Controller
            control={control}
            name='title'
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.text,
                    borderColor: errors.title
                      ? theme.colors.error
                      : theme.colors.border,
                  },
                ]}
                placeholder={t(
                  'playlists.titlePlaceholder',
                  'Enter playlist title'
                )}
                placeholderTextColor={theme.colors.textSecondary}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                maxLength={50}
              />
            )}
          />
          {errors.title && (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {t(
                errors.title.message ?? 'playlists.errors.titleRequired',
                'Playlist title is required'
              )}
            </Text>
          )}
          <Text
            style={[
              styles.characterCount,
              { color: theme.colors.textSecondary },
            ]}>
            {watchedTitle?.length || 0}/50
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            {t('playlists.description', 'Description')} (
            {t('common.optional', 'Optional')})
          </Text>
          <Controller
            control={control}
            name='description'
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.text,
                    borderColor: errors.description
                      ? theme.colors.error
                      : theme.colors.border,
                  },
                ]}
                placeholder={t(
                  'playlists.descriptionPlaceholder',
                  'Add a description or note about this playlist'
                )}
                placeholderTextColor={theme.colors.textSecondary}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            )}
          />
          {errors.description && (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {t(
                errors.description.message ?? 'playlists.errors.descriptionMax',
                'Comment must be less than 200 characters'
              )}
            </Text>
          )}
          <Text
            style={[
              styles.characterCount,
              { color: theme.colors.textSecondary },
            ]}>
            {watch('description')?.length || 0}/200
          </Text>
        </View>

        {imageUploadComponent && (
          <View style={styles.imageUploadSection}>{imageUploadComponent}</View>
        )}

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
              styles.cancelButton,
            ]}
            onPress={onCancel}>
            <Text style={[styles.buttonText, { color: theme.colors.text }]}>
              {t('common.cancel', 'Cancel')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor:
                  isValid && !isSubmitting
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
              },
            ]}
            onPress={handleSubmit(values => onSubmit(values))}
            disabled={!isValid || isSubmitting}>
            <Text
              style={[styles.buttonText, { color: theme.colors.textInverse }]}>
              {submitLabel ?? t('common.save', 'Save')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  form: { flex: 1 },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 16,
  },
  imageUploadSection: {
    marginBottom: 20,
  },
  //   notice: {
  //     padding: 12,
  //     borderRadius: 8,
  //     marginBottom: 20,
  //     flexDirection: 'row',
  //     gap: 8,
  //     alignItems: 'flex-start',
  //   },
  //   noticeText: { fontSize: 14, lineHeight: 20, flex: 1 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  errorText: { fontSize: 14, marginTop: 4 },
  characterCount: { fontSize: 12, textAlign: 'right', marginTop: 4 },
  buttonGroup: { flexDirection: 'row', gap: 12, marginTop: 24 },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: { borderWidth: 1 },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
