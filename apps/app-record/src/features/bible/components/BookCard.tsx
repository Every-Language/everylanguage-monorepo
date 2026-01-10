import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useTheme } from '@/shared/hooks';
import type { BookWithMetadata } from '../types';
import { useEffect, useState } from 'react';
import { InteractionManager, Platform } from 'react-native';
import { imageDownloadManager } from '@/features/downloads/services';
// import { logger } from '@/shared/utils/logger';
import { getBookImageByNumber } from '../assets/bookArtRegistry';

type BookCardProps = {
  book: BookWithMetadata;
  onPress: () => void;
  showMetadata?: boolean; // Show chapter counts and media availability
};

/**
 * BookCard component using PowerSync BookWithMetadata
 */
const BookCardBase: React.FC<BookCardProps> = ({
  book,
  onPress,
  showMetadata: _showMetadata = false,
}) => {
  const { theme } = useTheme();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const BundledImage = getBookImageByNumber(book.book_number);
  const [deferRender, setDeferRender] = useState(true);

  useEffect(() => {
    // Defer heavy SVG mount to keep scroll smooth
    const task = InteractionManager.runAfterInteractions(() =>
      setDeferRender(false)
    );
    return () => task.cancel();
  }, []);

  useEffect(() => {
    // Offline-first: if we have a bundled SVG, do not resolve any remote image.
    if (BundledImage) {
      setImageUri(null);
      return;
    }
    let isMounted = true;
    (async () => {
      try {
        const res = await import('@/shared/services/powersync/PowerSyncSystem');
        const ps = res.powerSyncSystem;
        const rows = (await ps.getAll(
          `SELECT id FROM images
           WHERE target_type = 'book' AND target_id = ?
             AND object_key IS NOT NULL AND object_key <> ''
             AND deleted_at IS NULL
           ORDER BY created_at ASC NULLS LAST, id ASC
           LIMIT 1`,
          [book.id]
        )) as Array<{ id: string }>;
        const imgId = rows?.[0]?.id;
        if (imgId) {
          const uri = await imageDownloadManager.resolveImageUrl(imgId);
          if (isMounted) setImageUri(uri);
        } else if (isMounted) {
          setImageUri(null);
        }
      } catch {
        if (isMounted) setImageUri(null);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [book.id, BundledImage]);

  // Create theme-aware styles
  const styles = StyleSheet.create({
    container: {
      borderRadius: 12,
      backgroundColor: theme.colors.surface || theme.colors.background,
      // Avoid shadows/elevations for better scroll perf on Android
      ...(Platform.OS === 'ios'
        ? {
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
          }
        : { elevation: 0 as const }),
      shadowColor: theme.colors.shadow,
      overflow: 'hidden',
    },
    image: {
      width: '100%',
      aspectRatio: 1.4, // rectangle
      backgroundColor: theme.colors.surface,
      padding: 12,
    },
    imageInner: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageContentTinted: {
      width: '100%',
      height: '100%',
      tintColor: theme.colors.primary,
    },
    footer: {
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    bookNumber: {
      minWidth: 28,
      height: 28,
      paddingHorizontal: 6,
      borderRadius: 6,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    bookNumberText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textInverse,
    },
    bookName: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
  });

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.image}>
        <View style={styles.imageInner}>
          {deferRender ? null : imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.imageContentTinted}
              resizeMode='contain'
            />
          ) : BundledImage && !deferRender ? (
            <Image
              source={BundledImage}
              style={styles.imageContentTinted}
              resizeMode='contain'
            />
          ) : null}
        </View>
      </View>
      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <View style={styles.bookNumber}>
            <Text style={styles.bookNumberText}>{book.book_number}</Text>
          </View>
          <Text style={styles.bookName} numberOfLines={1}>
            {book.name}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const BookCard = React.memo(BookCardBase, (prev, next) => {
  return (
    prev.book.id === next.book.id &&
    prev.book.book_number === next.book.book_number &&
    prev.onPress === next.onPress
  );
});
// Styles moved inside component for theme access
