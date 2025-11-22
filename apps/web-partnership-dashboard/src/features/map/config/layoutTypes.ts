/**
 * Layout Configuration Types
 *
 * Defines the structure for configurable map inspector layouts
 */

export type SectionType =
  | 'hierarchy'
  | 'linked-entities'
  | 'info'
  | 'bible-progress'
  | 'bible-listening'
  | 'map-controls'
  | 'jp-people-groups'
  | 'jp-country-stats'
  | 'jp-language-stats'
  | 'grn-language-sample'
  | 'grn-gospel-resources'
  | 'people-group-stats';

export type PanelPosition = 'left' | 'right' | 'bottom';

export interface PanelConfig {
  id: string;
  position: PanelPosition;
  width?: number;
  maxHeight?: string;
  sections: SectionType[];
}

export interface MobilePanelConfig {
  sections: SectionType[];
}

export interface LayoutConfig {
  id: string;
  name: string;
  panels: PanelConfig[];
  mobilePanel?: MobilePanelConfig;
}
