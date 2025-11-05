import React from 'react';

// Type for checkout response from API
interface CheckoutResponse {
  clientSecret: string | null;
  depositClientSecret?: string | null;
  subscriptionClientSecret?: string | null;
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

interface StepActionsContextType {
  setSubmitAction: (action: (() => void) | null) => void;
  submitAction: (() => void) | null;
  coverFees: boolean;
  setCoverFees: (value: boolean) => void;
  checkoutPromise: Promise<CheckoutResponse> | null;
  setCheckoutPromise: (promise: Promise<CheckoutResponse> | null) => void;
  clearCheckoutPromise: () => void;
}

export const StepActionsContext = React.createContext<StepActionsContextType>({
  setSubmitAction: () => {},
  submitAction: null,
  coverFees: false,
  setCoverFees: () => {},
  checkoutPromise: null,
  setCheckoutPromise: () => {},
  clearCheckoutPromise: () => {},
});

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
