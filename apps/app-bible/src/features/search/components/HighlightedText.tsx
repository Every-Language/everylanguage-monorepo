import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/hooks';

interface HighlightedTextProps {
  text: string;
  style?: object;
  numberOfLines?: number;
}

/**
 * Component to render text with HTML-like highlighting
 * Converts <mark> tags to highlighted text
 */
export const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  style,
  numberOfLines,
}) => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    highlight: {
      backgroundColor: theme.colors.primary + '30',
      color: theme.colors.primary,
      fontWeight: '600',
    },
  });

  // Parse the text and split by <mark> tags
  const parseHighlightedText = (text: string) => {
    if (!text || typeof text !== 'string') {
      return [{ text, highlighted: false, key: 0 }];
    }

    const parts = text.split(/(<mark>.*?<\/mark>)/g);

    return parts
      .map((part, index) => {
        if (part.startsWith('<mark>') && part.endsWith('</mark>')) {
          const highlightedText = part.replace(/<\/?mark>/g, '');
          return { text: highlightedText, highlighted: true, key: index };
        }
        return { text: part, highlighted: false, key: index };
      })
      .filter(part => part.text.length > 0);
  };

  const textParts = parseHighlightedText(text);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {textParts.map(part => (
        <Text
          key={part.key}
          style={part.highlighted ? [style, styles.highlight] : style}>
          {part.text}
        </Text>
      ))}
    </Text>
  );
};
