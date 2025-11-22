'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/components/ui/Button';
import { type MapSelection } from '../inspector/state/inspectorStore';
import {
  checkLanguageRemainingBudget,
  checkRegionRemainingBudget,
} from '@/features/funding/api/fundingApi';
import type {
  DonationIntent,
  SelectedEntity,
} from '@/features/funding/state/types';

interface DonateButtonProps {
  selection: MapSelection | null;
  onClick: (data: {
    intent: DonationIntent;
    selectedEntity: SelectedEntity;
  }) => void;
}

/**
 * DonateButton component that appears when a language or region entity
 * is selected and has remaining budget. Clicking opens the donate modal
 * with intent and entity pre-selected.
 */
export const DonateButton: React.FC<DonateButtonProps> = ({
  selection,
  onClick,
}) => {
  // Query remaining budget for language entities
  const languageBudget = useQuery({
    enabled:
      !!selection && selection.kind === 'language_entity' && !!selection.id,
    queryKey: ['language-remaining-budget', selection?.id],
    queryFn: async () => {
      if (!selection || selection.kind !== 'language_entity') return null;
      return checkLanguageRemainingBudget(selection.id);
    },
    retry: false,
  });

  // Query remaining budget for regions
  const regionBudget = useQuery({
    enabled: !!selection && selection.kind === 'region' && !!selection.id,
    queryKey: ['region-remaining-budget', selection?.id],
    queryFn: async () => {
      if (!selection || selection.kind !== 'region') return null;
      return checkRegionRemainingBudget(selection.id);
    },
    retry: false,
  });

  // Determine which budget data to use
  const budgetData =
    selection?.kind === 'language_entity'
      ? languageBudget.data
      : selection?.kind === 'region'
        ? regionBudget.data
        : null;

  const isLoading =
    (selection?.kind === 'language_entity' && languageBudget.isLoading) ||
    (selection?.kind === 'region' && regionBudget.isLoading);

  // Don't show button if:
  // - No selection
  // - Selection is not language_entity or region
  // - Still loading
  // - No budget data or hasBudget is false
  // - remainingBudgetCents is 0 or less
  if (
    !selection ||
    (selection.kind !== 'language_entity' && selection.kind !== 'region') ||
    isLoading ||
    !budgetData ||
    !budgetData.hasBudget ||
    budgetData.remainingBudgetCents <= 0
  ) {
    return null;
  }

  const formatCurrency = (cents: number): string => {
    return (cents / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleClick = () => {
    if (!selection || !budgetData) return;

    const intent: DonationIntent =
      selection.kind === 'language_entity'
        ? {
            type: 'language',
            languageEntityId: selection.id,
            displayName: budgetData.name,
          }
        : {
            type: 'region',
            regionId: selection.id,
            displayName: budgetData.name,
          };

    const selectedEntity: SelectedEntity = {
      id: selection.id,
      type: selection.kind === 'language_entity' ? 'language' : 'region',
      name: budgetData.name,
      budgetCents: budgetData.remainingBudgetCents,
    };

    onClick({ intent, selectedEntity });
  };

  return (
    <div className='space-y-3'>
      {/* Amount needed section */}
      <div className='space-y-1'>
        <div className='text-sm text-neutral-600 dark:text-neutral-400'>
          Amount needed
        </div>
        <div className='text-2xl font-semibold text-neutral-900 dark:text-neutral-100'>
          ${formatCurrency(budgetData.remainingBudgetCents)}
        </div>
      </div>

      {/* Donate button */}
      <Button
        variant='primary'
        className='w-full'
        onClick={handleClick}
        disabled={isLoading}
      >
        Donate to {budgetData.name}
      </Button>
    </div>
  );
};
