import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sponsorshipsApi } from '../api/sponsorshipsApi';
import { languagesApi } from '../../languages/api/languagesApi';
import { useAuth } from '@/features/auth';
import { Search, DollarSign } from 'lucide-react';

export function AllocateSponsorshipsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'language' | 'sponsorship' | 'project'>(
    'language'
  );
  const [selectedLanguageId, setSelectedLanguageId] = useState<string | null>(
    null
  );
  const [selectedSponsorshipId, setSelectedSponsorshipId] = useState<
    string | null
  >(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [allocationPercent, setAllocationPercent] = useState('100');
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch language entities
  const { data: languages } = useQuery({
    queryKey: ['language-entities-list'],
    queryFn: languagesApi.fetchLanguageEntitiesList,
  });

  // Fetch projects for selected language
  const { data: projects } = useQuery({
    queryKey: ['projects-for-language', selectedLanguageId],
    queryFn: () =>
      sponsorshipsApi.fetchProjectsForLanguageEntity(selectedLanguageId!),
    enabled: !!selectedLanguageId && step === 'project',
  });

  // Fetch sponsorships for selected language
  const { data: sponsorships } = useQuery({
    queryKey: ['sponsorships-for-language', selectedLanguageId],
    queryFn: () =>
      sponsorshipsApi.fetchActiveSponsorshipsForLanguage(selectedLanguageId!),
    enabled: !!selectedLanguageId && step === 'sponsorship',
  });

  // Allocate mutation
  const allocateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSponsorshipId || !selectedProjectId || !user) {
        throw new Error('Missing required data');
      }

      await sponsorshipsApi.createAllocation(
        selectedSponsorshipId,
        selectedProjectId,
        parseFloat(allocationPercent) / 100,
        effectiveFrom,
        user.id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sponsorships'] });
      // Reset form
      setStep('language');
      setSelectedLanguageId(null);
      setSelectedSponsorshipId(null);
      setSelectedProjectId(null);
      setAllocationPercent('100');
      alert('Sponsorship allocation created successfully!');
    },
  });

  const filteredLanguages = languages?.filter(lang =>
    lang.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLanguageSelect = (languageId: string) => {
    setSelectedLanguageId(languageId);
    setStep('sponsorship');
  };

  const handleSponsorshipSelect = (sponsorshipId: string) => {
    setSelectedSponsorshipId(sponsorshipId);
    setStep('project');
  };

  const handleAllocate = () => {
    allocateMutation.mutate();
  };

  return (
    <div className='p-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-neutral-900'>
          Allocate Sponsorships
        </h1>
        <p className='mt-2 text-neutral-600'>Assign sponsorships to projects</p>
      </div>

      {/* Steps indicator */}
      <div className='mb-8 flex items-center justify-center space-x-4'>
        <div
          className={`flex items-center ${
            step === 'language' ? 'text-primary-600' : 'text-neutral-400'
          }`}
        >
          <div
            className={`rounded-full h-8 w-8 flex items-center justify-center ${
              step === 'language'
                ? 'bg-primary-600 text-white'
                : 'bg-neutral-200'
            }`}
          >
            1
          </div>
          <span className='ml-2 font-medium'>Select Language</span>
        </div>
        <div className='h-px w-12 bg-neutral-300' />
        <div
          className={`flex items-center ${
            step === 'sponsorship' ? 'text-primary-600' : 'text-neutral-400'
          }`}
        >
          <div
            className={`rounded-full h-8 w-8 flex items-center justify-center ${
              step === 'sponsorship'
                ? 'bg-primary-600 text-white'
                : 'bg-neutral-200'
            }`}
          >
            2
          </div>
          <span className='ml-2 font-medium'>Select Sponsorship</span>
        </div>
        <div className='h-px w-12 bg-neutral-300' />
        <div
          className={`flex items-center ${
            step === 'project' ? 'text-primary-600' : 'text-neutral-400'
          }`}
        >
          <div
            className={`rounded-full h-8 w-8 flex items-center justify-center ${
              step === 'project'
                ? 'bg-primary-600 text-white'
                : 'bg-neutral-200'
            }`}
          >
            3
          </div>
          <span className='ml-2 font-medium'>Allocate to Project</span>
        </div>
      </div>

      {/* Content */}
      <div className='bg-white rounded-lg shadow p-6'>
        {step === 'language' && (
          <div>
            <h2 className='text-xl font-semibold text-neutral-900 mb-4'>
              Select a Language Entity
            </h2>
            <div className='mb-4'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400' />
                <input
                  type='text'
                  placeholder='Search languages...'
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className='w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                />
              </div>
            </div>
            <div className='space-y-2 max-h-96 overflow-y-auto'>
              {filteredLanguages?.map(language => (
                <button
                  key={language.id}
                  onClick={() => handleLanguageSelect(language.id)}
                  className='w-full text-left p-4 border border-neutral-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors'
                >
                  <div className='font-medium text-neutral-900'>
                    {language.name}
                  </div>
                  <div className='text-sm text-neutral-500'>
                    {language.level}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'sponsorship' && (
          <div>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-xl font-semibold text-neutral-900'>
                Select a Sponsorship
              </h2>
              <button
                onClick={() => setStep('language')}
                className='text-sm text-primary-600 hover:text-primary-700'
              >
                Back to Languages
              </button>
            </div>
            {sponsorships && sponsorships.length > 0 ? (
              <div className='space-y-2'>
                {sponsorships.map(sponsorship => (
                  <button
                    key={sponsorship.id}
                    onClick={() => handleSponsorshipSelect(sponsorship.id)}
                    className='w-full text-left p-4 border border-neutral-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors'
                  >
                    <div className='flex items-center justify-between'>
                      <div>
                        <div className='font-medium text-neutral-900'>
                          {sponsorship.partner_org?.name || 'Unknown'}
                        </div>
                        <div className='text-sm text-neutral-500'>
                          Status: {sponsorship.status}
                        </div>
                      </div>
                      <div className='text-right'>
                        <div className='font-medium text-neutral-900'>
                          ${sponsorship.pledge_recurring_cents / 100}/mo
                        </div>
                        <div className='text-xs text-neutral-500'>
                          {sponsorship.currency_code}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className='text-neutral-500'>
                No active sponsorships available for this language
              </p>
            )}
          </div>
        )}

        {step === 'project' && (
          <div>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-xl font-semibold text-neutral-900'>
                Allocate to Project
              </h2>
              <button
                onClick={() => setStep('sponsorship')}
                className='text-sm text-primary-600 hover:text-primary-700'
              >
                Back to Sponsorships
              </button>
            </div>

            {projects && projects.length > 0 ? (
              <div className='space-y-6'>
                <div>
                  <label className='block text-sm font-medium text-neutral-700 mb-2'>
                    Select Project
                  </label>
                  <select
                    value={selectedProjectId || ''}
                    onChange={e => setSelectedProjectId(e.target.value)}
                    className='w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500'
                  >
                    <option value=''>Choose a project...</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className='block text-sm font-medium text-neutral-700 mb-2'>
                    Allocation Percentage
                  </label>
                  <input
                    type='number'
                    min='0'
                    max='100'
                    step='0.01'
                    value={allocationPercent}
                    onChange={e => setAllocationPercent(e.target.value)}
                    className='w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-neutral-700 mb-2'>
                    Effective From
                  </label>
                  <input
                    type='date'
                    value={effectiveFrom}
                    onChange={e => setEffectiveFrom(e.target.value)}
                    className='w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500'
                  />
                </div>

                <button
                  onClick={handleAllocate}
                  disabled={!selectedProjectId || allocateMutation.isPending}
                  className='w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center'
                >
                  <DollarSign className='h-5 w-5 mr-2' />
                  {allocateMutation.isPending
                    ? 'Creating Allocation...'
                    : 'Create Allocation'}
                </button>
              </div>
            ) : (
              <p className='text-neutral-500'>
                No active projects available for this language
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
