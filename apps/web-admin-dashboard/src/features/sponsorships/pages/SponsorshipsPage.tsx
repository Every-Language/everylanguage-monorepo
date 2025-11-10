import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/query/query-client';
import { sponsorshipsApi } from '../api/sponsorshipsApi';
import { Search } from 'lucide-react';

export function SponsorshipsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Fetch sponsorships
  const { data: sponsorships, isLoading } = useQuery({
    queryKey: queryKeys.sponsorships(),
    queryFn: () => sponsorshipsApi.fetchSponsorships(),
  });

  // Filter sponsorships
  const filteredSponsorships = sponsorships?.filter(sponsorship => {
    const matchesSearch =
      !searchTerm ||
      sponsorship.partner_org?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || sponsorship.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(cents / 100);
  };

  return (
    <div className='p-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-neutral-900 dark:text-neutral-100'>
          Sponsorships
        </h1>
        <p className='mt-2 text-neutral-600 dark:text-neutral-400'>
          View and manage sponsorships
        </p>
      </div>

      {/* Filters */}
      <div className='mb-6 flex space-x-4'>
        <div className='flex-1 relative'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400 dark:text-neutral-500' />
          <input
            type='text'
            placeholder='Search by partner organization...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-primary-500 dark:focus:border-primary-600'
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className='px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-primary-500 dark:focus:border-primary-600'
        >
          <option value=''>All Status</option>
          <option value='interest'>Interest</option>
          <option value='pledged'>Pledged</option>
          <option value='active'>Active</option>
          <option value='paused'>Paused</option>
          <option value='cancelled'>Cancelled</option>
          <option value='completed'>Completed</option>
        </select>
      </div>

      {/* Table */}
      <div className='bg-white dark:bg-neutral-900 rounded-lg shadow dark:shadow-dark-card border border-neutral-200 dark:border-neutral-800 overflow-hidden'>
        {isLoading ? (
          <div className='p-8 text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-500 mx-auto'></div>
            <p className='mt-4 text-neutral-600 dark:text-neutral-400'>
              Loading sponsorships...
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-neutral-200 dark:divide-neutral-800'>
              <thead className='bg-neutral-50 dark:bg-neutral-800/50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Partner Organization
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Status
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    One-Time Amount
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Recurring Amount
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Project
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800'>
                {filteredSponsorships && filteredSponsorships.length > 0 ? (
                  filteredSponsorships.map(sponsorship => (
                    <tr
                      key={sponsorship.id}
                      className='hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors'
                    >
                      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                        {sponsorship.partner_org?.name || 'Unknown'}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            sponsorship.status === 'active'
                              ? 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300'
                              : sponsorship.status === 'pledged'
                                ? 'bg-info-100 dark:bg-info-900/30 text-info-800 dark:text-info-300'
                                : sponsorship.status === 'cancelled'
                                  ? 'bg-error-100 dark:bg-error-900/30 text-error-800 dark:text-error-300'
                                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300'
                          }`}
                        >
                          {sponsorship.status}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                        {formatCurrency(
                          sponsorship.pledge_one_time_cents || 0,
                          sponsorship.currency_code
                        )}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                        {formatCurrency(
                          sponsorship.pledge_recurring_cents || 0,
                          sponsorship.currency_code
                        )}{' '}
                        /mo
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                        {sponsorship.project?.name || 'Not assigned'}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400'>
                        {new Date(sponsorship.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className='px-6 py-8 text-center text-neutral-500 dark:text-neutral-400'
                    >
                      {searchTerm || statusFilter
                        ? 'No sponsorships found matching your filters'
                        : 'No sponsorships found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
