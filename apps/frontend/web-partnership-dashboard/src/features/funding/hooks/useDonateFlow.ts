import React from 'react';
import type {
  DonateFlowState,
  DonateIntent,
  DonorDetails,
  AmountSelection,
  AdoptSelection,
  OrgSelection,
} from '../state/types';

export function useDonateFlow() {
  const [state, setState] = React.useState<DonateFlowState>({
    step: 0,
    intent: null,
  });

  const setIntent = (intent: DonateIntent) => {
    // Start each path at its first selection step
    const startStep = 1;
    setState(s => ({ ...s, intent, step: startStep }));
  };
  const setDonor = (donor: DonorDetails) => setState(s => ({ ...s, donor }));
  const setAmount = (amount: AmountSelection) =>
    setState(s => ({ ...s, amount }));
  const setAdopt = (adopt: AdoptSelection) => setState(s => ({ ...s, adopt }));
  const setOrgSelection = (orgSelection: OrgSelection) =>
    setState(s => ({ ...s, orgSelection }));
  const setPaymentMethod = (paymentMethod: 'card' | 'bank_transfer') =>
    setState(s => ({ ...s, paymentMethod }));
  const setCustomerId = (customerId: string) =>
    setState(s => ({ ...s, customerId }));
  const setPartnerOrgId = (partnerOrgId: string) =>
    setState(s => ({ ...s, partnerOrgId }));
  const setTransactionId = (transactionId: string) =>
    setState(s => ({ ...s, transactionId }));
  const next = () => setState(s => ({ ...s, step: s.step + 1 }));
  const back = () => setState(s => ({ ...s, step: Math.max(0, s.step - 1) }));
  const reset = () => setState({ step: 0, intent: null });

  return {
    state,
    setIntent,
    setDonor,
    setAmount,
    setAdopt,
    setOrgSelection,
    setPaymentMethod,
    setCustomerId,
    setPartnerOrgId,
    setTransactionId,
    next,
    back,
    reset,
  };
}
