import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStatus, usePowerSync } from '@powersync/react';
import { useAuthStore } from '@/shared/auth/store/authStore';
import { colors } from '@/shared/constants/colors';
import { LocalDataViewer } from '../components/LocalDataViewer';
import { DatabaseSchemaInspector } from '../components/DatabaseSchemaInspector';

export const HomeScreen: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const powerSync = usePowerSync();
  const status = useStatus();
  const [showSchemaInspector, setShowSchemaInspector] = useState(false);

  // Use registerListener for more reliable status updates
  const [isConnected, setIsConnected] = useState(
    powerSync?.connected ?? status.connected ?? false
  );
  const [hasSynced, setHasSynced] = useState(
    powerSync?.currentStatus?.hasSynced ?? status.hasSynced ?? false
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(
    status.lastSyncedAt ? new Date(status.lastSyncedAt) : null
  );

  useEffect(() => {
    if (!powerSync) return;

    // Set initial values
    setIsConnected(powerSync.connected);
    setHasSynced(powerSync.currentStatus?.hasSynced ?? false);
    setLastSyncedAt(
      powerSync.currentStatus?.lastSyncedAt
        ? new Date(powerSync.currentStatus.lastSyncedAt)
        : null
    );

    // Register listener for status changes
    return powerSync.registerListener({
      statusChanged: newStatus => {
        setIsConnected(powerSync.connected);
        setHasSynced(newStatus.hasSynced ?? false);
        setLastSyncedAt(
          newStatus.lastSyncedAt ? new Date(newStatus.lastSyncedAt) : null
        );
      },
    });
  }, [powerSync]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Hello World!</Text>
          <Text style={styles.subtitle}>Welcome, {user?.email}</Text>

          <View style={styles.statusContainer}>
            <Text style={styles.statusLabel}>PowerSync Status:</Text>
            <Text style={styles.statusText}>
              {isConnected ? '✅ Connected' : '❌ Disconnected'}
            </Text>
            {isConnected && !hasSynced && (
              <Text style={styles.statusText}>🔄 Syncing...</Text>
            )}
            {isConnected && hasSynced && (
              <Text style={styles.statusText}>✓ Synced</Text>
            )}
            {lastSyncedAt && (
              <Text style={styles.statusSubtext}>
                Last sync: {lastSyncedAt.toLocaleTimeString()}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => setShowSchemaInspector(!showSchemaInspector)}>
            <Text style={styles.secondaryButtonText}>
              {showSchemaInspector ? 'Hide' : 'Show'} Schema Inspector
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={signOut}>
            <Text style={styles.buttonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {showSchemaInspector ? (
          <DatabaseSchemaInspector />
        ) : (
          <LocalDataViewer />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.textPrimary,
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
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: colors.textPrimary,
  },
  statusText: {
    fontSize: 14,
    marginTop: 4,
    color: colors.textPrimary,
  },
  statusSubtext: {
    fontSize: 12,
    marginTop: 4,
    color: colors.gray,
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
  secondaryButton: {
    backgroundColor: colors.gray,
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
