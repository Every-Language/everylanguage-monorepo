/**
 * Layout Configuration Types
 *
 * Defines the structure for configurable map inspector layouts
 */

export type PanelPosition = 'left' | 'right' | 'bottom';

export interface PanelConfig {
  id: string;
  position: PanelPosition;
  width?: number;
  maxHeight?: string;
}

export interface LayoutConfig {
  id: string;
  name: string;
  panels: PanelConfig[];
}
