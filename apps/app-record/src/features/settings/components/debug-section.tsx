import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useAuth } from '@/shared/hooks';
import { usePowerSyncStatus } from '@/shared/infrastructure/powersync/hooks';
import { colors } from '@/shared/constants/colors';
import { LocalDataViewer } from '@/features/home/components/local-data-viewer';
import { DatabaseSchemaInspector } from '@/features/home/components/database-schema-inspector';

/**
 * Debug Section
 *
 * Shows all the debug content from the original HomeScreen:
 * - PowerSync status
 * - Local data viewer
 * - Database schema inspector
 */
export const DebugSection: React.FC = () => {
  const { user, signOut } = useAuth();
  const { isConnected, hasSynced, lastSyncedAt } = usePowerSyncStatus();
  const [showSchemaInspector, setShowSchemaInspector] = useState(false);

  const handleToggleSchemaInspector = useCallback((): void => {
    setShowSchemaInspector(prev => !prev);
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PowerSync Status</Text>
        <View style={styles.statusContainer}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Connection:</Text>
            <Text style={styles.statusText}>
              {isConnected ? '✅ Connected' : '❌ Disconnected'}
            </Text>
          </View>
          {isConnected && (
            <>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Synced:</Text>
                <Text style={styles.statusText}>
                  {hasSynced ? '✓ Synced' : '🔄 Syncing...'}
                </Text>
              </View>
              {lastSyncedAt && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Last Sync:</Text>
                  <Text style={styles.statusSubtext}>
                    {lastSyncedAt.toLocaleTimeString()}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {user && (
          <View style={styles.userInfo}>
            <Text style={styles.userLabel}>Logged in as:</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleToggleSchemaInspector}
          accessibilityLabel={
            showSchemaInspector
              ? 'Hide Schema Inspector'
              : 'Show Schema Inspector'
          }>
          <Text style={styles.secondaryButtonText}>
            {showSchemaInspector ? 'Hide' : 'Show'} Schema Inspector
          </Text>
        </TouchableOpacity>

        {user && (
          <TouchableOpacity
            style={styles.button}
            onPress={signOut}
            accessibilityLabel='Sign Out'>
            <Text style={styles.buttonText}>Sign Out</Text>
          </TouchableOpacity>
        )}
      </View>

      {showSchemaInspector ? <DatabaseSchemaInspector /> : <LocalDataViewer />}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  statusContainer: {
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: colors.grayLight,
    borderRadius: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statusText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  statusSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  userInfo: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.grayLight,
    borderRadius: 8,
  },
  userLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  button: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: colors.error,
    borderRadius: 8,
    padding: 16,
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
