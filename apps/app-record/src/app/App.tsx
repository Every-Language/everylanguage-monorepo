import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { AuthProvider, useAuth, LoginScreen } from '@/features/auth';
import { UserProjectsScreen } from '@/features/projects';
import { UserProfileScreen } from '@/features/profile';

type Screen = 'profile' | 'projects';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('profile');

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size='large' color='#007AFF' />
        <StatusBar style='auto' />
      </View>
    );
  }

  if (!user) {
    return (
      <>
        <LoginScreen />
        <StatusBar style='auto' />
      </>
    );
  }

  // User is authenticated - show user profile screen first
  if (currentScreen === 'profile') {
    return (
      <>
        <UserProfileScreen
          onViewProjects={() => setCurrentScreen('projects')}
        />
        <StatusBar style='auto' />
      </>
    );
  }

  // Show projects screen
  return (
    <>
      <UserProjectsScreen onBack={() => setCurrentScreen('profile')} />
      <StatusBar style='auto' />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
});
