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

// Hard limit for point rendering across all zoom levels
// Set to 20k for consistent browser rendering performance
// Database can handle much higher limits, but browser rendering is the bottleneck
// This limit assumes clustering is enabled for optimal performance
export const POINT_LIMIT = 20000;

// Time period options for slider (in hours)
// Range from 1 day to 1 year (max)
export const TIME_PERIOD_SLIDER_OPTIONS = [
  { value: 24, label: '1 day' },
  { value: 168, label: '1 week' }, // 7 days
  { value: 336, label: '2 weeks' },
  { value: 720, label: '1 month' }, // ~30 days
  { value: 1440, label: '2 months' }, // ~60 days
  { value: 2160, label: '3 months' }, // ~90 days
  { value: 4320, label: '6 months' }, // ~180 days
  { value: 8760, label: '1 year' }, // ~365 days
] as const;

// Default time period: 1 month (720 hours)
export const DEFAULT_TIME_PERIOD_HOURS = 720;

// Helper to get slider index from hours value
export function getSliderIndexFromHours(hours: number): number {
  const index = TIME_PERIOD_SLIDER_OPTIONS.findIndex(
    opt => opt.value === hours
  );
  return index >= 0 ? index : 3; // Default to 1 month if not found
}

// Helper to get hours value from slider index
export function getHoursFromSliderIndex(index: number): number {
  return TIME_PERIOD_SLIDER_OPTIONS[index]?.value ?? DEFAULT_TIME_PERIOD_HOURS;
}

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

// Helper function to get point limit (now returns constant limit for all zoom levels)
// Kept for backward compatibility with existing code
export function getPointLimitForZoom(zoom: number): number {
  return POINT_LIMIT;
}
