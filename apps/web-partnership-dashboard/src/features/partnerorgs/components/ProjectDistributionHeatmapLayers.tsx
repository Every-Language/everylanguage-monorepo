'use client';

import React from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import type {
  FilterSpecification,
  ExpressionSpecification,
} from '@maplibre/maplibre-gl-style-spec';
import type { PartnerOrgProject } from '../types';

interface HeatmapDataPoint {
  language_entity_id: string;
  grid: { type: string; coordinates: [number, number] };
  event_count: number;
  last_event_at: string | null;
}

interface ProjectDistributionHeatmapLayersProps {
  enabledProjectIds: Set<string>;
  projects: PartnerOrgProject[];
  projectColors: Map<string, string>;
  heatmapData: HeatmapDataPoint[] | undefined;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);
  return [r, g, b];
}

function colorRampForHex(hex: string): ExpressionSpecification {
  const [r, g, b] = hexToRgb(hex);
  return [
    'interpolate',
    ['linear'],
    ['heatmap-density'],
    0,
    'rgba(0,0,0,0)',
    0.2,
    `rgba(${r},${g},${b},0.35)`,
    0.4,
    `rgba(${r},${g},${b},0.55)`,
    0.6,
    `rgba(${r},${g},${b},0.7)`,
    0.8,
    `rgba(${r},${g},${b},0.85)`,
    1,
    `rgba(${r},${g},${b},0.95)`,
  ] as unknown as ExpressionSpecification;
}

export const ProjectDistributionHeatmapLayers: React.FC<
  ProjectDistributionHeatmapLayersProps
> = ({ enabledProjectIds, projects, projectColors, heatmapData }) => {
  // Group heatmap data by language_entity_id
  const heatmapByLanguage = React.useMemo(() => {
    if (!heatmapData || heatmapData.length === 0) return new Map();
    const map = new Map<string, HeatmapDataPoint[]>();
    for (const point of heatmapData) {
      const langId = point.language_entity_id;
      if (!langId) continue;
      const existing = map.get(langId) || [];
      existing.push(point);
      map.set(langId, existing);
    }
    return map;
  }, [heatmapData]);

  // Map each language_entity_id to the first enabled project that uses it
  const languageToProjectMap = React.useMemo(() => {
    const map = new Map<string, { projectId: string; color: string }>();
    for (const project of projects) {
      if (!enabledProjectIds.has(project.project_id)) continue;
      const langId = project.language_entity_id;
      if (!langId) continue;
      // Only set if not already mapped (first enabled project wins)
      if (!map.has(langId)) {
        const color = projectColors.get(project.project_id) || '#3b82f6';
        map.set(langId, { projectId: project.project_id, color });
      }
    }
    return map;
  }, [projects, enabledProjectIds, projectColors]);

  // Create GeoJSON FeatureCollection for all languages
  const featureCollection = React.useMemo(() => {
    const features: GeoJSON.Feature<
      GeoJSON.Point,
      { language_entity_id: string; weight: number; lastAt: string | null }
    >[] = [];

    for (const [langId, points] of heatmapByLanguage.entries()) {
      // Only include languages that have an enabled project
      if (!languageToProjectMap.has(langId)) continue;

      for (const point of points) {
        const coords =
          point.grid &&
          Array.isArray((point.grid as { coordinates?: unknown }).coordinates)
            ? (point.grid as { coordinates: [number, number] }).coordinates
            : undefined;
        if (!coords) continue;

        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: coords },
          properties: {
            language_entity_id: langId,
            weight: Math.log((point.event_count ?? 0) + 1),
            lastAt: point.last_event_at ?? null,
          },
        });
      }
    }

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [heatmapByLanguage, languageToProjectMap]);

  // Get unique enabled language IDs
  const enabledLanguageIds = React.useMemo(() => {
    return Array.from(languageToProjectMap.keys());
  }, [languageToProjectMap]);

  if (
    enabledLanguageIds.length === 0 ||
    featureCollection.features.length === 0
  ) {
    return null;
  }

  return (
    <Source
      id='project-distribution-heatmap'
      key='project-distribution-heatmap'
      type='geojson'
      data={featureCollection}>
      {enabledLanguageIds.flatMap(langId => {
        const projectInfo = languageToProjectMap.get(langId);
        if (!projectInfo) return [];

        return [
          <Layer
            key={`project-heatmap-${langId}`}
            id={`project-heatmap-${langId}`}
            type='heatmap'
            filter={
              [
                '==',
                ['get', 'language_entity_id'],
                langId,
              ] as unknown as FilterSpecification
            }
            paint={{
              'heatmap-weight': [
                'interpolate',
                ['linear'],
                ['get', 'weight'],
                0,
                0,
                8,
                1,
              ],
              'heatmap-intensity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0,
                0.9,
                6,
                1.6,
                9,
                2.0,
              ],
              'heatmap-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0,
                3,
                4,
                14,
                8,
                28,
                12,
                36,
              ],
              'heatmap-opacity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0,
                0.45,
                8,
                0.6,
              ],
              'heatmap-color': colorRampForHex(
                projectInfo.color
              ) as unknown as ExpressionSpecification,
            }}
          />,
          <Layer
            key={`project-heatmap-detail-${langId}`}
            id={`project-heatmap-detail-${langId}`}
            type='circle'
            minzoom={8}
            filter={
              [
                '==',
                ['get', 'language_entity_id'],
                langId,
              ] as unknown as FilterSpecification
            }
            paint={{
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                8,
                2.5,
                12,
                6,
              ],
              'circle-color': projectInfo.color,
              'circle-stroke-color': 'rgba(255,255,255,0.7)',
              'circle-stroke-width': 1,
              'circle-opacity': 0.6,
            }}
          />,
        ];
      })}
    </Source>
  );
};
