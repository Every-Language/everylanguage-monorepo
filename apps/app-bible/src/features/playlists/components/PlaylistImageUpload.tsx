import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme, useLocalization } from '@/shared/hooks';
import { PlaylistImageService } from '../services/PlaylistImageService';
import { useToastStore } from '@/shared/store';
import { logger } from '@/shared/utils/logger';
import { imageDownloadManager } from '@/features/downloads/services';
import type { Theme } from '@everylanguage/shared-native-ui';

interface PlaylistImageUploadProps {
  playlistId: string;
  currentImageId: string | null;
  onImageUploaded?: (imageId: string) => void;
  onImageRemoved?: () => void;
}

/**
 * Component for uploading, displaying, and managing playlist images
 */
export const PlaylistImageUpload: React.FC<PlaylistImageUploadProps> = ({
  playlistId,
  currentImageId,
  onImageUploaded,
  onImageRemoved,
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { showToast } = useToastStore();

  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [displayImageUri, setDisplayImageUri] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);

  const styles = createStyles(theme);

  // Fetch and display current image when currentImageId changes
  useEffect(() => {
    if (!currentImageId) {
      setDisplayImageUri(null);
      setLoading(false);
      setImageLoadError(false);
      return;
    }
    setLoading(true);
    let isMounted = true;
    setImageLoadError(false);
    (async () => {
      try {
        const uri = await imageDownloadManager.resolveImageUrl(currentImageId);
        logger.info(true, '[PlaylistImageUpload] Resolved image URL:', {
          imageId: currentImageId,
          uri: uri ? `${uri.substring(0, 50)}...` : null,
        });
        setLoading(false);
        if (isMounted && uri) {
          setDisplayImageUri(uri);
        } else if (isMounted) {
          logger.warn(
            true,
            '[PlaylistImageUpload] No image URL returned for imageId:',
            currentImageId
          );
          setLoading(false);
          setDisplayImageUri(null);
        }
      } catch (error) {
        logger.error(
          true,
          '[PlaylistImageUpload] Error fetching image URL:',
          error
        );
        setLoading(false);
        if (isMounted) {
          setDisplayImageUri(null);
          setImageLoadError(true);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [currentImageId]);

  const handlePickImage = async (): Promise<void> => {
    try {
      // Request permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.permissionRequired'),
          t(
            'playlists.imagePermissionMessage',
            'We need permission to access your photos to upload playlist images.'
          )
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for playlist images
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setSelectedImageUri(imageUri);
        // Upload immediately after picking image
        await handleUpload(imageUri);
      }
    } catch (error) {
      logger.error(true, '[PlaylistImageUpload] Error picking image:', error);
      showToast(t('errors.generic', 'Something went wrong'), 'error');
    }
  };

  const handleUpload = async (imageUri?: string): Promise<void> => {
    const uriToUpload = imageUri || selectedImageUri;
    if (!uriToUpload) return;

    setUploading(true);

    try {
      const imageId = await PlaylistImageService.uploadPlaylistImage(
        playlistId,
        uriToUpload
      );

      // Fetch and display the uploaded image
      try {
        const uploadedImageUri =
          await imageDownloadManager.resolveImageUrl(imageId);
        setDisplayImageUri(uploadedImageUri);
      } catch (error) {
        logger.error(
          true,
          '[PlaylistImageUpload] Error fetching uploaded image URL:',
          error
        );
      }

      setSelectedImageUri(null);
      showToast(t('playlists.imageUploaded'), 'success');
      onImageUploaded?.(imageId);
    } catch (error) {
      logger.error(true, '[PlaylistImageUpload] Error uploading image:', error);
      const message =
        error instanceof Error
          ? error.message
          : t('errors.generic', 'Something went wrong');
      showToast(message, 'error');
      // Reset selection on error
      setSelectedImageUri(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (): Promise<void> => {
    Alert.alert(
      t('common.confirm', 'Confirm'),
      t(
        'playlists.removeImageConfirm',
        'Are you sure you want to remove this image?'
      ),
      [
        {
          text: t('common.cancel', 'Cancel'),
          style: 'cancel',
        },
        {
          text: t('common.remove', 'Remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await PlaylistImageService.removePlaylistImage(playlistId);
              // Clear the display image immediately
              setDisplayImageUri(null);
              setSelectedImageUri(null);
              showToast(t('playlists.imageRemoved'), 'success');
              onImageRemoved?.();
            } catch (error) {
              logger.error(
                true,
                '[PlaylistImageUpload] Error removing image:',
                error
              );
              const message =
                error instanceof Error
                  ? error.message
                  : t('errors.generic', 'Something went wrong');
              showToast(message, 'error');
            }
          },
        },
      ]
    );
  };

  // Show remove button only when an image is actually displayed (not just selected)
  const showRemoveButton = displayImageUri && !selectedImageUri && !uploading;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.colors.text }]}>
        {t('playlists.playlistImage')} ({t('common.optional', 'Optional')})
      </Text>

      <TouchableOpacity
        style={styles.imageContainer}
        onPress={handlePickImage}
        disabled={uploading || loading}>
        {loading ? (
          // Show loading state
          <View style={styles.imagePlaceholder}>
            <ActivityIndicator size='large' color={theme.colors.primary} />
          </View>
        ) : selectedImageUri || (displayImageUri && !imageLoadError) ? (
          // Show selected/uploaded image
          <View style={styles.imagePreview}>
            <Image
              source={{ uri: selectedImageUri || displayImageUri || '' }}
              style={styles.image}
              resizeMode='cover'
              onLoad={() => {
                logger.info(
                  true,
                  '[PlaylistImageUpload] Image loaded successfully'
                );
                setImageLoadError(false);
              }}
              onError={error => {
                logger.error(
                  true,
                  '[PlaylistImageUpload] Image failed to load:',
                  { uri: selectedImageUri || displayImageUri, error }
                );
                setImageLoadError(true);
                if (selectedImageUri) {
                  setSelectedImageUri(null);
                }
                if (displayImageUri) {
                  setDisplayImageUri(null);
                }
              }}
            />
            {uploading && (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator
                  size='large'
                  color={theme.colors.textInverse}
                />
              </View>
            )}
          </View>
        ) : (
          // Show empty state (clickable)
          <View style={styles.imagePlaceholder}>
            <MaterialIcons
              name='add-photo-alternate'
              size={48}
              color={theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.placeholderText,
                { color: theme.colors.textSecondary },
              ]}>
              {t('playlists.noImage')}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {showRemoveButton && (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.removeButton]}
            onPress={handleRemove}
            disabled={uploading}>
            <MaterialIcons name='delete' size={20} color={theme.colors.error} />
            <Text
              style={[
                styles.buttonText,
                { color: theme.colors.error, marginLeft: 8 },
              ]}>
              {t('common.remove', 'Remove')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  /* eslint-disable */
  StyleSheet.create({
    container: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
    },
    imageContainer: {
      marginBottom: 12,
    },
    imagePreview: {
      width: '100%',
      height: 180,
      borderRadius: 12,
      overflow: 'hidden',
      position: 'relative',
    },
    image: {
      width: '100%',
      height: '100%',
      borderRadius: 12,
    },
    uploadOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    imagePlaceholder: {
      width: '100%',
      height: 180,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderText: {
      marginTop: 8,
      fontSize: 14,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    removeButton: {
      borderWidth: 1,
      borderColor: theme.colors.error,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
  });
