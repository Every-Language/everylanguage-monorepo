/**
 * Color palette for project visualization
 */
export const PROJECT_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
] as const;

/**
 * Get a color for a project by index (cycles through colors)
 */
export function getProjectColor(index: number): string {
  return PROJECT_COLORS[index % PROJECT_COLORS.length];
}

/**
 * Create a color map for projects
 */
export function createProjectColorMap<T>(
  items: T[],
  getId: (item: T) => string
): Map<string, string> {
  const colorMap = new Map<string, string>();
  items.forEach((item, idx) => {
    colorMap.set(getId(item), getProjectColor(idx));
  });
  return colorMap;
}
