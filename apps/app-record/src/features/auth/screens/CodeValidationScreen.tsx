import React from 'react';
import { EmailCodeValidation, PhoneCodeValidation } from '../components';
import { ValidationType } from '../types/validation';

interface CodeValidationScreenProps {
  type: ValidationType;
  email?: string;
  phone?: string;
  onVerificationComplete: () => void;
  onBack: () => void;
  onResendEmail?: () => void;
  onResendSms?: () => void;
}

export function CodeValidationScreen({
  type,
  email,
  phone,
  onVerificationComplete,
  onBack,
  onResendEmail,
  onResendSms,
}: CodeValidationScreenProps) {
  if (type === 'email' && email) {
    return (
      <EmailCodeValidation
        email={email}
        onVerificationComplete={onVerificationComplete}
        onBack={onBack}
        {...(onResendEmail ? { onResendEmail } : {})}
      />
    );
  }

  if (type === 'phone' && phone) {
    return (
      <PhoneCodeValidation
        phone={phone}
        onVerificationComplete={onVerificationComplete}
        onBack={onBack}
        {...(onResendSms ? { onResendSms } : {})}
      />
    );
  }

  // Fallback - should not happen in normal flow
  return null;
}
