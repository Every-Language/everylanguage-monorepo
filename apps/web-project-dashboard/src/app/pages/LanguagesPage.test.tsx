import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguagesPage } from './LanguagesPage';
import type { ActiveProjectWithProgress } from '../../shared/hooks/query/projects';

vi.mock('../../shared/services/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
  isSupabaseConnected: vi.fn(),
}));

vi.mock('../../shared/hooks/query/projects', () => ({
  useActiveProjectsWithProgress: vi.fn(),
}));

vi.mock('../../features/landing-page/components/LandingNavbar', () => ({
  LandingNavbar: (): React.ReactElement => <nav data-testid='landing-navbar' />,
}));

vi.mock('@/features/landing-page', () => ({
  LandingFooter: (): React.ReactElement => (
    <footer data-testid='landing-footer' />
  ),
}));

import { useActiveProjectsWithProgress } from '../../shared/hooks/query/projects';

type HookReturn = {
  data?: ActiveProjectWithProgress[];
  isLoading: boolean;
};

const mockUseActiveProjectsWithProgress =
  useActiveProjectsWithProgress as unknown as ReturnType<typeof vi.fn>;

function setHookReturn(value: HookReturn): void {
  mockUseActiveProjectsWithProgress.mockReturnValue(value);
}

const sampleProjects: ActiveProjectWithProgress[] = [
  {
    project_id: 'p-1',
    project_name: 'Alpha Project',
    language_name: 'Bajhangi',
    has_audio: true,
    has_text: false,
    completed_chapters: 100,
    total_chapters: 200,
    progress_percentage: 50,
  },
  {
    project_id: 'p-2',
    project_name: 'Beta Project',
    language_name: 'Tagalog',
    has_audio: false,
    has_text: true,
    completed_chapters: 1189,
    total_chapters: 1189,
    progress_percentage: 100,
  },
  {
    project_id: 'p-3',
    project_name: 'Gamma Project',
    language_name: 'Quechua',
    has_audio: true,
    has_text: false,
    completed_chapters: 0,
    total_chapters: 1189,
    progress_percentage: 0,
  },
];

describe('LanguagesPage', () => {
  beforeEach(() => {
    mockUseActiveProjectsWithProgress.mockReset();
  });

  it('renders the loading spinner while data is loading', () => {
    setHookReturn({ data: undefined, isLoading: true });

    const { container } = render(<LanguagesPage />);

    expect(container.querySelector('.animate-spin')).not.toBeNull();
  });

  it('shows the empty state when no projects are returned', () => {
    setHookReturn({ data: [], isLoading: false });

    render(<LanguagesPage />);

    expect(screen.getByText('No projects available')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Active projects will appear here once they have translation progress/i
      )
    ).toBeInTheDocument();
  });

  it('renders one row per active project with progress chip', () => {
    setHookReturn({ data: sampleProjects, isLoading: false });

    render(<LanguagesPage />);

    expect(screen.getByText('Bajhangi')).toBeInTheDocument();
    expect(screen.getByText('Alpha Project')).toBeInTheDocument();
    expect(screen.getByText('50.0%')).toBeInTheDocument();

    expect(screen.getByText('Tagalog')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();

    expect(screen.getByText('Quechua')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('filters rows by language name (case insensitive)', () => {
    setHookReturn({ data: sampleProjects, isLoading: false });

    render(<LanguagesPage />);

    fireEvent.change(
      screen.getByPlaceholderText(/Search by language name or project name/i),
      { target: { value: 'taga' } }
    );

    expect(screen.getByText('Tagalog')).toBeInTheDocument();
    expect(screen.queryByText('Bajhangi')).not.toBeInTheDocument();
    expect(screen.queryByText('Quechua')).not.toBeInTheDocument();
  });

  it('filters rows by project name (case insensitive)', () => {
    setHookReturn({ data: sampleProjects, isLoading: false });

    render(<LanguagesPage />);

    fireEvent.change(
      screen.getByPlaceholderText(/Search by language name or project name/i),
      { target: { value: 'gamma' } }
    );

    expect(screen.getByText('Gamma Project')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Project')).not.toBeInTheDocument();
    expect(screen.queryByText('Beta Project')).not.toBeInTheDocument();
  });

  it('shows only the top N rows when not searching, with a Show all toggle', () => {
    const many: ActiveProjectWithProgress[] = Array.from(
      { length: 12 },
      (_, i) => ({
        project_id: `p-${i}`,
        project_name: `Project ${i}`,
        language_name: `Lang ${i}`,
        has_audio: true,
        has_text: false,
        completed_chapters: i,
        total_chapters: 100,
        progress_percentage: i,
      })
    );

    setHookReturn({ data: many, isLoading: false });

    render(<LanguagesPage />);

    expect(screen.getByText('Lang 0')).toBeInTheDocument();
    expect(screen.queryByText('Lang 11')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Show all 12/i }));

    expect(screen.getByText('Lang 11')).toBeInTheDocument();
  });

  it('does not render NT/OT chip columns', () => {
    setHookReturn({ data: sampleProjects, isLoading: false });

    render(<LanguagesPage />);

    expect(screen.queryByText('New Testament')).not.toBeInTheDocument();
    expect(screen.queryByText('Old Testament')).not.toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
  });

  it('does not render a Country column', () => {
    setHookReturn({ data: sampleProjects, isLoading: false });

    render(<LanguagesPage />);

    expect(screen.queryByText('Country')).not.toBeInTheDocument();
  });
});
