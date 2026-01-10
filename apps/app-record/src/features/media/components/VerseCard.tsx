import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { useTheme } from '@/shared/hooks';

export interface VerseCardProps {
  id: string;
  number: number;
  text?: string | undefined;
  active: boolean;
  onPress: () => void;
  style?: ViewStyle;
  // Used to remount inner content when chapter changes for crossfade
  chapterId?: string;
}

export const VerseCard: React.FC<VerseCardProps> = React.memo(
  function VerseCard({
    number,
    text,
    active,
    onPress,
    style,
    chapterId,
  }: VerseCardProps) {
    const { theme } = useTheme();

    // Smooth highlight animation (opacity over a 1px border overlay)
    const highlight = useSharedValue(active ? 2 : 0);
    React.useEffect(() => {
      highlight.value = withTiming(active ? 2 : 0, { duration: 300 });
    }, [active, highlight]);

    const highlightStyle = useAnimatedStyle(() => ({
      opacity: highlight.value,
    }));

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={[styles.card, { backgroundColor: theme.colors.surface }, style]}>
        {/* Inner content crossfades on chapter change while row stays mounted */}
        <Animated.View
          key={chapterId}
          {...(Platform.OS === 'ios'
            ? { entering: FadeIn.duration(120), exiting: FadeOut.duration(120) }
            : {})}>
          <Text
            style={[styles.verseNumberInline, { color: theme.colors.primary }]}>
            {`${number} `}
          </Text>
          <Text
            style={[styles.cardText, { color: theme.colors.textSecondary }]}
            numberOfLines={4}>
            {text || 'Verse text not available'}
          </Text>
        </Animated.View>
        {/* Animated highlight overlay for active verse */}
        <Animated.View
          pointerEvents='none'
          style={[
            styles.highlightOverlay,
            { borderColor: theme.colors.primary },
            highlightStyle,
          ]}
        />
      </TouchableOpacity>
    );
  }
);

VerseCard.displayName = 'VerseCard';

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 0,
    marginVertical: 6,
    position: 'relative',
  },
  cardText: {
    fontSize: 13,
    marginTop: 4,
  },
  verseNumberInline: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  highlightOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 1,
    borderRadius: 12,
  },
});
