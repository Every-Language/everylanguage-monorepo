import React from 'react';

interface MobileSheetContextValue {
  height: number;
  snapPoints: number[];
  isDragging: boolean;
}

const MobileSheetContext = React.createContext<MobileSheetContextValue>({
  height: 0,
  snapPoints: [80, 360, 744],
  isDragging: false,
});

export const MobileSheetProvider: React.FC<{
  height: number;
  snapPoints: number[];
  isDragging?: boolean;
  children: React.ReactNode;
}> = ({ height, snapPoints, isDragging = false, children }) => {
  const value = React.useMemo(
    () => ({ height, snapPoints, isDragging }),
    [height, snapPoints, isDragging]
  );
  return (
    <MobileSheetContext.Provider value={value}>
      {children}
    </MobileSheetContext.Provider>
  );
};

export const useMobileSheet = () => React.useContext(MobileSheetContext);
