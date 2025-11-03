import React from 'react';
import { LanguageCart } from './LanguageCart';
import { LanguageSelectionContext } from './LanguageSelectionProvider';

export const StepLanguages: React.FC<{ flow: any; onClose?: () => void }> = ({
  flow,
}) => {
  const languageContext = React.useContext(LanguageSelectionContext);

  if (!languageContext) {
    return (
      <div className='text-sm text-neutral-500'>
        Language selection not available
      </div>
    );
  }

  const { selectedIds, removeLanguage, rows, totals, loading } =
    languageContext;

  const selectedLanguages = rows.filter(r => selectedIds.includes(r.id));

  const continueNext = () => {
    flow.setAdopt({
      languageIds: selectedIds,
      upfront_cents: totals.upfront,
      monthly_cents: totals.monthly,
      months: totals.months,
    });
    flow.next();
  };

  return (
    <LanguageCart
      selectedLanguages={selectedLanguages}
      totals={totals}
      loading={loading}
      onRemove={removeLanguage}
      onContinue={continueNext}
    />
  );
};

export default StepLanguages;
