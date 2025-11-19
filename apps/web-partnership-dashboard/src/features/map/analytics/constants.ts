// Recent session threshold for pulsing animation (1 hour)
export const RECENT_SESSION_THRESHOLD_HOURS = 1;

// Recent chapter listen threshold for extra pulsing (15 minutes)
export const RECENT_CHAPTER_LISTEN_THRESHOLD_MINUTES = 15;

// Max session duration in seconds (24 hours)
export const MAX_SESSION_DURATION_SECONDS = 86400;

// Grid sizes by zoom level (in degrees)
export const GRID_SIZES_BY_ZOOM: Record<number, number> = {
  0: 1.0, // Low zoom: coarser grid
  4: 0.5, // Mid zoom: standard grid
  7: 0.25, // High zoom: finer grid
};

// Point limits by zoom level
export const POINT_LIMITS_BY_ZOOM: Record<number, number> = {
  0: 5000, // Low zoom: fewer points
  4: 10000, // Mid zoom: moderate points
  7: 20000, // High zoom: more points
};

// Default time period options (in hours)
export const TIME_PERIOD_OPTIONS = [
  { value: 1, label: '1 hour' },
  { value: 6, label: '6 hours' },
  { value: 12, label: '12 hours' },
  { value: 24, label: '1 day' },
  { value: 72, label: '3 days' },
  { value: 168, label: '1 week' },
  { value: 336, label: '2 weeks' },
  { value: 720, label: '1 month' },
];

// Default color gradient (blue to red)
export const DEFAULT_COLOR_GRADIENT = [
  { position: 0, color: 'rgba(0,0,0,0)' },
  { position: 0.2, color: 'rgba(56, 135, 190, 0.35)' },
  { position: 0.4, color: 'rgba(40, 122, 185, 0.55)' },
  { position: 0.6, color: 'rgba(255, 165, 0, 0.7)' },
  { position: 0.8, color: 'rgba(255, 99, 71, 0.85)' },
  { position: 1, color: 'rgba(255, 0, 0, 0.95)' },
];

// Helper function to get grid size for a zoom level
export function getGridSizeForZoom(zoom: number): number {
  if (zoom < 4) return GRID_SIZES_BY_ZOOM[0];
  if (zoom < 7) return GRID_SIZES_BY_ZOOM[4];
  return GRID_SIZES_BY_ZOOM[7];
}

// Helper function to get point limit for a zoom level
export function getPointLimitForZoom(zoom: number): number {
  if (zoom < 4) return POINT_LIMITS_BY_ZOOM[0];
  if (zoom < 7) return POINT_LIMITS_BY_ZOOM[4];
  return POINT_LIMITS_BY_ZOOM[7];
}
