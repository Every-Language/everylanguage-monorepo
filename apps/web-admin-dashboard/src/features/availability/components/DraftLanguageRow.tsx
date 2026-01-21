import { useQuery } from '@tanstack/react-query';
import { languagesApi } from '@/features/languages/api/languagesApi';
import type { LanguageEntityWithRegions } from '@/types';

interface DraftLanguageRowProps {
  language: LanguageEntityWithRegions;
  onAddLanguage: (id: string) => void;
  onCloseModal: () => void;
  isPending: boolean;
}

export function DraftLanguageRow({
  language,
  onAddLanguage,
  onCloseModal,
  isPending,
}: DraftLanguageRowProps): React.JSX.Element {
  // Fetch language entity sources for external IDs
  const { data: sources } = useQuery({
    queryKey: ['language-entity-sources', language.id],
    queryFn: () => languagesApi.fetchLanguageEntitySources(language.id),
    staleTime: 5 * 60 * 1000,
  });

  const externalIds =
    sources
      ?.filter(s => s.external_id && s.external_id_type)
      .map(s => `${s.external_id_type}:${s.external_id}`) || [];

  return (
    <tr className='hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors'>
      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100'>
        {language.name}
      </td>
      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
        <span className='px-2 py-1 text-xs font-medium rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300'>
          {language.level}
        </span>
      </td>
      <td className='px-6 py-4 text-sm text-neutral-500 dark:text-neutral-400'>
        {externalIds.length > 0 ? (
          <div className='flex flex-col gap-1'>
            {externalIds.map((id, idx) => (
              <span key={idx} className='font-mono text-xs'>
                {id}
              </span>
            ))}
          </div>
        ) : (
          <span className='text-neutral-400 dark:text-neutral-600'>—</span>
        )}
      </td>
      <td className='px-6 py-4 text-sm text-neutral-500 dark:text-neutral-400'>
        {language.regions && language.regions.length > 0 ? (
          <div className='flex flex-col gap-1'>
            {language.regions.map((region, idx) => (
              <span key={idx} className='text-xs'>
                {region.name}
              </span>
            ))}
          </div>
        ) : (
          <span className='text-neutral-400 dark:text-neutral-600'>—</span>
        )}
      </td>
      <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
        <button
          onClick={() => {
            onAddLanguage(language.id);
            onCloseModal();
          }}
          disabled={isPending}
          className='px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
          Add Language
        </button>
      </td>
    </tr>
  );
}
