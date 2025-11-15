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

export interface SelectedEntity {
  id: string;
  type: 'language' | 'region' | 'operation';
  name: string;
  budgetCents: number;
}

export interface DonationIntent {
  type: DonationIntentType;
  // Support multiple entities for adoption mode
  languageEntityIds?: string[]; // For 'language' type
  regionIds?: string[]; // For 'region' type
  operationIds?: string[]; // For 'operation' type
  // Legacy single entity support (for backward compatibility)
  languageEntityId?: string;
  regionId?: string;
  operationId?: string;
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
  // Cart state for entity selection
  selectedEntities?: SelectedEntity[];
  cartTotalCents?: number; // Editable total
  cartEdited?: boolean; // Tracks if user edited cart
  // Results from checkout
  clientSecret?: string | null;
  donationId?: string;
  customerId?: string;
  partnerOrgId?: string;
  paymentIntentId?: string;
}
