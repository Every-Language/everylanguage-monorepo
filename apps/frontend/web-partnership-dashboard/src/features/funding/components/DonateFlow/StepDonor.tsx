import React from 'react';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { CustomPhoneInput } from '@/features/auth/components/CustomPhoneInput';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/RadioGroup';
import { Label } from '@/shared/components/ui/Label';
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
        <Label className='text-sm mb-2 block'>Donating as</Label>
        <RadioGroup
          value={donorMode}
          onValueChange={(v: any) => setDonorMode(v)}
        >
          <div className='flex items-center space-x-2'>
            <RadioGroupItem value='individual' id='individual' />
            <Label htmlFor='individual' className='cursor-pointer'>
              An individual
            </Label>
          </div>
          <div className='flex items-center space-x-2'>
            <RadioGroupItem value='existing' id='existing' />
            <Label htmlFor='existing' className='cursor-pointer'>
              An existing organization
            </Label>
          </div>
          <div className='flex items-center space-x-2'>
            <RadioGroupItem value='new' id='new' />
            <Label htmlFor='new' className='cursor-pointer'>
              A new organization
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Existing org selector */}
      {donorMode === 'existing' && (
        <div className='space-y-2'>
          <Label>Select organization</Label>
          <select
            className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800'
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
            className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-sm'
            rows={3}
            value={newOrgDesc}
            onChange={e => setNewOrgDesc(e.target.value)}
          />
          <div className='flex items-center space-x-2'>
            <input
              type='checkbox'
              id='org-public'
              checked={newOrgPublic}
              onChange={e => setNewOrgPublic(e.target.checked)}
            />
            <Label htmlFor='org-public' className='cursor-pointer text-sm'>
              Make organization publicly visible
            </Label>
          </div>
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
