export interface ValidationNavigationProps {
  onVerificationComplete: () => void;
  onBack: () => void;
}

export interface EmailValidationProps extends ValidationNavigationProps {
  email: string;
  onResendEmail?: () => void;
}

export interface PhoneValidationProps extends ValidationNavigationProps {
  phone: string;
  onResendSms?: () => void;
}

export type ValidationType = 'email' | 'phone';

export interface ValidationScreenParams {
  type: ValidationType;
  email?: string;
  phone?: string;
  onResendEmail?: () => void;
  onResendSms?: () => void;
}
