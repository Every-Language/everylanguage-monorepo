import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/shared/hooks';
import { SignInForm } from '../components/SignInForm';
import { SignUpForm } from '../components/SignUpForm';

export function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const { theme } = useTheme();

  const handleSwitchToSignUp = () => setMode('signup');
  const handleSwitchToSignIn = () => setMode('signin');

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {mode === 'signin' ? (
        <SignInForm onSwitchToSignUp={handleSwitchToSignUp} />
      ) : (
        <SignUpForm onSwitchToSignIn={handleSwitchToSignIn} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});
