import {
  useCreateRecord,
  useUpdateRecord,
  useSoftDeleteRecord,
} from '@/shared/hooks/query/base-mutations';

export function useCreateProjectUpdate() {
  return useCreateRecord('project_updates', {
    invalidateQueries: [['project-updates']],
  });
}

export function useUpdateProjectUpdate() {
  return useUpdateRecord('project_updates', {
    invalidateQueries: [['project-updates']],
  });
}

export function useDeleteProjectUpdate() {
  return useSoftDeleteRecord('project_updates', {
    invalidateQueries: [['project-updates']],
  });
}
