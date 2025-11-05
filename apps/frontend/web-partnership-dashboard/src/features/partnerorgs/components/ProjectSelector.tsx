import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { usePartnerOrgProjects } from '../hooks/usePartnerOrgProjects';

export const ProjectSelector: React.FC = () => {
  const { orgId, projectId } = useParams<{
    orgId: string;
    projectId?: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: projects, isLoading } = usePartnerOrgProjects(orgId!);

  // Extract current tab from pathname
  const pathSegments = location.pathname.split('/');
  const currentTab = pathSegments[pathSegments.length - 1] || 'progress';

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProjectId = e.target.value;

    if (newProjectId === 'all') {
      navigate(`/partner-org/${orgId}/dashboard`);
    } else {
      navigate(`/partner-org/${orgId}/project/${newProjectId}/${currentTab}`);
    }
  };

  return (
    <div className='flex items-center gap-2'>
      <label
        htmlFor='project-selector'
        className='text-sm font-medium text-gray-700'
      >
        Project:
      </label>
      <select
        id='project-selector'
        value={projectId || 'all'}
        onChange={handleProjectChange}
        disabled={isLoading}
        className='block w-64 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
      >
        <option value='all'>All Projects</option>
        {projects?.map((p: any) => (
          <option key={p.project_id} value={p.project_id}>
            {p.language_name} • {p.project_name}
          </option>
        ))}
      </select>
    </div>
  );
};
