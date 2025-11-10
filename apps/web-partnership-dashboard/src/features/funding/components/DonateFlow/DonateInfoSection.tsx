import React from 'react';
import { DonateFlowInfo } from './DonateFlowInfo';
import type { DonateFlowState } from '../../state/types';
import type { useDonateFlow } from '../../hooks/useDonateFlow';

interface DonateInfoSectionProps {
  flowState?: DonateFlowState;
  flow?: ReturnType<typeof useDonateFlow>;
  className?: string;
}

export const DonateInfoSection: React.FC<DonateInfoSectionProps> = ({
  className = '',
}) => {
  // Unified flow: always show default info
  // TODO: Add step-specific info panels if needed
  return <DonateFlowInfo className={className} />;
};

export default DonateInfoSection;
