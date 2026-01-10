import { RegisterOptions } from 'react-hook-form';

export interface SignUpFormData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  password: string;
  confirmPassword: string;
  authMethod: 'phone' | 'email';
}

export interface SignUpFormValidationRules {
  firstName: RegisterOptions<SignUpFormData, 'firstName'>;
  lastName: RegisterOptions<SignUpFormData, 'lastName'>;
  email: RegisterOptions<SignUpFormData, 'email'>;
  phone: RegisterOptions<SignUpFormData, 'phone'>;
  password: RegisterOptions<SignUpFormData, 'password'>;
  confirmPassword: RegisterOptions<SignUpFormData, 'confirmPassword'>;
}

// Validation rules for the sign-up form
export const signUpValidationRules: SignUpFormValidationRules = {
  firstName: {
    required: 'First name is required',
    minLength: {
      value: 2,
      message: 'First name must be at least 2 characters',
    },
    pattern: {
      value: /^[a-zA-Z\s'-]+$/,
      message:
        'First name can only contain letters, spaces, hyphens, and apostrophes',
    },
  },
  lastName: {
    required: 'Last name is required',
    minLength: {
      value: 2,
      message: 'Last name must be at least 2 characters',
    },
    pattern: {
      value: /^[a-zA-Z\s'-]+$/,
      message:
        'Last name can only contain letters, spaces, hyphens, and apostrophes',
    },
  },
  email: {
    required: 'Email address is required',
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: 'Please enter a valid email address',
    },
  },
  phone: {
    required: 'Phone number is required',
    pattern: {
      value: /^\+?[1-9]\d{1,14}$/,
      message: 'Please enter a valid phone number',
    },
  },
  password: {
    required: 'Password is required',
    minLength: {
      value: 8,
      message: 'Password must be at least 8 characters',
    },
    pattern: {
      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      message:
        'Password must contain uppercase, lowercase, number, and special character',
    },
  },
  confirmPassword: {
    required: 'Please confirm your password',
    validate: (value: string, formValues: SignUpFormData) => {
      if (
        formValues.authMethod === 'email' ||
        formValues.authMethod === 'phone'
      ) {
        return value === formValues.password || 'Passwords do not match';
      }
      return true;
    },
  },
};

// Default form values
export const defaultSignUpFormValues: SignUpFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  authMethod: 'phone',
};
