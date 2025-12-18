import { type LayoutConfig } from './layoutTypes';

/**
 * Predefined Layout Configurations
 */

export const SINGLE_PANEL_LAYOUT: LayoutConfig = {
  id: 'single-right',
  name: 'Single Panel Right',
  panels: [
    {
      id: 'right',
      position: 'right',
      width: 480,
    },
  ],
};

// Default layout (can be changed based on user preference in future)
export const DEFAULT_LAYOUT = SINGLE_PANEL_LAYOUT;
