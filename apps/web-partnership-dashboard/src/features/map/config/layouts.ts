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
      sections: [
        'map-controls',
        'hierarchy',
        'info',
        'linked-entities',
        'bible-progress',
        'bible-listening',
        'jp-country-stats',
        'jp-language-stats',
        'jp-people-groups',
        'grn-language-sample',
        'grn-gospel-resources',
      ],
    },
  ],
  mobilePanel: {
    sections: [
      'map-controls',
      'hierarchy',
      'info',
      'linked-entities',
      'bible-progress',
      'bible-listening',
      'jp-country-stats',
      'jp-language-stats',
      'jp-people-groups',
      'grn-language-sample',
      'grn-gospel-resources',
    ],
  },
};

export const TWO_PANEL_LAYOUT: LayoutConfig = {
  id: 'two-panel',
  name: 'Two Panel Layout',
  panels: [
    {
      id: 'left',
      position: 'left',
      width: 420,
      maxHeight: '60vh',
      sections: ['map-controls', 'hierarchy', 'linked-entities'],
    },
    {
      id: 'right',
      position: 'right',
      width: 420,
      sections: [
        'info',
        'bible-progress',
        'bible-listening',
        'jp-country-stats',
        'jp-language-stats',
        'jp-people-groups',
        'grn-language-sample',
        'grn-gospel-resources',
      ],
    },
  ],
  mobilePanel: {
    sections: [
      'map-controls',
      'hierarchy',
      'info',
      'linked-entities',
      'bible-progress',
      'bible-listening',
      'jp-country-stats',
      'jp-language-stats',
      'jp-people-groups',
      'grn-language-sample',
      'grn-gospel-resources',
    ],
  },
};

export const LEFT_PANEL_LAYOUT: LayoutConfig = {
  id: 'single-left',
  name: 'Single Panel Left',
  panels: [
    {
      id: 'left',
      position: 'left',
      width: 480,
      sections: [
        'map-controls',
        'hierarchy',
        'info',
        'linked-entities',
        'bible-progress',
        'bible-listening',
        'jp-country-stats',
        'jp-language-stats',
        'jp-people-groups',
        'grn-language-sample',
        'grn-gospel-resources',
      ],
    },
  ],
  mobilePanel: {
    sections: [
      'map-controls',
      'hierarchy',
      'info',
      'linked-entities',
      'bible-progress',
      'bible-listening',
      'jp-country-stats',
      'jp-language-stats',
      'jp-people-groups',
      'grn-language-sample',
      'grn-gospel-resources',
    ],
  },
};

// Default layout (can be changed based on user preference in future)
export const DEFAULT_LAYOUT = SINGLE_PANEL_LAYOUT;

// Export all layouts for easy access
export const AVAILABLE_LAYOUTS = [
  SINGLE_PANEL_LAYOUT,
  TWO_PANEL_LAYOUT,
  LEFT_PANEL_LAYOUT,
];
