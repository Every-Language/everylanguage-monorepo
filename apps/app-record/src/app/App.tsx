import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth, LoginScreen } from '@/features/auth';

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

  // User is authenticated - show main app content
  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Welcome! You are signed in.</Text>
      <Text style={styles.userText}>User: {user.email}</Text>
      <StatusBar style='auto' />
    </View>
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
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
    textAlign: 'center',
  },
  userText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
