import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import { MapColorLegend } from './MapColorLegend';
import type { LayerState } from '../sections/MapControlsSection';
import type { SelectionMode } from '../inspector/state/inspectorStore';
import type { ColorGradient } from '../analytics/types';

const createLayerState = (overrides: Partial<LayerState> = {}): LayerState => ({
  countries: false,
  projects: false,
  globalListening: false,
  languages: false,
  peopleGroups: false,
  ...overrides,
});

describe('MapColorLegend', () => {
  const defaultSelectionMode: SelectionMode = 'language';

  describe('Rendering based on active layers', () => {
    it('should return null when no layers are active', () => {
      const { container } = render(
        <MapColorLegend
          activeLayers={createLayerState()}
          selectionMode={defaultSelectionMode}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render legend when People Groups layer is active', () => {
      render(
        <MapColorLegend
          activeLayers={createLayerState({ peopleGroups: true })}
          selectionMode={defaultSelectionMode}
        />
      );

      expect(screen.getByText('Color Legend')).toBeInTheDocument();
      expect(screen.getByText('People Groups')).toBeInTheDocument();
      expect(screen.getByText('Full Bible')).toBeInTheDocument();
      expect(screen.getByText('New Testament')).toBeInTheDocument();
      expect(screen.getByText('Portions')).toBeInTheDocument();
      expect(screen.getByText('No Scripture')).toBeInTheDocument();
    });

    it('should render legend when Languages layer is active', () => {
      render(
        <MapColorLegend
          activeLayers={createLayerState({ languages: true })}
          selectionMode={defaultSelectionMode}
        />
      );

      expect(screen.getByText('Color Legend')).toBeInTheDocument();
      expect(screen.getByText('Languages')).toBeInTheDocument();
      expect(screen.getByText('Full Bible')).toBeInTheDocument();
      expect(screen.getByText('New Testament')).toBeInTheDocument();
      expect(screen.getByText('Portions')).toBeInTheDocument();
      expect(screen.getByText('No Scripture')).toBeInTheDocument();
    });

    it('should render legend when Countries layer is active', () => {
      render(
        <MapColorLegend
          activeLayers={createLayerState({ countries: true })}
          selectionMode={defaultSelectionMode}
        />
      );

      expect(screen.getByText('Color Legend')).toBeInTheDocument();
      expect(screen.getByText('Countries')).toBeInTheDocument();
      expect(screen.getByText('Mostly Full Bible')).toBeInTheDocument();
      expect(screen.getByText('Mostly New Testament')).toBeInTheDocument();
      expect(screen.getByText('Mostly Portions')).toBeInTheDocument();
      expect(screen.getByText('Mostly No Scripture')).toBeInTheDocument();
    });

    it('should render legend when Projects layer is active', () => {
      render(
        <MapColorLegend
          activeLayers={createLayerState({ projects: true })}
          selectionMode={defaultSelectionMode}
        />
      );

      expect(screen.getByText('Color Legend')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(screen.getByText('Project')).toBeInTheDocument();
    });

    it('should render legend when Global Listening layer is active with gradient', () => {
      const gradient: ColorGradient = [
        { position: 0, color: 'rgba(0,0,0,0)' },
        { position: 1, color: 'rgba(255,0,0,0.95)' },
      ];

      render(
        <MapColorLegend
          activeLayers={createLayerState({ globalListening: true })}
          selectionMode={defaultSelectionMode}
          globalListeningGradient={gradient}
        />
      );

      expect(screen.getByText('Color Legend')).toBeInTheDocument();
      expect(screen.getByText('Global Listening')).toBeInTheDocument();
      expect(screen.getByText('Low → High')).toBeInTheDocument();
    });

    it('should not render Global Listening legend when gradient is not provided', () => {
      const { container } = render(
        <MapColorLegend
          activeLayers={createLayerState({ globalListening: true })}
          selectionMode={defaultSelectionMode}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Multiple active layers', () => {
    it('should render legends for all active layers', () => {
      render(
        <MapColorLegend
          activeLayers={createLayerState({
            peopleGroups: true,
            languages: true,
            countries: true,
            projects: true,
          })}
          selectionMode={defaultSelectionMode}
        />
      );

      expect(screen.getByText('People Groups')).toBeInTheDocument();
      expect(screen.getByText('Languages')).toBeInTheDocument();
      expect(screen.getByText('Countries')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
    });

    it('should render correct legend items for each layer type', () => {
      render(
        <MapColorLegend
          activeLayers={createLayerState({
            peopleGroups: true,
            countries: true,
          })}
          selectionMode={defaultSelectionMode}
        />
      );

      // People Groups should show standard Bible status labels
      expect(screen.getByText('Full Bible')).toBeInTheDocument();
      expect(screen.getByText('No Scripture')).toBeInTheDocument();

      // Countries should show "Mostly" prefixed labels
      expect(screen.getByText('Mostly Full Bible')).toBeInTheDocument();
      expect(screen.getByText('Mostly No Scripture')).toBeInTheDocument();
    });
  });

  describe('Color swatches', () => {
    it('should render color swatches with correct colors for Bible status items', () => {
      const { container } = render(
        <MapColorLegend
          activeLayers={createLayerState({ languages: true })}
          selectionMode={defaultSelectionMode}
        />
      );

      const swatches = container.querySelectorAll('[aria-hidden="true"]');
      expect(swatches.length).toBeGreaterThan(0);

      // Check that swatches have backgroundColor style set
      swatches.forEach(swatch => {
        const element = swatch as HTMLElement;
        expect(element.style.backgroundColor).toBeTruthy();
      });
    });

    it('should render gradient bar for Global Listening', () => {
      const gradient: ColorGradient = [
        { position: 0, color: 'rgba(0,0,0,0)' },
        { position: 1, color: 'rgba(255,0,0,0.95)' },
      ];

      const { container } = render(
        <MapColorLegend
          activeLayers={createLayerState({ globalListening: true })}
          selectionMode={defaultSelectionMode}
          globalListeningGradient={gradient}
        />
      );

      const gradientBar = container.querySelector('[style*="linear-gradient"]');
      expect(gradientBar).toBeInTheDocument();
    });
  });

  describe('Selection mode independence', () => {
    it('should render legends regardless of selection mode', () => {
      const selectionModes: SelectionMode[] = [
        'language',
        'region',
        'people_group',
      ];

      selectionModes.forEach(mode => {
        const { unmount } = render(
          <MapColorLegend
            activeLayers={createLayerState({ languages: true })}
            selectionMode={mode}
          />
        );

        expect(screen.getByText('Languages')).toBeInTheDocument();
        unmount();
      });
    });
  });
});
