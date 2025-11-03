import React from 'react';

interface StepActionsContextType {
  setSubmitAction: (action: (() => void) | null) => void;
  submitAction: (() => void) | null;
  coverFees: boolean;
  setCoverFees: (value: boolean) => void;
}

export const StepActionsContext = React.createContext<StepActionsContextType>({
  setSubmitAction: () => {},
  submitAction: null,
  coverFees: false,
  setCoverFees: () => {},
});

export const StepActionsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [submitAction, setSubmitAction] = React.useState<(() => void) | null>(
    null
  );
  const [coverFees, setCoverFees] = React.useState(false);

  const value = React.useMemo(
    () => ({ submitAction, setSubmitAction, coverFees, setCoverFees }),
    [submitAction, coverFees]
  );

  return (
    <StepActionsContext.Provider value={value}>
      {children}
    </StepActionsContext.Provider>
  );
};
