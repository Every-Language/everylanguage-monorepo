import React from 'react';
import type {
  DonateFlowState,
  DonorDetails,
  DonorType,
  DonationIntent,
  AmountSelection,
  SelectedEntity,
} from '../state/types';

export function useDonateFlow() {
  const [state, setState] = React.useState<DonateFlowState>({
    step: 0,
  });

  const setDonor = (donor: DonorDetails) => setState(s => ({ ...s, donor }));
  const setDonorType = (donorType: DonorType) =>
    setState(s => ({ ...s, donorType }));
  const setIntent = (intent: DonationIntent) => {
    setState(s => {
      // Clear selected entity if intent type changes
      const shouldClearEntity =
        s.intent?.type !== intent.type &&
        (intent.type === 'language' ||
          intent.type === 'region' ||
          intent.type === 'operation');

      return {
        ...s,
        intent,
        // Clear selected entity when switching between language/region/operation
        ...(shouldClearEntity ? { selectedEntity: undefined } : {}),
      };
    });
  };
  const setPaymentMethod = (paymentMethod: 'card' | 'bank_transfer') =>
    setState(s => ({ ...s, paymentMethod }));
  const setAmount = (amount: AmountSelection) =>
    setState(s => ({ ...s, amount }));

  // Results from checkout
  const setClientSecret = (clientSecret: string | null) =>
    setState(s => ({ ...s, clientSecret }));
  const setDonationId = (donationId: string | undefined) =>
    setState(s => ({ ...s, donationId }));
  const setCustomerId = (customerId: string | undefined) =>
    setState(s => ({ ...s, customerId }));
  const setPartnerOrgId = (partnerOrgId: string | undefined) =>
    setState(s => ({ ...s, partnerOrgId }));
  const setPaymentIntentId = (paymentIntentId: string | undefined) =>
    setState(s => ({ ...s, paymentIntentId }));

  // Selected entity management
  const setSelectedEntity = (entity: SelectedEntity | undefined) =>
    setState(s => ({ ...s, selectedEntity: entity }));

  const next = () => setState(s => ({ ...s, step: s.step + 1 }));
  const back = () => setState(s => ({ ...s, step: Math.max(0, s.step - 1) }));
  const reset = () => setState({ step: 0 });

  const initializeWithState = (
    intent: DonationIntent,
    selectedEntity?: SelectedEntity,
    step: number = 0
  ) => {
    setState({
      step,
      intent,
      selectedEntity,
    });
  };

  return {
    state,
    setDonor,
    setDonorType,
    setIntent,
    setPaymentMethod,
    setAmount,
    setClientSecret,
    setDonationId,
    setCustomerId,
    setPartnerOrgId,
    setPaymentIntentId,
    setSelectedEntity,
    next,
    back,
    reset,
    initializeWithState,
  };
}

export type DonateFlow = ReturnType<typeof useDonateFlow>;
