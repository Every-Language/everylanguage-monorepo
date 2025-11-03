import React from 'react';
import { Input } from '@/shared/components/ui/Input';
import { searchPartnerOrgs } from '../../api/fundingApi';

interface PartnerOrgSelectorProps {
  value: {
    orgMode: 'individual' | 'existing' | 'new';
    partner_org_id?: string;
    new_partner_org?: {
      name: string;
      description?: string;
      is_public: boolean;
    };
  };
  onChange: (value: PartnerOrgSelectorProps['value']) => void;
}

export const PartnerOrgSelector: React.FC<PartnerOrgSelectorProps> = ({
  value,
  onChange,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<
    Array<{ id: string; name: string; description: string | null }>
  >([]);
  const [searching, setSearching] = React.useState(false);
  const [showResults, setShowResults] = React.useState(false);

  // Debounced search
  React.useEffect(() => {
    if (
      !searchQuery ||
      searchQuery.trim().length < 2 ||
      value.orgMode !== 'existing'
    ) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const result = await searchPartnerOrgs(searchQuery, 10);
        setSearchResults(result.results);
        setShowResults(true);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, value.orgMode]);

  const handleModeChange = (mode: 'individual' | 'existing' | 'new') => {
    onChange({
      orgMode: mode,
      partner_org_id: undefined,
      new_partner_org: undefined,
    });
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  const handleSelectOrg = (orgId: string, orgName: string) => {
    onChange({
      orgMode: 'existing',
      partner_org_id: orgId,
    });
    setSearchQuery(orgName);
    setShowResults(false);
  };

  const handleCreateNew = () => {
    onChange({
      orgMode: 'new',
      new_partner_org: {
        name: '',
        description: '',
        is_public: false,
      },
    });
    setShowResults(false);
  };

  return (
    <div className='space-y-3'>
      <div className='text-sm font-medium text-neutral-700 dark:text-neutral-300'>
        I am giving as:
      </div>

      {/* Radio buttons for mode selection */}
      <div className='space-y-2'>
        <label className='flex items-center gap-2 cursor-pointer'>
          <input
            type='radio'
            name='orgMode'
            checked={value.orgMode === 'individual'}
            onChange={() => handleModeChange('individual')}
            className='w-4 h-4'
          />
          <span className='text-sm'>An individual</span>
        </label>

        <label className='flex items-center gap-2 cursor-pointer'>
          <input
            type='radio'
            name='orgMode'
            checked={value.orgMode === 'existing' || value.orgMode === 'new'}
            onChange={() => handleModeChange('existing')}
            className='w-4 h-4'
          />
          <span className='text-sm'>An organization</span>
        </label>
      </div>

      {/* Organization search/create */}
      {(value.orgMode === 'existing' || value.orgMode === 'new') && (
        <div className='pl-6 space-y-2'>
          {value.orgMode === 'existing' && (
            <div className='relative'>
              <Input
                placeholder='Find your organization'
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
              />
              {searching && (
                <div className='absolute right-3 top-3 text-xs text-neutral-500'>
                  Searching...
                </div>
              )}

              {/* Search results dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className='absolute z-10 w-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                  {searchResults.map(org => (
                    <button
                      key={org.id}
                      type='button'
                      onClick={() => handleSelectOrg(org.id, org.name)}
                      className='w-full text-left px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-700 border-b border-neutral-100 dark:border-neutral-700 last:border-0'
                    >
                      <div className='font-medium text-sm'>{org.name}</div>
                      {org.description && (
                        <div className='text-xs text-neutral-600 dark:text-neutral-400 mt-1'>
                          {org.description}
                        </div>
                      )}
                    </button>
                  ))}
                  <button
                    type='button'
                    onClick={handleCreateNew}
                    className='w-full text-left px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-primary-600 dark:text-primary-400 font-medium text-sm'
                  >
                    + Create new organization
                  </button>
                </div>
              )}

              {!searching &&
                searchQuery.length >= 2 &&
                searchResults.length === 0 &&
                showResults && (
                  <div className='absolute z-10 w-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg'>
                    <div className='px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400'>
                      No organizations found
                    </div>
                    <button
                      type='button'
                      onClick={handleCreateNew}
                      className='w-full text-left px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-primary-600 dark:text-primary-400 font-medium text-sm border-t border-neutral-100 dark:border-neutral-700'
                    >
                      + Create new organization
                    </button>
                  </div>
                )}
            </div>
          )}

          {/* New organization form */}
          {value.orgMode === 'new' && (
            <div className='space-y-3 pt-2'>
              <Input
                placeholder='Organization name *'
                value={value.new_partner_org?.name || ''}
                onChange={e =>
                  onChange({
                    ...value,
                    new_partner_org: {
                      ...value.new_partner_org!,
                      name: e.target.value,
                    },
                  })
                }
                required
              />
              <Input
                placeholder='Description (optional)'
                value={value.new_partner_org?.description || ''}
                onChange={e =>
                  onChange({
                    ...value,
                    new_partner_org: {
                      ...value.new_partner_org!,
                      description: e.target.value,
                    },
                  })
                }
              />
              <label className='flex items-center gap-2 text-sm cursor-pointer'>
                <input
                  type='checkbox'
                  checked={value.new_partner_org?.is_public || false}
                  onChange={e =>
                    onChange({
                      ...value,
                      new_partner_org: {
                        ...value.new_partner_org!,
                        is_public: e.target.checked,
                      },
                    })
                  }
                />
                <span>Make this organization public (others can find it)</span>
              </label>
              <button
                type='button'
                onClick={() => handleModeChange('existing')}
                className='text-sm text-primary-600 dark:text-primary-400 hover:underline'
              >
                ← Back to search
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PartnerOrgSelector;
