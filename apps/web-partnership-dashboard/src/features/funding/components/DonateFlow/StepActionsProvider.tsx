import React from 'react';
import { StepActionsContext } from './StepActionsContext';

// Type for checkout response from API
interface CheckoutResponse {
  clientSecret: string | null;
  depositClientSecret?: string | null;
  subscriptionClientSecret?: string | null;
  setupIntentClientSecret?: string | null; // For bank transfer card collection
  paymentIntentId?: string | null;
  setupIntentId?: string | null;
  customerId: string;
  sponsorshipId?: string;
  sponsorshipIds?: string[];
  subscriptionId?: string | null;
  partnerOrgId: string;
  adoptionSummaries?: Array<{
    id: string;
    name: string | null;
    depositCents: number;
    recurringCents: number;
  }>;
}

export const StepActionsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [submitAction, setSubmitAction] = React.useState<(() => void) | null>(
    null
  );
  const [coverFees, setCoverFees] = React.useState(false);
  const [checkoutPromise, setCheckoutPromise] =
    React.useState<Promise<CheckoutResponse> | null>(null);

  const clearCheckoutPromise = React.useCallback(() => {
    setCheckoutPromise(null);
  }, []);

  const value = React.useMemo(
    () => ({
      submitAction,
      setSubmitAction,
      coverFees,
      setCoverFees,
      checkoutPromise,
      setCheckoutPromise,
      clearCheckoutPromise,
    }),
    [submitAction, coverFees, checkoutPromise, clearCheckoutPromise]
  );

  return (
    <StepActionsContext.Provider value={value}>
      {children}
    </StepActionsContext.Provider>
  );
};
