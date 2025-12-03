export type UUID = string;

export type GlobalHeatmapPoint = {
  lon: number;
  lat: number;
  intensity: number;
  sessionCount: number;
  totalDurationSeconds: number;
  mostRecentSessionStart: string | null;
  mostRecentChapterListen: string | null;
  languages: string[]; // Array of language_entity_ids
  ageNormalized: number; // 0-1, relative to time period start
};

export type ColorStop = {
  position: number; // 0-1
  color: string; // CSS color string (hex, rgb, rgba)
};

export type ColorGradient = ColorStop[];

export type HeatmapSettings = {
  timePeriodHours: number;
  colorGradient: ColorGradient;
};
