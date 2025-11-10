import React from 'react';
import { MobileSheetContext } from './MobileSheetContext';

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
