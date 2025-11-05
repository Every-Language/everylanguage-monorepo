import React from 'react';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { CustomPhoneInput } from '@/features/auth/components/CustomPhoneInput';
import { supabase } from '@/shared/services/supabase';

export const StepDonor: React.FC<{ flow: any }> = ({ flow }) => {
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [donorMode, setDonorMode] = React.useState<
    'individual' | 'existing' | 'new'
  >('individual');
  const [partnerOrgId, setPartnerOrgId] = React.useState('');
  const [newOrgName, setNewOrgName] = React.useState('');
  const [newOrgDesc, setNewOrgDesc] = React.useState('');
  const [newOrgPublic, setNewOrgPublic] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch partner orgs for dropdown
  const [partnerOrgs, setPartnerOrgs] = React.useState<
    Array<{ id: string; name: string }>
  >([]);

  React.useEffect(() => {
    if (donorMode === 'existing') {
      supabase
        .from('partner_orgs')
        .select('id, name')
        .eq('is_public', true)
        .order('name')
        .then(({ data }) => {
          if (data) setPartnerOrgs(data);
        });
    }
  }, [donorMode]);

  const handleSubmit = async () => {
    // Validation
    const emailValid = /.+@.+\..+/.test(email);
    if (!firstName || !lastName || !emailValid) {
      setError('Please enter first name, last name, and a valid email.');
      return;
    }

    if (donorMode === 'new' && !newOrgName) {
      setError('Please enter an organization name.');
      return;
    }

    if (donorMode === 'existing' && !partnerOrgId) {
      setError('Please select an organization.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Set donor details
      flow.setDonor({ firstName, lastName, email, phone });

      // Set donor type
      if (donorMode === 'individual') {
        flow.setDonorType({ type: 'individual' });
      } else if (donorMode === 'existing') {
        flow.setDonorType({ type: 'partner_org', partnerOrgId });
      } else {
        // new
        flow.setDonorType({
          type: 'partner_org',
          newPartnerOrg: {
            name: newOrgName,
            description: newOrgDesc,
            isPublic: newOrgPublic,
          },
        });
      }

      flow.next();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='space-y-4'>
      <div className='text-sm text-neutral-600 dark:text-neutral-400'>
        Your details
      </div>

      {/* Donor Details */}
      <div className='space-y-3'>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
          <Input
            placeholder='First name'
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
          />
          <Input
            placeholder='Last name'
            value={lastName}
            onChange={e => setLastName(e.target.value)}
          />
          <div className='sm:col-span-2'>
            <Input
              placeholder='Email'
              type='email'
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className='sm:col-span-2'>
            <CustomPhoneInput value={phone} onChange={v => setPhone(v || '')} />
          </div>
        </div>
      </div>

      {/* Donor Type Selection */}
      <div className='pt-2'>
        <label className='text-sm text-neutral-700 dark:text-neutral-300 mb-2 block font-medium'>
          Donating as
        </label>
        <div className='space-y-2'>
          <label className='flex items-center space-x-3 cursor-pointer'>
            <input
              type='radio'
              name='donor-mode'
              value='individual'
              checked={donorMode === 'individual'}
              onChange={() => setDonorMode('individual')}
              className='w-4 h-4 text-primary-600 focus:ring-primary-500'
            />
            <span className='text-sm text-neutral-900 dark:text-neutral-100'>
              An individual
            </span>
          </label>
          <label className='flex items-center space-x-3 cursor-pointer'>
            <input
              type='radio'
              name='donor-mode'
              value='existing'
              checked={donorMode === 'existing'}
              onChange={() => setDonorMode('existing')}
              className='w-4 h-4 text-primary-600 focus:ring-primary-500'
            />
            <span className='text-sm text-neutral-900 dark:text-neutral-100'>
              An existing organization
            </span>
          </label>
          <label className='flex items-center space-x-3 cursor-pointer'>
            <input
              type='radio'
              name='donor-mode'
              value='new'
              checked={donorMode === 'new'}
              onChange={() => setDonorMode('new')}
              className='w-4 h-4 text-primary-600 focus:ring-primary-500'
            />
            <span className='text-sm text-neutral-900 dark:text-neutral-100'>
              A new organization
            </span>
          </label>
        </div>
      </div>

      {/* Existing org selector */}
      {donorMode === 'existing' && (
        <div className='space-y-2'>
          <label className='text-sm text-neutral-700 dark:text-neutral-300 block font-medium'>
            Select organization
          </label>
          <select
            className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
            value={partnerOrgId}
            onChange={e => setPartnerOrgId(e.target.value)}
          >
            <option value=''>-- Select --</option>
            {partnerOrgs.map(org => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* New org form */}
      {donorMode === 'new' && (
        <div className='space-y-3'>
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
              id='org-public'
              checked={newOrgPublic}
              onChange={e => setNewOrgPublic(e.target.checked)}
              className='w-4 h-4 text-primary-600 focus:ring-primary-500 rounded'
            />
            <span className='text-sm text-neutral-700 dark:text-neutral-300'>
              Make organization publicly visible
            </span>
          </label>
        </div>
      )}

      {error && <div className='text-sm text-error-600'>{error}</div>}

      <div className='pt-2 flex justify-end'>
        <Button onClick={handleSubmit} loading={loading}>
          Continue
        </Button>
      </div>
    </div>
  );
};

export default StepDonor;
