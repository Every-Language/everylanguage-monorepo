import React from 'react';

type Row = {
  id: string;
  language_entity_id: string | null;
  language_name?: string | null;
  estimated_budget_cents: number | null;
  status: string | null;
};

// Create a context to share language selection state
export const LanguageSelectionContext = React.createContext<{
  selectedIds: string[];
  addLanguage: (id: string) => void;
  removeLanguage: (id: string) => void;
  rows: Row[];
  totals: { upfront: number; monthly: number; months: number };
  loading: boolean;
} | null>(null);
