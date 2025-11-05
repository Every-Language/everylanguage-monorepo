// New donation model types
export type DonationIntentType =
  | 'language'
  | 'region'
  | 'operation'
  | 'unrestricted';

export interface DonorDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface DonorType {
  type: 'individual' | 'partner_org';
  partnerOrgId?: string; // For existing org
  newPartnerOrg?: {
    // For creating new org
    name: string;
    description?: string;
    isPublic: boolean;
  };
}

export interface DonationIntent {
  type: DonationIntentType;
  languageEntityId?: string; // Required if type is 'language'
  regionId?: string; // Required if type is 'region'
  operationId?: string; // Required if type is 'operation'
  // Display name for UI
  displayName?: string;
}

export interface AmountSelection {
  isRecurring: boolean; // true for monthly, false for one-time
  amountCents: number;
}

export interface DonateFlowState {
  step: number;
  donor?: DonorDetails;
  donorType?: DonorType;
  intent?: DonationIntent;
  paymentMethod?: 'card' | 'bank_transfer';
  amount?: AmountSelection;
  // Results from checkout
  donationId?: string;
  customerId?: string;
  partnerOrgId?: string;
}
