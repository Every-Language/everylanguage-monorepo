import React from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/Radio';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/Dialog';
import {
  fetchUserLinkedPartnerOrgs,
  findUserIndividualPartnerOrg,
} from '../../api/partnerOrgsApi';
import { searchPartnerOrgs } from '../../api/fundingApi';
import { supabase } from '@/shared/services/supabase';
import type { DonateFlow } from '../../hooks/useDonateFlow';

interface LoggedInPartnerOrgSelectorProps {
  flow: DonateFlow;
  onDonorTypeSelected: (
    donorType: {
      type: 'individual' | 'partner_org';
      partnerOrgId?: string;
      newPartnerOrg?: {
        name: string;
        description?: string;
        isPublic: boolean;
      };
    },
    donorDetails?: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
    }
  ) => void;
}

type DonationType = 'individual' | 'organization' | null;

interface TransientOrg {
  id: string;
  name: string;
  description: string | null;
  isNew?: boolean;
}

export interface PartnerOrgCardProps {
  org: {
    id: string;
    name: string;
    description: string | null;
    isNew?: boolean;
  };
  isSelected: boolean;
  onClick: () => void;
}

export const PartnerOrgCard: React.FC<PartnerOrgCardProps> = ({
  org,
  isSelected,
  onClick,
}) => {
  return (
    <button
      type='button'
      onClick={onClick}
      className={`group text-left w-full bg-white dark:bg-neutral-800 rounded-lg p-6 border transition-all duration-200 ${
        isSelected
          ? 'border-primary-500 dark:border-primary-400 shadow-md'
          : 'border-neutral-200 dark:border-neutral-700 shadow-sm hover:shadow-md hover:border-primary-500 dark:hover:border-primary-400 hover:-translate-y-0.5'
      }`}>
      <div className='flex items-start justify-between'>
        <div className='flex-1'>
          <h3 className='font-semibold text-lg text-neutral-900 dark:text-neutral-100'>
            {org.name}
          </h3>
          {org.description && (
            <p className='text-sm text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed'>
              {org.description}
            </p>
          )}
          {org.isNew && (
            <span className='inline-block mt-2 text-xs text-primary-600 dark:text-primary-400'>
              New organization
            </span>
          )}
        </div>
        {isSelected && (
          <div className='ml-4'>
            <div className='h-5 w-5 rounded-full bg-primary-600 dark:bg-primary-500 flex items-center justify-center'>
              <svg
                className='h-3 w-3 text-white'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M5 13l4 4L19 7'
                />
              </svg>
            </div>
          </div>
        )}
      </div>
    </button>
  );
};

export const LoggedInPartnerOrgSelector: React.FC<
  LoggedInPartnerOrgSelectorProps
