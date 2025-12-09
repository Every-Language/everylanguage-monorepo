import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { donationsApi } from '../api/donationsApi';
import { usersApi } from '../../users/api/usersApi';
import { languagesApi } from '../../languages/api/languagesApi';
import { regionsApi } from '../../regions/api/regionsApi';
import { X } from 'lucide-react';
import { Select, SelectItem } from '@everylanguage/shared-ui';
import type { Database } from '@everylanguage/shared-types';

type DonationIntentType = Database['public']['Enums']['donation_intent_type'];
type DonationStatus = Database['public']['Enums']['donation_status'];
type PaymentMethodType = Database['public']['Enums']['payment_method_type'];

const INTENT_TYPES: DonationIntentType[] = [
  'language',
  'region',
  'operation',
  'unrestricted',
];

const STATUS_OPTIONS: DonationStatus[] = [
  'draft',
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
];

const PAYMENT_METHODS: PaymentMethodType[] = [
  'card',
  'us_bank_account',
  'sepa_debit',
];

const CURRENCY_CODES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];

interface AddDonationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AddDonationModal({
  onClose,
  onSuccess,
}: AddDonationModalProps) {
  // Form state
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [partnerOrgId, setPartnerOrgId] = useState('');
  const [partnerOrgName, setPartnerOrgName] = useState('');
  const [intentType, setIntentType] =
    useState<DonationIntentType>('unrestricted');
  const [intentEntityId, setIntentEntityId] = useState('');
  const [intentEntityName, setIntentEntityName] = useState('');
  const [amount, setAmount] = useState('');
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [status, setStatus] = useState<DonationStatus>('completed');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('card');
  const [isRecurring, setIsRecurring] = useState(false);

  // Search state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [partnerOrgSearchQuery, setPartnerOrgSearchQuery] = useState('');
  const [intentSearchQuery, setIntentSearchQuery] = useState('');
  const [debouncedUserSearch, setDebouncedUserSearch] = useState('');
  const [debouncedPartnerOrgSearch, setDebouncedPartnerOrgSearch] =
    useState('');
  const [debouncedIntentSearch, setDebouncedIntentSearch] = useState('');

  // Debounce search queries
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUserSearch(userSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPartnerOrgSearch(partnerOrgSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [partnerOrgSearchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedIntentSearch(intentSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [intentSearchQuery]);

  // Clear intent selection when intent type changes
  useEffect(() => {
    setIntentEntityId('');
    setIntentEntityName('');
    setIntentSearchQuery('');
    setDebouncedIntentSearch('');
  }, [intentType]);

  // Search queries
  const { data: userSearchResults = [] } = useQuery({
    queryKey: ['users-search', debouncedUserSearch],
    queryFn: () => usersApi.searchUsers(debouncedUserSearch),
    enabled: debouncedUserSearch.length >= 2,
  });

  const { data: partnerOrgSearchResults = [] } = useQuery({
    queryKey: ['partner-orgs-search', debouncedPartnerOrgSearch],
    queryFn: () => usersApi.searchPartnerOrgs(debouncedPartnerOrgSearch),
    enabled: debouncedPartnerOrgSearch.length >= 2,
  });

  const { data: languageSearchResults = [] } = useQuery({
    queryKey: ['languages-search', debouncedIntentSearch],
    queryFn: () => languagesApi.searchLanguageEntities(debouncedIntentSearch),
    enabled: intentType === 'language' && debouncedIntentSearch.length >= 2,
  });

  const { data: regionSearchResults = [] } = useQuery({
    queryKey: ['regions-search', debouncedIntentSearch],
    queryFn: () => regionsApi.searchRegions(debouncedIntentSearch),
    enabled: intentType === 'region' && debouncedIntentSearch.length >= 2,
  });

  const { data: operationSearchResults = [] } = useQuery({
    queryKey: ['operations-search', debouncedIntentSearch],
    queryFn: () => donationsApi.searchOperations(debouncedIntentSearch),
    enabled: intentType === 'operation' && debouncedIntentSearch.length >= 2,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const amountCents = Math.round(parseFloat(amount) * 100);

      return donationsApi.createDonation({
        user_id: userId,
        partner_org_id: partnerOrgId,
        intent_type: intentType,
        intent_language_entity_id:
          intentType === 'language' ? intentEntityId : undefined,
        intent_region_id: intentType === 'region' ? intentEntityId : undefined,
        intent_operation_id:
          intentType === 'operation' ? intentEntityId : undefined,
        amount_cents: amountCents,
        currency_code: currencyCode,
        status,
        payment_method: paymentMethod,
        is_recurring: isRecurring,
      });
    },
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!userId) {
      alert('Please select a user');
      return;
    }

    if (!partnerOrgId) {
      alert('Please select a partner organization');
      return;
    }

    if (!intentType) {
      alert('Please select an intent type');
      return;
    }

    if (
      intentType !== 'unrestricted' &&
      (!intentEntityId || !intentEntityName)
    ) {
      alert(`Please select a ${intentType}`);
      return;
    }

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }

    createMutation.mutate();
  };

  const formatIntentType = (type: DonationIntentType): string => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className='fixed inset-0 z-50 overflow-y-auto'>
      <div className='flex min-h-screen items-center justify-center p-4'>
        {/* Backdrop */}
        <div
          className='fixed inset-0 bg-black/50 transition-opacity'
          onClick={onClose}
        />

        {/* Modal */}
        <div className='relative bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto'>
          {/* Header */}
          <div className='flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 bg-white dark:bg-neutral-900 z-10'>
            <h2 className='text-xl font-semibold text-neutral-900 dark:text-neutral-100'>
              Add Manual Donation
            </h2>
            <button
              onClick={onClose}
              className='p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'>
              <X className='h-5 w-5 text-neutral-500 dark:text-neutral-400' />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className='p-6 space-y-4'>
            {/* User Selector */}
            <div>
              <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                User <span className='text-red-500'>*</span>
              </label>
              {userId ? (
                <div className='flex items-center justify-between px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800'>
                  <span className='text-sm text-neutral-900 dark:text-neutral-100'>
                    {userName}
                  </span>
                  <button
                    type='button'
                    onClick={() => {
                      setUserId('');
                      setUserName('');
                    }}
                    className='text-xs text-primary-600 dark:text-primary-400 hover:underline'>
                    Clear
                  </button>
                </div>
              ) : (
                <div className='relative'>
                  <input
                    type='text'
                    value={userSearchQuery}
                    onChange={e => setUserSearchQuery(e.target.value)}
                    placeholder='Search by name or email...'
                    className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                  />
                  {debouncedUserSearch.length >= 2 && (
                    <div className='absolute z-20 w-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                      {userSearchResults.length === 0 ? (
                        <div className='px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400'>
                          No users found
                        </div>
                      ) : (
                        userSearchResults.map(user => (
                          <button
                            key={user.id}
                            type='button'
                            onClick={() => {
                              setUserId(user.id);
                              setUserName(
                                user.name +
                                  (user.description
                                    ? ` (${user.description})`
                                    : '')
                              );
                              setUserSearchQuery('');
                            }}
                            className='w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100'>
                            <div className='font-medium'>{user.name}</div>
                            {user.description && (
                              <div className='text-xs text-neutral-500 dark:text-neutral-400'>
                                {user.description}
                              </div>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Partner Org Selector */}
            <div>
              <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                Partner Organization <span className='text-red-500'>*</span>
              </label>
              {partnerOrgId ? (
                <div className='flex items-center justify-between px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800'>
                  <span className='text-sm text-neutral-900 dark:text-neutral-100'>
                    {partnerOrgName}
                  </span>
                  <button
                    type='button'
                    onClick={() => {
                      setPartnerOrgId('');
                      setPartnerOrgName('');
                    }}
                    className='text-xs text-primary-600 dark:text-primary-400 hover:underline'>
                    Clear
                  </button>
                </div>
              ) : (
                <div className='relative'>
                  <input
                    type='text'
                    value={partnerOrgSearchQuery}
                    onChange={e => setPartnerOrgSearchQuery(e.target.value)}
                    placeholder='Search partner organizations...'
                    className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                  />
                  {debouncedPartnerOrgSearch.length >= 2 && (
                    <div className='absolute z-20 w-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                      {partnerOrgSearchResults.length === 0 ? (
                        <div className='px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400'>
                          No organizations found
                        </div>
                      ) : (
                        partnerOrgSearchResults.map(org => (
                          <button
                            key={org.id}
                            type='button'
                            onClick={() => {
                              setPartnerOrgId(org.id);
                              setPartnerOrgName(
                                org.name +
                                  (org.description
                                    ? ` - ${org.description}`
                                    : '')
                              );
                              setPartnerOrgSearchQuery('');
                            }}
                            className='w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100'>
                            <div className='font-medium'>{org.name}</div>
                            {org.description && (
                              <div className='text-xs text-neutral-500 dark:text-neutral-400'>
                                {org.description}
                              </div>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Intent Type */}
            <Select
              label='Intent Type'
              value={intentType}
              onValueChange={value =>
                setIntentType(value as DonationIntentType)
              }
              required>
              {INTENT_TYPES.map(type => (
                <SelectItem key={type} value={type}>
                  {formatIntentType(type)}
                </SelectItem>
              ))}
            </Select>

            {/* Intent Entity Selector (conditional) */}
            {intentType !== 'unrestricted' && (
              <div>
                <label className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                  {formatIntentType(intentType)}{' '}
                  <span className='text-red-500'>*</span>
                </label>
                {intentEntityId ? (
                  <div className='flex items-center justify-between px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800'>
                    <span className='text-sm text-neutral-900 dark:text-neutral-100'>
                      {intentEntityName}
                    </span>
                    <button
                      type='button'
                      onClick={() => {
                        setIntentEntityId('');
                        setIntentEntityName('');
                      }}
                      className='text-xs text-primary-600 dark:text-primary-400 hover:underline'>
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className='relative'>
                    <input
                      type='text'
                      value={intentSearchQuery}
                      onChange={e => setIntentSearchQuery(e.target.value)}
                      placeholder={`Search ${intentType}s...`}
                      className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                    />
                    {debouncedIntentSearch.length >= 2 && (
                      <div className='absolute z-20 w-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                        {intentType === 'language' &&
                          (languageSearchResults.length === 0 ? (
                            <div className='px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400'>
                              No languages found
                            </div>
                          ) : (
                            languageSearchResults.map(lang => (
                              <button
                                key={lang.id}
                                type='button'
                                onClick={() => {
                                  setIntentEntityId(lang.id);
                                  setIntentEntityName(
                                    `${lang.name} (${lang.level})`
                                  );
                                  setIntentSearchQuery('');
                                }}
                                className='w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100'>
                                {lang.name}{' '}
                                <span className='text-xs text-neutral-500 dark:text-neutral-400'>
                                  ({lang.level})
                                </span>
                              </button>
                            ))
                          ))}
                        {intentType === 'region' &&
                          (regionSearchResults.length === 0 ? (
                            <div className='px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400'>
                              No regions found
                            </div>
                          ) : (
                            regionSearchResults.map(region => (
                              <button
                                key={region.id}
                                type='button'
                                onClick={() => {
                                  setIntentEntityId(region.id);
                                  setIntentEntityName(
                                    `${region.name} (${region.level})`
                                  );
                                  setIntentSearchQuery('');
                                }}
                                className='w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100'>
                                {region.name}{' '}
                                <span className='text-xs text-neutral-500 dark:text-neutral-400'>
                                  ({region.level})
                                </span>
                              </button>
                            ))
                          ))}
                        {intentType === 'operation' &&
                          (operationSearchResults.length === 0 ? (
                            <div className='px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400'>
                              No operations found
                            </div>
                          ) : (
                            operationSearchResults.map(op => (
                              <button
                                key={op.id}
                                type='button'
                                onClick={() => {
                                  setIntentEntityId(op.id);
                                  setIntentEntityName(
                                    `${op.name} (${op.category})`
                                  );
                                  setIntentSearchQuery('');
                                }}
                                className='w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100'>
                                {op.name}{' '}
                                <span className='text-xs text-neutral-500 dark:text-neutral-400'>
                                  ({op.category})
                                </span>
                              </button>
                            ))
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Amount */}
            <div>
              <label
                htmlFor='amount'
                className='block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1'>
                Amount <span className='text-red-500'>*</span>
              </label>
              <input
                id='amount'
                type='number'
                step='0.01'
                min='0.01'
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                className='w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500'
                placeholder='e.g., 100.00'
              />
            </div>

            {/* Currency Code */}
            <Select
              label='Currency'
              value={currencyCode}
              onValueChange={value => setCurrencyCode(value)}
              required>
              {CURRENCY_CODES.map(code => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </Select>

            {/* Status */}
            <Select
              label='Status'
              value={status}
              onValueChange={value => setStatus(value as DonationStatus)}
              required>
              {STATUS_OPTIONS.map(stat => (
                <SelectItem key={stat} value={stat}>
                  {stat.charAt(0).toUpperCase() + stat.slice(1)}
                </SelectItem>
              ))}
            </Select>

            {/* Payment Method */}
            <Select
              label='Payment Method'
              value={paymentMethod}
              onValueChange={value =>
                setPaymentMethod(value as PaymentMethodType)
              }
              required>
              {PAYMENT_METHODS.map(method => (
                <SelectItem key={method} value={method}>
                  {method === 'us_bank_account'
                    ? 'US Bank Account'
                    : method === 'sepa_debit'
                      ? 'SEPA Debit'
                      : 'Card'}
                </SelectItem>
              ))}
            </Select>

            {/* Is Recurring */}
            <div className='flex items-center'>
              <input
                id='isRecurring'
                type='checkbox'
                checked={isRecurring}
                onChange={e => setIsRecurring(e.target.checked)}
                className='h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded'
              />
              <label
                htmlFor='isRecurring'
                className='ml-2 block text-sm text-neutral-700 dark:text-neutral-300'>
                Recurring donation
              </label>
            </div>

            {/* Error Display */}
            {createMutation.isError && (
              <div className='p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
                <p className='text-sm text-red-800 dark:text-red-300'>
                  {createMutation.error instanceof Error
                    ? createMutation.error.message
                    : 'Failed to create donation'}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className='flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800'>
              <button
                type='button'
                onClick={onClose}
                disabled={createMutation.isPending}
                className='px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
                Cancel
              </button>
              <button
                type='submit'
                disabled={createMutation.isPending}
                className='px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
                {createMutation.isPending ? 'Creating...' : 'Create Donation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
