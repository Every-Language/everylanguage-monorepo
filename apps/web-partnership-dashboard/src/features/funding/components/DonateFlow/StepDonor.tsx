import React from 'react';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { CustomPhoneInput } from '@/features/auth/components/CustomPhoneInput';
import { PartnerOrgDropdown } from './PartnerOrgDropdown';
import { LoggedInPartnerOrgSelector } from './LoggedInPartnerOrgSelector';
import { supabase } from '@/shared/services/supabase';
import { findAnonymousUserByContact } from '../../api/fundingApi';
import type { DonateFlow } from '../../hooks/useDonateFlow';

export const StepDonor: React.FC<{ flow: DonateFlow }> = ({ flow }) => {
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
  const [user, setUser] = React.useState<any | null>(null);
  const [isAnonymous, setIsAnonymous] = React.useState<boolean | null>(null);
  const [checkingAuth, setCheckingAuth] = React.useState(true);

  // Check auth status on mount
  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);
          setIsAnonymous(session.user.is_anonymous ?? false);
        } else {
          setIsAnonymous(null);
        }
      } catch (err) {
        console.error('Error checking auth:', err);
        setIsAnonymous(null);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsAnonymous(session.user.is_anonymous ?? false);
      } else {
        setUser(null);
        setIsAnonymous(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
      // For authenticated users (non-anonymous), skip anonymous user creation
      if (user && !isAnonymous) {
        // Set donor details (pre-fill from user if available)
        flow.setDonor({
          firstName: firstName || user.user_metadata?.first_name || '',
          lastName: lastName || user.user_metadata?.last_name || '',
          email: email || user.email || '',
          phone: phone || user.phone || '',
        });

        // Set donor type (handled by LoggedInPartnerOrgSelector)
        if (donorMode === 'individual') {
          flow.setDonorType({ type: 'individual' });
        } else if (donorMode === 'existing') {
          flow.setDonorType({ type: 'partner_org', partnerOrgId });
        } else {
          flow.setDonorType({
            type: 'partner_org',
            newPartnerOrg: {
              name: newOrgName,
              description: newOrgDesc,
              isPublic: newOrgPublic,
            },
          });
        }

        flow.setPaymentMethod('card');
        flow.next();
        return;
      }

      // For anonymous users or no session: ensure we have a session
      // 1. Check for existing session
      let session = await supabase.auth.getSession();

      // 2. If no session, check for existing user by contact info
      if (!session.data.session) {
        const existingUser = await findAnonymousUserByContact(
          email || undefined,
          phone || undefined
        );

        if (existingUser?.user_id) {
          if (existingUser.is_anonymous) {
            // Sign in with existing anonymous user
            // Note: We can't directly sign in with anonymous user credentials
            // Instead, we'll create a new anonymous user and let the backend handle deduplication
            // OR we could store the anonymous user's token somehow - but that's complex
            // For now, we'll create a new anonymous user and the RPC function will help prevent duplicates
          } else {
            // Existing authenticated user - show login prompt
            setError(
              'An account with this email already exists. Please sign in to continue.'
            );
            setLoading(false);
            return;
          }
        }

        // 3. Create anonymous user if no existing user found
        const { data: _signInData, error: signInError } =
          await supabase.auth.signInAnonymously();

        if (signInError) {
          setError('Failed to initialize session. Please try again.');
          setLoading(false);
          return;
        }

        // 4. Wait for session and verify access_token exists
        session = await supabase.auth.getSession();
        if (!session.data.session?.access_token) {
          setError('Session not available. Please refresh the page.');
          setLoading(false);
          return;
        }
      }

      // 5. Verify we have a valid session before proceeding
      if (!session.data.session?.access_token) {
        setError('Invalid session. Please refresh the page.');
        setLoading(false);
        return;
      }

      // Set donor details
      flow.setDonor({ firstName, lastName, email, phone });

      // Set donor type
      if (donorMode === 'individual') {
        flow.setDonorType({ type: 'individual' });
      } else if (donorMode === 'existing') {
        flow.setDonorType({ type: 'partner_org', partnerOrgId });
      } else {
        flow.setDonorType({
          type: 'partner_org',
          newPartnerOrg: {
            name: newOrgName,
            description: newOrgDesc,
            isPublic: newOrgPublic,
          },
        });
      }

      // Automatically set payment method to card and skip payment method selection step
      flow.setPaymentMethod('card');
      flow.next();
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking auth
  if (checkingAuth) {
    return (
      <div className='space-y-4'>
        <div className='text-sm text-neutral-600 dark:text-neutral-400'>
          Loading...
        </div>
      </div>
    );
  }

  // For authenticated users (non-anonymous), show different UI
  if (user && !isAnonymous) {
    return (
      <div className='space-y-4'>
        <div className='text-sm text-neutral-600 dark:text-neutral-400'>
          Welcome back
          {user.user_metadata?.first_name
            ? `, ${user.user_metadata.first_name}`
            : ''}
          !
        </div>
        <LoggedInPartnerOrgSelector
          flow={flow}
          onDonorTypeSelected={(donorType, donorDetails) => {
            // Set donor details if provided
            if (donorDetails) {
              flow.setDonor(donorDetails);
            }

            // Set donor type
            if (donorType.type === 'individual') {
              flow.setDonorType({ type: 'individual' });
            } else if (donorType.type === 'partner_org') {
              if (donorType.partnerOrgId) {
                flow.setDonorType({
                  type: 'partner_org',
                  partnerOrgId: donorType.partnerOrgId,
                });
              } else if (donorType.newPartnerOrg) {
                flow.setDonorType({
                  type: 'partner_org',
                  newPartnerOrg: donorType.newPartnerOrg,
                });
              }
            }

            // Automatically set payment method to card and proceed
            flow.setPaymentMethod('card');
            flow.next();
          }}
        />
      </div>
    );
  }

  // For anonymous users or no session, show donor details form
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
          <PartnerOrgDropdown
            value={partnerOrgId}
            onChange={setPartnerOrgId}
            error={
              error && donorMode === 'existing' && !partnerOrgId
                ? 'Please select an organization.'
                : undefined
            }
          />
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
