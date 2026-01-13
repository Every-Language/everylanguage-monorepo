import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStatus } from '@powersync/react';
import { useAuthStore } from '@/shared/auth/store/authStore';
import { colors } from '@/shared/constants/colors';

export const HomeScreen: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const status = useStatus();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Hello World!</Text>
        <Text style={styles.subtitle}>Welcome, {user?.email}</Text>

        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>PowerSync Status:</Text>
          <Text style={styles.statusText}>
            {status.connected ? '✅ Connected' : '❌ Disconnected'}
          </Text>
          {!status.hasSynced && (
            <Text style={styles.statusText}>🔄 Syncing...</Text>
          )}
        </View>

        <TouchableOpacity style={styles.button} onPress={signOut}>
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: colors.gray,
    marginBottom: 32,
  },
  statusContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: colors.grayLight,
    borderRadius: 8,
    minWidth: 200,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    marginTop: 4,
  },
  button: {
    marginTop: 32,
    backgroundColor: colors.error,
    borderRadius: 8,
    padding: 16,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
