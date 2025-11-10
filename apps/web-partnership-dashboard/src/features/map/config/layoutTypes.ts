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
  | 'map-controls';

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
