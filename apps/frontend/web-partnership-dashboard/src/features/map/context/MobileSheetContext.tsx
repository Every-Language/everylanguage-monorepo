import React from 'react';

interface MobileSheetContextValue {
  height: number;
  snapPoints: number[];
}

const MobileSheetContext = React.createContext<MobileSheetContextValue>({
  height: 0,
  snapPoints: [80, 360, 744],
});

export const MobileSheetProvider: React.FC<{
  height: number;
  snapPoints: number[];
  children: React.ReactNode;
}> = ({ height, snapPoints, children }) => {
  const value = React.useMemo(
    () => ({ height, snapPoints }),
    [height, snapPoints]
  );
  return (
    <MobileSheetContext.Provider value={value}>
      {children}
    </MobileSheetContext.Provider>
  );
};

export const useMobileSheet = () => React.useContext(MobileSheetContext);
