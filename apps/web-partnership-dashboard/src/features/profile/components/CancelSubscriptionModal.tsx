import React from 'react';
import { ConfirmationModal } from '@/shared/components/Modals/ConfirmationModal';
import type { Subscription } from '../api/subscriptionsApi';

interface CancelSubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: Subscription | null;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export const CancelSubscriptionModal: React.FC<
  CancelSubscriptionModalProps
> = ({ open, onOpenChange, subscription, onConfirm, isLoading = false }) => {
  if (!subscription) return null;

  const formatCurrency = (cents: number): string => {
    return (cents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getIntentLabel = (): string => {
    if (subscription.intent_language) {
      return subscription.intent_language.name;
    }
    if (subscription.intent_region) {
      return subscription.intent_region.name;
    }
    if (subscription.intent_operation) {
      return subscription.intent_operation.name;
    }
    return 'Unrestricted';
  };

  return (
    <ConfirmationModal
      open={open}
      onOpenChange={onOpenChange}
      variant='warning'
      title='Cancel Subscription'
      description={`Are you sure you want to cancel your recurring donation of ${formatCurrency(subscription.amount_cents)}/${subscription.interval_type} for ${getIntentLabel()}? This will stop all future payments, but your past donations will remain.`}
      confirmText='Cancel Subscription'
      cancelText='Keep Subscription'
      onConfirm={onConfirm}
      isLoading={isLoading}
    />
  );
};
