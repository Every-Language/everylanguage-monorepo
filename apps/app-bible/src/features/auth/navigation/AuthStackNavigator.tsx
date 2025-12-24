import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { SignInScreen } from '../screens/SignInScreen';
import { SignUpScreen } from '../screens/SignUpScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { VerifyCodeScreen } from '../screens/VerifyCodeScreen';
import { SignInSyncScreen } from '../screens/SignInSyncScreen';
import { i18n } from '@/shared/services';

// Type definitions for the auth stack
export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  SignInSync: undefined;
  ForgotPassword: {
    email?: string;
    phone?: string;
    method: 'email' | 'phone';
  };
  VerifyCode: {
    type: 'email' | 'phone';
    email?: string;
    phone?: string;
    purpose: 'signup' | 'password_reset' | 'phone_verification';
  };
};

// Navigation props types
export type AuthStackNavigationProp =
  NativeStackNavigationProp<AuthStackParamList>;

export type SignInScreenProps = NativeStackScreenProps<
  AuthStackParamList,
  'SignIn'
>;
export type SignUpScreenProps = NativeStackScreenProps<
  AuthStackParamList,
  'SignUp'
>;
export type ForgotPasswordScreenProps = NativeStackScreenProps<
  AuthStackParamList,
  'ForgotPassword'
>;
export type VerifyCodeScreenProps = NativeStackScreenProps<
  AuthStackParamList,
  'VerifyCode'
>;

const AuthStack = createNativeStackNavigator<AuthStackParamList>();

interface AuthStackNavigatorProps {
  onAuthComplete?: (() => void) | undefined;
  onSkipAuth?: (() => void) | undefined;
}

// Wrapper components to pass onboarding context
const SignInScreenWrapper: React.FC<SignInScreenProps> = props => {
  // Get the onboarding props from the parent AuthStackNavigator
  const authStackProps = React.useContext(AuthStackContext);

  return (
    <SignInScreen
      {...props}
      onAuthComplete={authStackProps?.onAuthComplete}
      onSkipAuth={authStackProps?.onSkipAuth}
    />
  );
};

const SignUpScreenWrapper: React.FC<SignUpScreenProps> = props => {
  const authStackProps = React.useContext(AuthStackContext);

  return (
    <SignUpScreen
      {...props}
      onAuthComplete={authStackProps?.onAuthComplete}
      onSkipAuth={authStackProps?.onSkipAuth}
    />
  );
};

// Context to pass props to child screens
const AuthStackContext = React.createContext<AuthStackNavigatorProps | null>(
  null
);

export const AuthStackNavigator: React.FC<AuthStackNavigatorProps> = ({
  onAuthComplete,
  onSkipAuth,
}) => {
  return (
    <AuthStackContext.Provider
      value={{
        onAuthComplete: onAuthComplete || undefined,
        onSkipAuth: onSkipAuth || undefined,
      }}>
      <AuthStack.Navigator
        initialRouteName='SignIn'
        screenOptions={{
          headerShown: false, // Hide React Navigation headers - use custom headers
          gestureEnabled: true, // Enable swipe-back gesture
          fullScreenGestureEnabled: true, // Enable full-screen swipe gesture on iOS
          animationMatchesGesture: true, // Make animations match gesture interactions
        }}>
        <AuthStack.Screen
          name='SignIn'
          component={SignInScreenWrapper}
          options={{
            title: i18n.t('auth.signIn'),
          }}
        />
        <AuthStack.Screen
          name='SignInSync'
          component={SignInSyncScreen}
          options={{
            title: i18n.t('auth.sync.title', {
              defaultValue: 'Syncing Account',
            }),
            gestureEnabled: false, // Prevent back navigation during sync
            animation: 'none', // No animation for sync screen
          }}
        />
        <AuthStack.Screen
          name='SignUp'
          component={SignUpScreenWrapper}
          options={{
            title: i18n.t('auth.signUp'),
          }}
        />
        <AuthStack.Screen
          name='ForgotPassword'
          component={ForgotPasswordScreen}
          options={{
            title: i18n.t('auth.forgotPassword'),
          }}
        />
        <AuthStack.Screen
          name='VerifyCode'
          component={VerifyCodeScreen}
          options={{
            title: i18n.t('auth.verifyCode'),
          }}
        />
      </AuthStack.Navigator>
    </AuthStackContext.Provider>
  );
};
