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
      // Clear cart if intent type changes (language/region/operation switching)
      const shouldClearCart =
        s.intent?.type !== intent.type &&
        (intent.type === 'language' ||
          intent.type === 'region' ||
          intent.type === 'operation');

      return {
        ...s,
        intent,
        // Clear cart-related state when switching between language/region/operation
        ...(shouldClearCart
          ? {
              selectedEntities: undefined,
              cartTotalCents: undefined,
              cartEdited: false,
            }
          : {}),
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

  // Cart management
  const setSelectedEntities = (entities: SelectedEntity[]) =>
    setState(s => ({ ...s, selectedEntities: entities }));
  const setCartTotalCents = (totalCents: number) =>
    setState(s => ({ ...s, cartTotalCents: totalCents }));
  const setCartEdited = (edited: boolean) =>
    setState(s => ({ ...s, cartEdited: edited }));

  // Add entity to cart
  const addEntityToCart = (entity: SelectedEntity) => {
    setState(s => {
      const existing = s.selectedEntities || [];
      // Check if already in cart
      if (existing.some(e => e.id === entity.id && e.type === entity.type)) {
        return s;
      }
      const updated = [...existing, entity];
      // Recalculate cart total as sum of budgets
      const newTotal = updated.reduce((sum, e) => sum + e.budgetCents, 0);
      return {
        ...s,
        selectedEntities: updated,
        cartTotalCents: newTotal,
        cartEdited: false, // Reset edited flag when adding
      };
    });
  };

  // Remove entity from cart
  const removeEntityFromCart = (
    entityId: string,
    entityType: 'language' | 'region' | 'operation'
  ) => {
    setState(s => {
      const existing = s.selectedEntities || [];
      const updated = existing.filter(
        e => !(e.id === entityId && e.type === entityType)
      );
      // Recalculate cart total
      const newTotal = updated.reduce((sum, e) => sum + e.budgetCents, 0);
      return {
        ...s,
        selectedEntities: updated,
        cartTotalCents: newTotal,
        cartEdited: false, // Reset edited flag when removing
      };
    });
  };

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
    setClientSecret,
    setDonationId,
    setCustomerId,
    setPartnerOrgId,
    setPaymentIntentId,
    setSelectedEntities,
    setCartTotalCents,
    setCartEdited,
    addEntityToCart,
    removeEntityFromCart,
    next,
    back,
    reset,
  };
}

export type DonateFlow = ReturnType<typeof useDonateFlow>;
