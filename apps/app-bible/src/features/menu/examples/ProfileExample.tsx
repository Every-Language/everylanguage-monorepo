import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useUserProfile } from '@/shared/hooks/useUserProfile';

/**
 * Example component showing how to use the new profile system
 * This replaces the manual type casting and extraction in ProfileScreen
 */
export const ProfileExample: React.FC = () => {
  const { profile, isLoading, error, fullName, hasProfile } = useUserProfile();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size='large' />
        <Text>Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (!hasProfile) {
    return (
      <View style={styles.container}>
        <Text>No profile data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {fullName || 'User'}!</Text>

      <Text style={styles.infoText}>
        Email: {profile?.email || 'Not provided'}
      </Text>

      <Text style={styles.infoText}>
        Phone: {profile?.phone || 'Not provided'}
      </Text>

      <Text style={styles.infoText}>
        First Name: {profile?.first_name || 'Not provided'}
      </Text>

      <Text style={styles.infoText}>
        Last Name: {profile?.last_name || 'Not provided'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  infoText: {
    marginTop: 5,
  },
  errorText: {
    fontWeight: 'bold',
  },
});