> = ({ flow: _flow, onDonorTypeSelected }) => {
  const [donationType, setDonationType] = React.useState<DonationType>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [individualOrg, setIndividualOrg] = React.useState<{
    id: string;
    name: string;
  } | null>(null);
  const [userOrgs, setUserOrgs] = React.useState<
    Array<{
      id: string;
      name: string;
      description: string | null;
      isNew?: boolean;
    }>
  >([]);
  const [selectedOrgId, setSelectedOrgId] = React.useState<string | null>(null);
  const [transientOrgs, setTransientOrgs] = React.useState<TransientOrg[]>([]);

  // Search popup state
  const [showSearchPopup, setShowSearchPopup] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<
    Array<{ id: string; name: string; description: string | null }>
  >([]);
  const [searching, setSearching] = React.useState(false);
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [newOrgName, setNewOrgName] = React.useState('');
  const [newOrgDesc, setNewOrgDesc] = React.useState('');
  const [creatingOrg, setCreatingOrg] = React.useState(false);

  // Load user's individual org and linked orgs when organization type is selected
  React.useEffect(() => {
    const loadUserOrgs = async () => {
      if (donationType !== 'organization') return;

      setLoading(true);
      try {
        const [individual, linked] = await Promise.all([
          findUserIndividualPartnerOrg(),
          fetchUserLinkedPartnerOrgs(),
        ]);

        if (individual) {
          setIndividualOrg({ id: individual.id, name: individual.name });
        }

        // Filter out individual orgs from linked orgs
        const nonIndividualOrgs = linked.filter(org => !org.is_individual);
        setUserOrgs(nonIndividualOrgs);
      } catch (err) {
        console.error('Error loading user orgs:', err);
        setError('Failed to load your organizations.');
      } finally {
        setLoading(false);
      }
    };

    loadUserOrgs();
  }, [donationType]);

  // Search partner orgs when query changes
  React.useEffect(() => {
    const searchOrgs = async () => {
      if (!searchQuery || searchQuery.length < 2) {
        setSearchResults([]);
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

    if (showSearchPopup) {
      searchOrgs();
    }
  }, [searchQuery, showSearchPopup]);

  const getDonorDetails = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      return {
        firstName: user.user_metadata?.first_name || '',
        lastName: user.user_metadata?.last_name || '',
        email: user.email || '',
        phone: user.phone || undefined,
      };
    }
    return undefined;
  };

  const handleIndividualContinue = async () => {
    setLoading(true);
    try {
      const donorDetails = await getDonorDetails();
      onDonorTypeSelected(
        {
          type: 'individual',
        },
        donorDetails
      );
      // Automatically proceed to payment details step (step 4)
      // This is handled in StepDonor.tsx after onDonorTypeSelected
    } catch (err) {
      console.error('Error handling individual donation:', err);
      setError('Failed to proceed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOrgSelect = (orgId: string) => {
    setSelectedOrgId(orgId);
  };

  const handleAddOrgClick = () => {
    setShowSearchPopup(true);
    setSearchQuery('');
    setSearchResults([]);
    setShowCreateForm(false);
  };

  const handleSearchOrgSelect = (org: {
    id: string;
    name: string;
    description: string | null;
  }) => {
    // Add to transient orgs list if not already there
    if (!transientOrgs.find(o => o.id === org.id)) {
      setTransientOrgs([...transientOrgs, { ...org, isNew: false }]);
    }
    setSelectedOrgId(org.id);
    setShowSearchPopup(false);
    setSearchQuery('');
  };

  const handleCreateNewOrg = async () => {
    if (!newOrgName.trim()) {
      setError('Please enter an organization name.');
      return;
    }

    setCreatingOrg(true);
    try {
      // Create transient org (will be created in backend during donation)
      const transientOrg: TransientOrg = {
        id: `temp-${Date.now()}`, // Temporary ID
        name: newOrgName.trim(),
        description: newOrgDesc.trim() || null,
        isNew: true,
      };

      setTransientOrgs([...transientOrgs, transientOrg]);
      setSelectedOrgId(transientOrg.id);
      setShowSearchPopup(false);
      setSearchQuery('');
      setNewOrgName('');
      setNewOrgDesc('');
      setShowCreateForm(false);
    } catch (err) {
      console.error('Error creating org:', err);
      setError('Failed to create organization. Please try again.');
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleOrgContinue = async () => {
    if (!selectedOrgId) {
      setError('Please select an organization.');
      return;
    }

    setLoading(true);
    try {
      const donorDetails = await getDonorDetails();

      // Find the selected org (either from userOrgs or transientOrgs)
      const selectedOrg = [...userOrgs, ...transientOrgs].find(
        org => org.id === selectedOrgId
      );

      if (!selectedOrg) {
        throw new Error('Selected organization not found');
      }

      // If it's a new transient org, pass newPartnerOrg
      if (selectedOrg.isNew) {
        onDonorTypeSelected(
          {
            type: 'partner_org',
            newPartnerOrg: {
              name: selectedOrg.name,
              description: selectedOrg.description || undefined,
              isPublic: false, // Default to false for new orgs
            },
          },
          donorDetails
        );
      } else {
        // Existing org
        onDonorTypeSelected(
          {
            type: 'partner_org',
            partnerOrgId: selectedOrgId,
          },
          donorDetails
        );
      }
    } catch (err) {
      console.error('Error handling org donation:', err);
      setError('Failed to proceed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get all orgs to display (user's linked orgs + transient orgs)
  const allOrgs = [...userOrgs, ...transientOrgs];

  return (
    <div className='space-y-4'>
      <div className='text-sm text-neutral-700 dark:text-neutral-300 mb-4 font-medium'>
        How would you like to donate?
      </div>

      <RadioGroup
        value={donationType || ''}
        onValueChange={value => setDonationType(value as DonationType)}>
        <RadioGroupItem
          value='individual'
          id='donate-individual'
          label='Donate as an individual'
        />
        <RadioGroupItem
          value='organization'
          id='donate-organization'
          label='Donate on behalf of an organization'
        />
      </RadioGroup>

      {/* Individual donation section */}
      {donationType === 'individual' && (
        <div className='space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-700'>
          {loading ? (
            <div className='text-sm text-neutral-600 dark:text-neutral-400'>
              Loading...
            </div>
          ) : (
            <div className='space-y-4'>
              {individualOrg ? (
                <div className='text-sm text-neutral-600 dark:text-neutral-400'>
                  We'll use your existing individual partner org:{' '}
                  {individualOrg.name}
                </div>
              ) : (
                <div className='text-sm text-neutral-600 dark:text-neutral-400'>
                  We'll create an individual partner org for you.
                </div>
              )}
              <Button
                onClick={handleIndividualContinue}
                className='w-full'
                disabled={loading}>
                Continue
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Organization donation section */}
      {donationType === 'organization' && (
        <div className='space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-700'>
          {loading ? (
            <div className='text-sm text-neutral-600 dark:text-neutral-400'>
              Loading...
            </div>
          ) : (
            <>
              {/* Organization cards */}
              {allOrgs.length > 0 && (
                <div className='space-y-3'>
                  {allOrgs.map(org => (
                    <PartnerOrgCard
                      key={org.id}
                      org={org}
                      isSelected={selectedOrgId === org.id}
                      onClick={() => handleOrgSelect(org.id)}
                    />
                  ))}
                </div>
              )}

              {/* Add partner organization button */}
              <Button
                variant='outline'
                className='w-full'
                onClick={handleAddOrgClick}>
                + Add partner organization
              </Button>

              {/* Continue button */}
              {selectedOrgId && (
                <Button
                  onClick={handleOrgContinue}
                  className='w-full'
                  disabled={loading}>
                  Continue
                </Button>
              )}

              {error && <div className='text-sm text-error-600'>{error}</div>}
            </>
          )}
        </div>
      )}

      {/* Search popup */}
      <Dialog open={showSearchPopup} onOpenChange={setShowSearchPopup}>
        <DialogContent size='md'>
          <DialogTitle>Search for an organization</DialogTitle>
          <DialogDescription>
            Search for public partner organizations to donate on behalf of.
          </DialogDescription>

          <div className='space-y-4'>
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

            {/* Search results */}
            {!searching && searchResults.length > 0 && (
              <div className='space-y-3 max-h-64 overflow-y-auto'>
                {searchResults.map(org => (
                  <PartnerOrgCard
                    key={org.id}
                    org={org}
                    isSelected={false}
                    onClick={() => handleSearchOrgSelect(org)}
                  />
                ))}
              </div>
            )}

            {/* Create new org form (shown when no results) */}
            {!searching && showCreateForm && (
              <div className='space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-700'>
                <div className='text-sm text-neutral-600 dark:text-neutral-400'>
                  No organizations found. Create a new one?
                </div>
                <Input
                  placeholder='Organization name'
                  value={newOrgName}
                  onChange={e => setNewOrgName(e.target.value)}
                />
                <textarea
                  placeholder='Description (optional)'
                  className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm'
                  rows={3}
                  value={newOrgDesc}
                  onChange={e => setNewOrgDesc(e.target.value)}
                />
                <Button
                  onClick={handleCreateNewOrg}
                  className='w-full'
                  disabled={creatingOrg || !newOrgName.trim()}>
                  {creatingOrg ? 'Creating...' : 'Create and select'}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
