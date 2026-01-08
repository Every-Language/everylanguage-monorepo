import React from 'react';
import { Dimensions } from 'react-native';

/**
 * Responsive grid utilities for consistent card layouts across devices
 */

export interface GridConfig {
  /** Maximum width for each card in pixels */
  maxCardWidth: number;
  /** Minimum gap between cards */
  gap: number;
  /** Container padding (total for both sides) */
  containerPadding: number;
}

/**
 * Calculate optimal number of columns based on max card width
 * This approach is more flexible than device detection
 */
export const calculateGridColumns = (config: GridConfig): number => {
  const { width } = Dimensions.get('window');
  const { maxCardWidth, gap, containerPadding } = config;

  // Available width for cards (screen width minus container padding)
  const availableWidth = width - containerPadding;

  // Calculate how many cards can fit with gaps
  // Formula: (availableWidth + gap) / (maxCardWidth + gap)
  const possibleColumns = Math.floor(
    (availableWidth + gap) / (maxCardWidth + gap)
  );

  // Ensure at least 1 column, max 6 columns for readability
  return Math.max(1, Math.min(possibleColumns, 6));
};

/**
 * Get responsive card width based on number of columns
 * This ensures cards fill the available space optimally
 */
export const calculateCardWidth = (
  numColumns: number,
  config: GridConfig
): number => {
  const { width } = Dimensions.get('window');
  const { gap, containerPadding } = config;

  const availableWidth = width - containerPadding;
  const totalGaps = gap * (numColumns - 1);

  return (availableWidth - totalGaps) / numColumns;
};

/**
 * Default configuration for Bible book cards
 * Adjust these values to fine-tune your grid
 */
export const BOOK_GRID_CONFIG: GridConfig = {
  maxCardWidth: 160, // Max card width in pixels
  gap: 16, // Gap between cards
  containerPadding: 0, // Total horizontal padding (16px each side)
};

/**
 * Hook for responsive grid calculations with dimension change handling
 */
export const useResponsiveGrid = (config: GridConfig = BOOK_GRID_CONFIG) => {
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  React.useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      forceUpdate();
    });

    return () => subscription?.remove();
  }, []);

  const numColumns = React.useMemo(
    () => calculateGridColumns(config),
    [config]
  );

  const cardWidth = React.useMemo(
    () => calculateCardWidth(numColumns, config),
    [numColumns, config]
  );

  return { numColumns, cardWidth };
};
