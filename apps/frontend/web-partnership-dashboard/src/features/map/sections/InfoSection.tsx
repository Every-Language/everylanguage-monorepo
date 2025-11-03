import React from 'react';
import { useLanguageEntity } from '../hooks/useLanguageEntity';
import { useRegion } from '../hooks/useRegion';

type InfoSectionProps = {
  type: 'language' | 'region';
  entityId: string;
};

/**
 * Info Section displays aliases ("Also known as") and stats (properties)
 * for both languages and regions
 */
export const InfoSection: React.FC<InfoSectionProps> = ({ type, entityId }) => {
  const languageData = useLanguageEntity(entityId);
  const regionData = useRegion(entityId);

  const data = type === 'language' ? languageData : regionData;
  const entity = type === 'language' ? languageData.entity : regionData.region;
  const properties =
    type === 'language' ? languageData.properties : regionData.properties;

  if (entity.isLoading) return <div>Loading...</div>;
  if (entity.error)
    return <div className='text-red-600'>Failed to load {type}.</div>;

  return (
    <div className='space-y-4'>
      {/* Aliases Section */}
      <div>
        <div className='font-semibold mb-1'>Also known as</div>
        {entity.data?.aliases.length ? (
          <div className='text-sm'>{entity.data.aliases.join(', ')}</div>
        ) : (
          <div className='text-sm text-neutral-500'>No alternate names</div>
        )}
      </div>

      {/* Stats Section */}
      <div>
        <div className='font-semibold mb-1'>Stats</div>
        <ul className='text-sm space-y-1'>
          {properties.data?.map(p => (
            <li key={p.id}>
              <span className='text-neutral-500 mr-2'>{p.key}:</span>
              {p.value}
            </li>
          ))}
          {properties.data?.length === 0 && (
            <li className='text-neutral-500'>No stats available</li>
          )}
        </ul>
      </div>
    </div>
  );
};
