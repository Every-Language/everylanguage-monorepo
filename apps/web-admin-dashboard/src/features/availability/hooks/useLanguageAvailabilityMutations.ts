import { useMutation, useQueryClient } from '@tanstack/react-query';
import { languageAvailabilityApi } from '../api/languageAvailabilityApi';
import type { LanguageFundingStatus, LanguageEntityWithRegions } from '@/types';

export function useLanguageAvailabilityMutations() {
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: ({
      languageId,
      status,
    }: {
      languageId: string;
      status: LanguageFundingStatus;
    }) =>
      languageAvailabilityApi.updateLanguageFundingStatus(languageId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-languages'] });
    },
  });

  const updateBudgetMutation = useMutation({
    mutationFn: ({
      languageId,
      budgetCents,
    }: {
      languageId: string;
      budgetCents: number | null;
    }) => languageAvailabilityApi.updateLanguageBudget(languageId, budgetCents),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-languages'] });
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: ({
      languageId,
      priority,
    }: {
      languageId: string;
      priority: number | null;
    }) => languageAvailabilityApi.updateLanguagePriority(languageId, priority),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-languages'] });
    },
  });

  const reorderLanguagesMutation = useMutation({
    mutationFn: async (ordered: LanguageEntityWithRegions[]) => {
      const updates = ordered.map((language, index) =>
        languageAvailabilityApi.updateLanguagePriority(language.id, index + 1)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-languages'] });
    },
  });

  const setAvailableMutation = useMutation({
    mutationFn: (languageId: string) =>
      languageAvailabilityApi.setLanguageAvailable(languageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-languages'] });
      queryClient.invalidateQueries({ queryKey: ['all-languages'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (languageId: string) =>
      languageAvailabilityApi.deleteLanguageFunding(languageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-languages'] });
    },
  });

  return {
    updateStatusMutation,
    updateBudgetMutation,
    updatePriorityMutation,
    reorderLanguagesMutation,
    setAvailableMutation,
    deleteMutation,
  };
}
