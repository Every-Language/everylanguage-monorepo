# Auth Code Validation Components

This directory contains code validation components for email and phone verification in the authentication flow.

## Components

### CodeValidationInput

A reusable input component for entering verification codes with built-in validation and resend functionality.

**Features:**

- Numeric input with automatic formatting
- Real-time validation
- Resend button with cooldown timer
- Error display
- Customizable length and styling

**Usage:**

```tsx
import { CodeValidationInput } from '@/features/auth';

<CodeValidationInput
  value={code}
  onChangeText={setCode}
  onResend={handleResend}
  error={error}
  placeholder='Enter 6-digit code'
  label='Verification Code*'
  maxLength={6}
  resendCooldown={60}
/>;
```

### EmailCodeValidation

Complete email verification screen with code input and resend functionality.

**Features:**

- Email display
- 6-digit code input
- Resend email functionality
- Back navigation
- Loading states
- Error handling

**Usage:**

```tsx
import { EmailCodeValidation } from '@/features/auth';

<EmailCodeValidation
  email='user@example.com'
  onVerificationComplete={handleComplete}
  onBack={handleBack}
  onResendEmail={handleResend}
/>;
```

### PhoneCodeValidation

Complete phone verification screen with SMS code input and resend functionality.

**Features:**

- Phone number display
- SMS code input
- Resend SMS functionality
- Back navigation
- Loading states
- Error handling

**Usage:**

```tsx
import { PhoneCodeValidation } from '@/features/auth';

<PhoneCodeValidation
  phone='+1234567890'
  onVerificationComplete={handleComplete}
  onBack={handleBack}
  onResendSms={handleResend}
/>;
```

### CodeValidationScreen

Unified validation screen that handles both email and phone validation.

**Usage:**

```tsx
import { CodeValidationScreen } from '@/features/auth';

<CodeValidationScreen
  type='email' // or "phone"
  email='user@example.com' // for email validation
  phone='+1234567890' // for phone validation
  onVerificationComplete={handleComplete}
  onBack={handleBack}
/>;
```

## Hooks

### useValidationFlow

Hook for managing validation flow state and navigation.

**Usage:**

```tsx
import { useValidationFlow } from '@/features/auth';

function MyComponent() {
  const {
    validationState,
    startEmailValidation,
    startPhoneValidation,
    completeValidation,
    cancelValidation,
  } = useValidationFlow();

  // Start email validation
  const handleEmailSignUp = async (email: string) => {
    await signUp(email, password);
    startEmailValidation(email);
  };

  // Start phone validation
  const handlePhoneSignUp = async (phone: string) => {
    await startPhoneVerification(phone);
    startPhoneValidation(phone);
  };

  // Show validation screen if needed
  if (validationState.isValidationRequired) {
    return (
      <CodeValidationScreen
        type={validationState.validationType}
        email={validationState.email}
        phone={validationState.phone}
        onVerificationComplete={completeValidation}
        onBack={cancelValidation}
      />
    );
  }

  return <YourSignUpForm />;
}
```

## Integration with SignUpForm

The SignUpForm has been updated to automatically navigate to the appropriate validation screen after successful registration:

1. **Email Registration**: After successful email signup, user is taken to email verification screen
2. **Phone Registration**: After successful phone signup, user is taken to phone verification screen

The validation flow is handled automatically - no additional setup required.

## AuthService Methods

The following methods have been added to the authService:

- `verifyEmailCode(code: string)` - Verify email verification code
- `resendEmailVerification(email: string)` - Resend email verification
- `verifyPhoneOtp(phone: string, code: string)` - Verify phone OTP (already existed)

## Types

```tsx
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
```

## Styling

All components use the app's theming system and are fully customizable through the `createThemedStyles` function. The components follow the app's design system and are responsive to theme changes.

## Error Handling

All components include comprehensive error handling:

- Network errors
- Invalid codes
- Expired codes
- Rate limiting
- User-friendly error messages

## Accessibility

Components include proper accessibility features:

- Screen reader support
- Keyboard navigation
- Focus management
- Semantic markup
