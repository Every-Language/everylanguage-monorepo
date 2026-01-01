import { useEffect, useState } from 'react';
import { projectsService } from '../services/projectsService';
import type { UserProject } from '../types';

export function useUserProjects() {
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const fetchProjects = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(null);
        const data = await projectsService.getUserProjects();
        if (isMounted) {
          setProjects(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err : new Error('Failed to fetch projects')
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchProjects();

    // Subscribe to changes
    subscription = projectsService.onUserProjectsChange(updatedProjects => {
      if (isMounted) {
        setProjects(updatedProjects);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  return { projects, loading, error };
}
