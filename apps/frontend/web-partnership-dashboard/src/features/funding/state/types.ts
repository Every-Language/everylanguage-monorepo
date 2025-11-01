export type DonateIntent = 'ops' | 'adopt';

export interface DonorDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface AmountSelection {
  cadence: 'once' | 'monthly';
  amount_cents: number;
  currency: 'USD' | 'AUD';
  coverFees: boolean;
}

export interface AdoptSelection {
  languageIds: string[];
  upfront_cents: number;
  monthly_cents: number;
  months: number;
}

export interface OrgSelection {
  orgMode: 'individual' | 'existing' | 'new';
  partner_org_id?: string;
  new_partner_org?: {
    name: string;
    description?: string;
    is_public: boolean;
  };
}

export interface DonateFlowState {
  step: number;
  intent: DonateIntent | null;
  donor?: DonorDetails;
  amount?: AmountSelection;
  adopt?: AdoptSelection;
  orgSelection?: OrgSelection;
  paymentMethod?: 'card' | 'bank_transfer';
  customerId?: string;
  partnerOrgId?: string;
}
