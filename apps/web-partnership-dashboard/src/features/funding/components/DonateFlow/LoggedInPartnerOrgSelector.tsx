import React from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { PartnerOrgDropdown } from './PartnerOrgDropdown';
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

type SelectionMode =
  | 'select'
  | 'individual'
  | 'my_orgs'
  | 'new_org_search'
  | 'new_org_create';

export const LoggedInPartnerOrgSelector: React.FC<
  LoggedInPartnerOrgSelectorProps
> = ({ flow: _flow, onDonorTypeSelected }) => {
  const [mode, setMode] = React.useState<SelectionMode>('select');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [individualOrg, setIndividualOrg] = React.useState<{
    id: string;
    name: string;
  } | null>(null);
  const [userOrgs, setUserOrgs] = React.useState<
    Array<{ id: string; name: string; description: string | null }>
  >([]);
  const [selectedOrgId, setSelectedOrgId] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<
    Array<{ id: string; name: string; description: string | null }>
  >([]);
  const [newOrgName, setNewOrgName] = React.useState('');
  const [newOrgDesc, setNewOrgDesc] = React.useState('');
  const [newOrgPublic, setNewOrgPublic] = React.useState(false);

  // Load user's individual org and linked orgs
  React.useEffect(() => {
    const loadUserOrgs = async () => {
      setLoading(true);
      try {
        const [individual, linked] = await Promise.all([
          findUserIndividualPartnerOrg(),
          fetchUserLinkedPartnerOrgs(),
        ]);

        if (individual) {
          setIndividualOrg({ id: individual.id, name: individual.name });
        }

        setUserOrgs(linked);
      } catch (err) {
        console.error('Error loading user orgs:', err);
        setError('Failed to load your organizations.');
      } finally {
        setLoading(false);
      }
    };

    if (mode === 'my_orgs' || mode === 'individual') {
      loadUserOrgs();
    }
  }, [mode]);

  // Search partner orgs
  React.useEffect(() => {
    const searchOrgs = async () => {
      if (!searchQuery || searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        const results = await searchPartnerOrgs(searchQuery, 10);
        setSearchResults(
          results.results.map(r => ({
            id: r.id,
            name: r.name,
            description: r.description,
          }))
        );
      } catch (err) {
        console.error('Error searching orgs:', err);
        setSearchResults([]);
      }
    };

    if (mode === 'new_org_search') {
      searchOrgs();
    }
  }, [searchQuery, mode]);

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

  const handleIndividualSelect = async () => {
    // Always use type 'individual' - the backend will handle finding/creating the individual org
    const donorDetails = await getDonorDetails();
    onDonorTypeSelected(
      {
        type: 'individual',
      },
      donorDetails
    );
  };

  const handleMyOrgSelect = async () => {
    if (!selectedOrgId) {
      setError('Please select an organization.');
      return;
    }

    const donorDetails = await getDonorDetails();
    onDonorTypeSelected(
      {
        type: 'partner_org',
        partnerOrgId: selectedOrgId,
      },
      donorDetails
    );
  };

  const handleSearchOrgSelect = async (orgId: string) => {
    const donorDetails = await getDonorDetails();
    onDonorTypeSelected(
      {
        type: 'partner_org',
        partnerOrgId: orgId,
      },
      donorDetails
    );
  };

  const handleCreateNewOrg = async () => {
    if (!newOrgName) {
      setError('Please enter an organization name.');
      return;
    }

    const donorDetails = await getDonorDetails();
    onDonorTypeSelected(
      {
        type: 'partner_org',
        newPartnerOrg: {
          name: newOrgName,
          description: newOrgDesc || undefined,
          isPublic: newOrgPublic,
        },
      },
      donorDetails
    );
  };

  if (mode === 'select') {
    return (
      <div className='space-y-4'>
        <div className='text-sm text-neutral-700 dark:text-neutral-300 mb-2 font-medium'>
          How would you like to donate?
        </div>
        <div className='space-y-2'>
          <Button
            variant='outline'
            className='w-full justify-start'
            onClick={() => setMode('individual')}>
            Donate as an individual
          </Button>
          <Button
            variant='outline'
            className='w-full justify-start'
            onClick={() => setMode('my_orgs')}>
            Donate on behalf of one of my partner organizations
          </Button>
          <Button
            variant='outline'
            className='w-full justify-start'
            onClick={() => setMode('new_org_search')}>
            Donate to a new partner org
          </Button>
        </div>
      </div>
    );
  }

  if (mode === 'individual') {
    return (
      <div className='space-y-4'>
        <Button variant='ghost' onClick={() => setMode('select')}>
          ← Back
        </Button>
        {loading ? (
          <div className='text-sm text-neutral-600 dark:text-neutral-400'>
            Loading...
          </div>
        ) : individualOrg ? (
          <div className='space-y-4'>
            <div className='text-sm text-neutral-600 dark:text-neutral-400'>
              You already have an individual partner org: {individualOrg.name}
            </div>
            <Button onClick={handleIndividualSelect} className='w-full'>
              Continue with {individualOrg.name}
            </Button>
          </div>
        ) : (
          <div className='space-y-4'>
            <div className='text-sm text-neutral-600 dark:text-neutral-400'>
              We'll create an individual partner org for you.
            </div>
            <Button onClick={handleIndividualSelect} className='w-full'>
              Continue
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'my_orgs') {
    return (
      <div className='space-y-4'>
        <Button variant='ghost' onClick={() => setMode('select')}>
          ← Back
        </Button>
        {loading ? (
          <div className='text-sm text-neutral-600 dark:text-neutral-400'>
            Loading...
          </div>
        ) : userOrgs.length === 0 ? (
          <div className='space-y-4'>
            <div className='text-sm text-neutral-600 dark:text-neutral-400'>
              You don't have any linked partner organizations yet.
            </div>
            <Button variant='outline' onClick={() => setMode('new_org_search')}>
              Create or find an organization
            </Button>
          </div>
        ) : (
          <div className='space-y-4'>
            <div className='text-sm text-neutral-700 dark:text-neutral-300 mb-2 font-medium'>
              Select organization
            </div>
            <PartnerOrgDropdown
              value={selectedOrgId}
              onChange={setSelectedOrgId}
              error={
                error && !selectedOrgId
                  ? 'Please select an organization.'
                  : undefined
              }
            />
            {error && <div className='text-sm text-error-600'>{error}</div>}
            <Button onClick={handleMyOrgSelect} className='w-full'>
              Continue
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'new_org_search') {
    return (
      <div className='space-y-4'>
        <Button variant='ghost' onClick={() => setMode('select')}>
          ← Back
        </Button>
        <div className='text-sm text-neutral-700 dark:text-neutral-300 mb-2 font-medium'>
          Search for an organization
        </div>
        <Input
          placeholder='Search organizations...'
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchResults.length > 0 && (
          <div className='space-y-2'>
            {searchResults.map(org => (
              <Button
                key={org.id}
                variant='outline'
                className='w-full justify-start'
                onClick={() => handleSearchOrgSelect(org.id)}>
                {org.name}
                {org.description && (
                  <span className='text-xs text-neutral-500 ml-2'>
                    {org.description}
                  </span>
                )}
              </Button>
            ))}
          </div>
        )}
        <div className='pt-2 border-t'>
          <Button
            variant='outline'
            className='w-full'
            onClick={() => setMode('new_org_create')}>
            Create new organization
          </Button>
        </div>
      </div>
    );
  }

  if (mode === 'new_org_create') {
    return (
      <div className='space-y-4'>
        <Button variant='ghost' onClick={() => setMode('new_org_search')}>
          ← Back
        </Button>
        <div className='text-sm text-neutral-700 dark:text-neutral-300 mb-2 font-medium'>
          Create new organization
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
        <label className='flex items-center space-x-2 cursor-pointer'>
          <input
            type='checkbox'
            checked={newOrgPublic}
            onChange={e => setNewOrgPublic(e.target.checked)}
            className='w-4 h-4 text-primary-600 focus:ring-primary-500 rounded'
          />
          <span className='text-sm text-neutral-700 dark:text-neutral-300'>
            Make organization publicly visible
          </span>
        </label>
        {error && <div className='text-sm text-error-600'>{error}</div>}
        <Button onClick={handleCreateNewOrg} className='w-full'>
          Continue
        </Button>
      </div>
    );
  }

  return null;
};
