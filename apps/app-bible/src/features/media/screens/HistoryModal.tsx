import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  InteractionManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { RootStackNavigationProp } from '@/app/navigation/RootNavigator';
import { useTheme } from '@/shared/hooks';
import { ModalHeader } from '@everylanguage/shared-native-ui';
import { useLocalization } from '@/shared/hooks';
import {
  historyManager,
  type HistoryItem,
} from '@/features/media/services/HistoryManager';
// Use MediaPlayerService directly for chapter playback
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { playChapterWithAutoOpen } from '@/features/media/utils/autoOpenHelper';

export const HistoryModal: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useLocalization();
  // Use enhanced playChapter with auto-open logic
  const playChapter = async (chapterId: string) => {
    await playChapterWithAutoOpen(chapterId, {}, 'HistoryModal');
  };
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const watchStopRef = useRef<() => void>(() => {});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await historyManager.getHistory(200);
      setItems(list);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleClose = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.getParent()?.goBack();
    }
  }, [navigation]);

  useEffect(() => {
    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(async () => {
      if (cancelled) return;

      await load();

      // Reactive updates: watch play_history for changes
      try {
        if (powerSyncSystem.isInitialized) {
          const stream = await powerSyncSystem.watch(
            `SELECT id FROM play_history ORDER BY started_at DESC LIMIT 1`
          );

          let mounted = true;
          (async () => {
            for await (const _ of stream as AsyncIterable<unknown>) {
              void _; // noop
              if (!mounted) break;
              try {
                const list = await historyManager.getHistory(200);
                // Only update when the sequence of ids actually changes to avoid scroll jumps
                setItems(prev => {
                  if (prev.length !== list.length) return list;
                  for (let i = 0; i < list.length; i++) {
                    if (prev[i]?.id !== list[i]?.id) return list;
                  }
                  return prev; // no change
                });
              } catch {
                // ignore transient errors
              }
            }
          })();

          watchStopRef.current = () => {
            mounted = false;
          };
        }
      } catch {
        // ignore
      }
    });

    return () => {
      cancelled = true;
      task.cancel?.();
      watchStopRef.current?.();
    };
  }, [load]);

  const renderItem = ({ item }: { item: HistoryItem }) => (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: theme.colors.surface }]}
      onPress={() => playChapter(item.chapterId)}>
      <View style={styles.flex}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {item.title}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {item.subtitle}
        </Text>
      </View>
      <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
        {new Date(item.startedAt).toLocaleString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.modalBackground },
      ]}>
      <ModalHeader title={t('nav.history')} showClose onClose={handleClose} />

      <FlatList
        style={styles.list}
        data={items}
        keyExtractor={(i: HistoryItem, idx: number) => `${i.id}_${idx}`}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
        keyboardShouldPersistTaps='handled'
        contentInsetAdjustmentBehavior='automatic'
        initialNumToRender={20}
        windowSize={5}
        maxToRenderPerBatch={20}
        showsVerticalScrollIndicator={true}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        onRefresh={load}
        refreshing={loading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 12,
  },
  flex: { flex: 1 },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
    paddingTop: 8,
  },
  title: { fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 12, marginTop: 2 },
  meta: { fontSize: 10, marginLeft: 12 },
});
