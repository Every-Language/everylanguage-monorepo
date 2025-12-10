import React from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/Radio';
import { searchPartnerOrgs } from '../../api/fundingApi';
import { PartnerOrgCard } from './LoggedInPartnerOrgSelector';

interface AnonymousPartnerOrgSelectorProps {
  donorType: 'individual' | 'organization' | null;
  onDonorTypeChange: (type: 'individual' | 'organization' | null) => void;
  selectedOrgId: string | null;
  onOrgSelect: (org: {
    id: string;
    name: string;
    description: string | null;
    isNew?: boolean;
  }) => void;
  newOrgName: string;
  onNewOrgNameChange: (name: string) => void;
  newOrgDesc: string;
  onNewOrgDescChange: (desc: string) => void;
  newOrgPublic: boolean;
  onNewOrgPublicChange: (isPublic: boolean) => void;
}

interface TransientOrg {
  id: string;
  name: string;
  description: string | null;
  isNew?: boolean;
}

export const AnonymousPartnerOrgSelector: React.FC<
  AnonymousPartnerOrgSelectorProps
> = ({
  donorType,
  onDonorTypeChange,
  selectedOrgId,
  onOrgSelect,
  newOrgName,
  onNewOrgNameChange,
  newOrgDesc,
  onNewOrgDescChange,
  newOrgPublic,
  onNewOrgPublicChange,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<
    Array<{ id: string; name: string; description: string | null }>
  >([]);
  const [searching, setSearching] = React.useState(false);
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [transientOrgs, setTransientOrgs] = React.useState<TransientOrg[]>([]);

  // Search partner orgs when query changes
  React.useEffect(() => {
    const searchOrgs = async () => {
      if (!searchQuery || searchQuery.length < 2) {
        setSearchResults([]);
        setShowCreateForm(false);
        return;
      }

      setSearching(true);
      try {
        const results = await searchPartnerOrgs(searchQuery, 10, true); // excludeIndividual = true
        setSearchResults(results.results);
        setShowCreateForm(results.results.length === 0);
      } catch (err) {
        console.error('Error searching orgs:', err);
        setSearchResults([]);
        setShowCreateForm(true); // Show create form on error too
      } finally {
        setSearching(false);
      }
    };

    if (donorType === 'organization') {
      searchOrgs();
    }
  }, [searchQuery, donorType]);

  const handleCreateNewOrg = () => {
    if (!newOrgName.trim()) {
      return;
    }

    // Create transient org (will be created in backend during donation)
    const transientOrg: TransientOrg = {
      id: `temp-${Date.now()}`, // Temporary ID
      name: newOrgName.trim(),
      description: newOrgDesc.trim() || null,
      isNew: true,
    };

    setTransientOrgs([...transientOrgs, transientOrg]);
    onOrgSelect(transientOrg);
    setSearchQuery('');
    setShowCreateForm(false);
    // Note: Don't clear newOrgName/Desc here - they're needed for the donation submission
  };

  // Get all orgs to display (search results + transient orgs)
  const allOrgs = [...searchResults, ...transientOrgs];

  return (
    <div className='space-y-4'>
      <div className='text-sm text-neutral-700 dark:text-neutral-300 mb-2 font-medium'>
        Donating as
      </div>

      <RadioGroup
        value={donorType || ''}
        onValueChange={value =>
          onDonorTypeChange(value as 'individual' | 'organization' | null)
        }>
        <RadioGroupItem
          value='individual'
          id='donate-individual-anon'
          label='An individual'
        />
        <RadioGroupItem
          value='organization'
          id='donate-organization-anon'
          label='An organization'
        />
      </RadioGroup>

      {/* Organization donation section */}
      {donorType === 'organization' && (
        <div className='space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-700'>
          {/* Search input */}
          <Input
            placeholder='Search organizations...'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            autoFocus
          />

          {searching && (
            <div className='text-sm text-neutral-600 dark:text-neutral-400'>
              Searching...
            </div>
          )}

          {/* Search results and selected orgs */}
          {!searching && allOrgs.length > 0 && (
            <div className='space-y-3 max-h-64 overflow-y-auto'>
              {allOrgs.map(org => (
                <PartnerOrgCard
                  key={org.id}
                  org={org}
                  isSelected={selectedOrgId === org.id}
                  onClick={() => onOrgSelect(org)}
                />
              ))}
            </div>
          )}

          {/* Create new org form (shown only when search was performed and no results) */}
          {!searching &&
            showCreateForm &&
            searchQuery.length >= 2 &&
            searchResults.length === 0 && (
              <div className='space-y-3 pt-2 border-t border-neutral-200 dark:border-neutral-700'>
                <div className='text-sm text-neutral-600 dark:text-neutral-400'>
                  No organizations found. Create a new one?
                </div>
                <Input
                  placeholder='Organization name'
                  value={newOrgName}
                  onChange={e => onNewOrgNameChange(e.target.value)}
                />
                <textarea
                  placeholder='Description (optional)'
                  className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm'
                  rows={3}
                  value={newOrgDesc}
                  onChange={e => onNewOrgDescChange(e.target.value)}
                />
                <label className='flex items-center space-x-2 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={newOrgPublic}
                    onChange={e => onNewOrgPublicChange(e.target.checked)}
                    className='w-4 h-4 text-primary-600 focus:ring-primary-500 rounded'
                  />
                  <span className='text-sm text-neutral-700 dark:text-neutral-300'>
                    Make organization publicly visible
                  </span>
                </label>
                {newOrgName.trim() && (
                  <Button
                    onClick={handleCreateNewOrg}
                    variant='outline'
                    className='w-full'>
                    Create and select
                  </Button>
                )}
              </div>
            )}
        </div>
      )}
    </div>
  );
};
