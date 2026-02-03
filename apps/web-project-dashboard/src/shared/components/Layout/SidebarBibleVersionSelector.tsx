import React, { useEffect, useCallback, useContext } from 'react';
import { ProjectRouteContext } from '../../../features/dashboard/context/ProjectRoute.context';
import { useProjectStore } from '../../stores/project';
import { Select, SelectItem } from '../../design-system';

export const SidebarBibleVersionSelector: React.FC = () => {
  // Use route context in project layout
  const routeContext = useContext(ProjectRouteContext);
  const hasProject = routeContext?.isProjectSelected ?? false;

  // Use direct store access to avoid selector instability
  const bibleVersions = useProjectStore(state => state.bibleVersions);
  const selectedBibleVersionId = useProjectStore(
    state => state.selectedBibleVersionId
  );
  const fetchBibleVersions = useProjectStore(state => state.fetchBibleVersions);
  const setSelectedBibleVersionId = useProjectStore(
    state => state.setSelectedBibleVersionId
  );

  // Memoize the change handler to prevent unnecessary re-renders
  const handleVersionChange = useCallback(
    (versionId: string) => {
      setSelectedBibleVersionId(versionId);
    },
    [setSelectedBibleVersionId]
  );

  // Ensure bible versions are loaded, but only run once
  useEffect(() => {
    if (bibleVersions.length === 0) {
      fetchBibleVersions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Remove dependencies to prevent infinite loop

  // Don't show if no project is selected
  if (!hasProject) {
    return null;
  }

  return (
    <div className='px-0.5'>
      <div className='mb-1'>
        <label className='block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide'>
          Bible Version
        </label>
      </div>

      <Select
        value={selectedBibleVersionId || ''}
        onValueChange={handleVersionChange}
        disabled={bibleVersions.length === 0}
        size='sm'
        className='text-[11px] h-7'>
        {bibleVersions.map(version => (
          <SelectItem
            key={version.id}
            value={version.id}
            className='text-[11px] py-1.5'>
            {version.name}
          </SelectItem>
        ))}
      </Select>
    </div>
  );
};
