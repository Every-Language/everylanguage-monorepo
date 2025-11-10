import React from 'react';
import {
  listAvailableLanguages,
  calculateAdoptionCosts,
} from '../../api/fundingApi';
import { LanguageSelectionContext } from './LanguageSelectionContext';

type Row = {
  id: string;
  language_entity_id: string | null;
  language_name?: string | null;
  estimated_budget_cents: number | null;
  status: string | null;
};

interface LanguageSelectionProviderProps {
  children: React.ReactNode;
}

export const LanguageSelectionProvider: React.FC<
  LanguageSelectionProviderProps
> = ({ children }) => {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [totals, setTotals] = React.useState({
    upfront: 0,
    monthly: 0,
    months: 12,
  });
  const [loading, setLoading] = React.useState(false);

  // Load available languages on mount
  React.useEffect(() => {
    listAvailableLanguages({ status: 'available', limit: 100 })
      .then(setRows)
      .catch(console.error);
  }, []);

  // Fetch live cost calculation whenever selection changes
  React.useEffect(() => {
    if (selectedIds.length === 0) {
      setTotals({ upfront: 0, monthly: 0, months: 12 });
      return;
    }

    setLoading(true);
    calculateAdoptionCosts(selectedIds)
      .then(result => {
        setTotals({
          upfront: result.depositTotalCents,
          monthly: result.monthlyTotalCents,
          months: result.recurringMonths,
        });
      })
      .catch(err => {
        console.error('Failed to calculate costs:', err);
        setTotals({ upfront: 0, monthly: 0, months: 12 });
      })
      .finally(() => setLoading(false));
  }, [selectedIds]);

  const addLanguage = React.useCallback((id: string) => {
    setSelectedIds(prev => {
      if (!prev.includes(id)) {
        return [...prev, id];
      }
      return prev;
    });
  }, []);

  const removeLanguage = React.useCallback((id: string) => {
    setSelectedIds(prev => prev.filter(langId => langId !== id));
  }, []);

  const contextValue = React.useMemo(
    () => ({ selectedIds, addLanguage, removeLanguage, rows, totals, loading }),
    [selectedIds, addLanguage, removeLanguage, rows, totals, loading]
  );

  return (
    <LanguageSelectionContext.Provider value={contextValue}>
      {children}
    </LanguageSelectionContext.Provider>
  );
};
