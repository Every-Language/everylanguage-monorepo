import { useState, useCallback } from 'react';
import { ValidationType } from '../types/validation';

interface ValidationFlowState {
  isValidationRequired: boolean;
  validationType: ValidationType | null;
  email?: string;
  phone?: string;
}

export function useValidationFlow() {
  const [validationState, setValidationState] = useState<ValidationFlowState>({
    isValidationRequired: false,
    validationType: null,
  });

  const startEmailValidation = useCallback((email: string) => {
    setValidationState({
      isValidationRequired: true,
      validationType: 'email',
      email,
    });
  }, []);

  const startPhoneValidation = useCallback((phone: string) => {
    setValidationState({
      isValidationRequired: true,
      validationType: 'phone',
      phone,
    });
  }, []);

  const completeValidation = useCallback(() => {
    setValidationState({
      isValidationRequired: false,
      validationType: null,
    });
  }, []);

  const cancelValidation = useCallback(() => {
    setValidationState({
      isValidationRequired: false,
      validationType: null,
    });
  }, []);

  return {
    validationState,
    startEmailValidation,
    startPhoneValidation,
    completeValidation,
    cancelValidation,
  };
}
