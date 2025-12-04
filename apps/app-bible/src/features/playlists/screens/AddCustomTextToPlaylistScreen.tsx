import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useLocalization } from '@/shared/hooks';
import { usePlaylistMutations } from '../hooks/usePlaylistMutations';
import { useToastStore } from '@/shared/store/toastStore';
import type { RootStackNavigationProp } from '@/app/navigation/RootNavigator';

interface AddCustomTextToPlaylistScreenProps {
  route: {
    params: {
      playlistId: string;
      playlistTitle: string;
    };
  };
}

export const AddCustomTextToPlaylistScreen: React.FC<
  AddCustomTextToPlaylistScreenProps
> = ({ route }) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const navigation = useNavigation<RootStackNavigationProp>();
  const insets = useSafeAreaInsets();
  const { addCustomTextToPlaylist } = usePlaylistMutations();
  const { showToast } = useToastStore();

  const { playlistId, playlistTitle } = route.params;
  const [customText, setCustomText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    navigation.goBack();
  };

  const handleSave = async () => {
    if (!customText.trim()) {
      Alert.alert(
        t('common.error', 'Error'),
        t('playlists.customTextEmpty', 'Please enter some text')
      );
      return;
    }

    setLoading(true);
    try {
      await addCustomTextToPlaylist.mutateAsync({
        playlistId,
        customText: customText.trim(),
      });
      showToast(
        t(
          'playlists.customTextAdded',
          'Custom text added to {{playlistTitle}}',
          {
            playlistTitle,
          }
        ),
        'success'
      );
      navigation.goBack();
    } catch {
      Alert.alert(
        t('common.error', 'Error'),
        t(
          'playlists.failedToAddCustomText',
          'Failed to add custom text to playlist'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.modalBackground,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name='close' size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t('playlists.addCustomText', 'Add Custom Text')}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[
            styles.saveButton,
            {
              backgroundColor: loading
                ? theme.colors.border
                : theme.colors.primary,
            },
          ]}
          disabled={loading || !customText.trim()}>
          <Text
            style={[styles.saveButtonText, { color: theme.colors.background }]}>
            {loading
              ? t('common.saving', 'Saving...')
              : t('common.save', 'Save')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {playlistTitle}
        </Text>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            {t('playlists.addCustomText', 'Custom Text')}
          </Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              },
            ]}
            value={customText}
            onChangeText={setCustomText}
            placeholder={t(
              'playlists.customTextPlaceholder',
              'Enter your custom text here...'
            )}
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={6}
            textAlignVertical='top'
            autoFocus
          />
        </View>

        <Text style={[styles.helpText, { color: theme.colors.textSecondary }]}>
          {t(
            'playlists.customTextInstructions',
            'This text will be added as a custom item to your playlist.'
          )}
        </Text>
      </ScrollView>
    </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
  },
  helpText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
