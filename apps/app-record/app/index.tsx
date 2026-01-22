import React from 'react';
import { Redirect } from 'expo-router';

/**
 * Root Index Route
 *
 * Redirects to the tabs navigator (projects tab as default).
 * This handles the root route when the app opens.
 */
export default function Index(): React.JSX.Element {
  return <Redirect href='/(tabs)/projects' />;
}
