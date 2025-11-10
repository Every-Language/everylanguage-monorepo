import React from 'react';

interface MobileSheetContextValue {
  height: number;
  snapPoints: number[];
  isDragging: boolean;
}

export const MobileSheetContext = React.createContext<MobileSheetContextValue>({
  height: 0,
  snapPoints: [80, 360, 744],
  isDragging: false,
});

export const useMobileSheet = () => React.useContext(MobileSheetContext);
