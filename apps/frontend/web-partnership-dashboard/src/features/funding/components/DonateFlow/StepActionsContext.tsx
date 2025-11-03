import React from 'react';

interface StepActionsContextType {
  setSubmitAction: (action: (() => void) | null) => void;
  submitAction: (() => void) | null;
}

export const StepActionsContext = React.createContext<StepActionsContextType>({
  setSubmitAction: () => {},
  submitAction: null,
});

export const StepActionsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [submitAction, setSubmitAction] = React.useState<(() => void) | null>(
    null
  );

  const value = React.useMemo(
    () => ({ submitAction, setSubmitAction }),
    [submitAction]
  );

  return (
    <StepActionsContext.Provider value={value}>
      {children}
    </StepActionsContext.Provider>
  );
};
