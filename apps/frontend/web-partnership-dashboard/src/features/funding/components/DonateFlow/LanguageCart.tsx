import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';

type SelectedLanguage = {
  id: string;
  language_name?: string | null;
  language_entity_id: string | null;
  estimated_budget_cents: number | null;
};

interface LanguageCartProps {
  selectedLanguages: SelectedLanguage[];
  totals: {
    upfront: number;
    monthly: number;
    months: number;
  };
  loading: boolean;
  onRemove: (languageId: string) => void;
  onContinue: () => void;
  buttonText?: string;
  allowRemove?: boolean;
}

export const LanguageCart: React.FC<LanguageCartProps> = ({
  selectedLanguages,
  totals,
  loading,
  onRemove,
  onContinue,
  buttonText = 'Continue to details',
  allowRemove = true,
}) => {
  const grandTotal = totals.upfront + totals.monthly * totals.months;

  return (
    <div className='space-y-4'>
      <div className='text-base font-semibold text-neutral-900 dark:text-neutral-100'>
        Your selected languages
      </div>

      {selectedLanguages.length === 0 ? (
        <div className='text-sm text-neutral-500 py-8 text-center'>
          No languages selected yet. Choose from the list to get started.
        </div>
      ) : (
        <>
          {/* Selected Languages List */}
          <div className='space-y-2 max-h-[300px] overflow-y-auto'>
            {selectedLanguages.map(lang => (
              <div
                key={lang.id}
                className='flex items-start justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700'
              >
                <div className='flex-1 min-w-0'>
                  <div className='text-sm font-medium text-neutral-900 dark:text-neutral-100'>
                    {lang.language_name ?? lang.language_entity_id ?? 'Unknown'}
                  </div>
                  {lang.estimated_budget_cents && (
                    <div className='text-xs text-neutral-500 mt-0.5'>
                      ${(lang.estimated_budget_cents / 100).toLocaleString()}
                    </div>
                  )}
                </div>
                {allowRemove && (
                  <button
                    onClick={() => onRemove(lang.id)}
                    className='ml-2 p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-colors'
                    aria-label='Remove language'
                  >
                    <X className='h-4 w-4 text-neutral-500' />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Totals Breakdown */}
          <div className='border-t border-neutral-200 dark:border-neutral-700 pt-4 space-y-3'>
            {loading ? (
              <div className='text-sm text-neutral-500'>
                Calculating costs...
              </div>
            ) : (
              <>
                {/* Grand Total */}
                <div className='flex items-center justify-between text-lg font-semibold'>
                  <span className='text-neutral-900 dark:text-neutral-100'>
                    Total
                  </span>
                  <span className='text-neutral-900 dark:text-neutral-100'>
                    ${(grandTotal / 100).toLocaleString()}
                  </span>
                </div>

                {/* Breakdown */}
                <div className='space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-700'>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-neutral-600 dark:text-neutral-400'>
                      Upfront today
                    </span>
                    <span className='font-medium text-neutral-900 dark:text-neutral-100'>
                      ${(totals.upfront / 100).toLocaleString()}
                    </span>
                  </div>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-neutral-600 dark:text-neutral-400'>
                      Monthly for {totals.months} months
                    </span>
                    <span className='font-medium text-neutral-900 dark:text-neutral-100'>
                      ${(totals.monthly / 100).toLocaleString()}/mo
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Continue Button */}
          <Button
            onClick={onContinue}
            className='w-full'
            size='lg'
            disabled={loading}
          >
            {buttonText}
          </Button>
        </>
      )}
    </div>
  );
};

export default LanguageCart;
