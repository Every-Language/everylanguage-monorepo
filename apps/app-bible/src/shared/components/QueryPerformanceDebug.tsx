import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { queryLogger } from '@/shared/utils/queryLogger';
import { useTheme } from '@/shared/hooks';

// Global declaration for React Native __DEV__ variable
declare const __DEV__: boolean;

export const QueryPerformanceDebug: React.FC = () => {
  const { theme } = useTheme();

  if (!__DEV__) return null;

  const performance = queryLogger.getRecentPerformance();
  const activeQueries = queryLogger.getActiveQueries();

  if (performance.totalQueries === 0 && activeQueries.length === 0) {
    return null;
  }

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.info + '20',
      padding: 10,
      margin: 10,
      borderRadius: 5,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.info,
    },
    title: {
      fontWeight: 'bold',
      color: theme.colors.info,
      fontSize: 12,
      marginBottom: 5,
    },
    stats: {
      marginVertical: 5,
    },
    stat: {
      color: theme.colors.info,
      fontSize: 10,
      marginBottom: 2,
    },
    subtitle: {
      fontWeight: 'bold',
      color: theme.colors.info,
      fontSize: 10,
      marginTop: 5,
      marginBottom: 3,
    },
    activeQueries: {
      maxHeight: 80,
      marginBottom: 5,
    },
    recentQueries: {
      maxHeight: 60,
    },
    activeQuery: {
      fontSize: 9,
      color: theme.colors.textSecondary,
      marginBottom: 1,
    },
    recentQuery: {
      fontSize: 9,
      color: theme.colors.error,
      marginBottom: 1,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🛠️ Query Performance (Dev)</Text>

      <View style={styles.stats}>
        <Text style={styles.stat}>
          {performance.totalQueries} queries, {performance.slowQueries} slow
        </Text>
        <Text style={styles.stat}>Avg: {performance.averageTime}ms</Text>
        <Text style={styles.stat}>
          Active: {performance.activeQueries} queries running
        </Text>
      </View>

      {activeQueries.length > 0 && (
        <ScrollView style={styles.activeQueries}>
          <Text style={styles.subtitle}>Active Queries:</Text>
          {activeQueries.map((query, index) => (
            <Text key={index} style={styles.activeQuery}>
              {query.context}: {Date.now() - query.startTime}ms
            </Text>
          ))}
        </ScrollView>
      )}

      {performance.recentQueries.length > 0 && (
        <ScrollView style={styles.recentQueries}>
          <Text style={styles.subtitle}>Recent Slow Queries:</Text>
          {performance.recentQueries
            .filter(q => typeof q.duration === 'number' && q.duration > 1000)
            .slice(0, 3)
            .map((query, index) => (
              <Text key={index} style={styles.recentQuery}>
                {query.context}:{' '}
                {typeof query.duration === 'number' ? query.duration : 'N/A'}ms
              </Text>
            ))}
        </ScrollView>
      )}
    </View>
  );
};
