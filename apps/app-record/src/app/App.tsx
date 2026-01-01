import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth, LoginScreen } from '@/features/auth';
import { UserProjectsScreen } from '@/features/projects';

function AppContent() {
  const { user, loading } = useAuth();

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

  // User is authenticated - show user projects screen
  return (
    <>
      <UserProjectsScreen />
      <StatusBar style='auto' />
    </>
  );
}

const COLORS = {
  white: '#fff',
} as const;

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
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
});
