import React from 'react';
import type {
  DonateFlowState,
  DonorDetails,
  DonorType,
  DonationIntent,
  AmountSelection,
} from '../state/types';

export function useDonateFlow() {
  const [state, setState] = React.useState<DonateFlowState>({
    step: 0,
  });

  const setDonor = (donor: DonorDetails) => setState(s => ({ ...s, donor }));
  const setDonorType = (donorType: DonorType) =>
    setState(s => ({ ...s, donorType }));
  const setIntent = (intent: DonationIntent) =>
    setState(s => ({ ...s, intent }));
  const setPaymentMethod = (paymentMethod: 'card' | 'bank_transfer') =>
    setState(s => ({ ...s, paymentMethod }));
  const setAmount = (amount: AmountSelection) =>
    setState(s => ({ ...s, amount }));

  // Results from checkout
  const setDonationId = (donationId: string) =>
    setState(s => ({ ...s, donationId }));
  const setCustomerId = (customerId: string) =>
    setState(s => ({ ...s, customerId }));
  const setPartnerOrgId = (partnerOrgId: string) =>
    setState(s => ({ ...s, partnerOrgId }));

  const next = () => setState(s => ({ ...s, step: s.step + 1 }));
  const back = () => setState(s => ({ ...s, step: Math.max(0, s.step - 1) }));
  const reset = () => setState({ step: 0 });

  return {
    state,
    setDonor,
    setDonorType,
    setIntent,
    setPaymentMethod,
    setAmount,
    setDonationId,
    setCustomerId,
    setPartnerOrgId,
    next,
    back,
    reset,
  };
}

export type DonateFlow = ReturnType<typeof useDonateFlow>;
