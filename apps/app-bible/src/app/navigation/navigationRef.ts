import type { NavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './RootNavigator';

let rootNavigationRef: NavigationContainerRef<RootStackParamList> | null = null;

export const setRootNavigationRef = (
  ref: NavigationContainerRef<RootStackParamList> | null
): void => {
  rootNavigationRef = ref;
};

export const getRootNavigationRef =
  (): NavigationContainerRef<RootStackParamList> | null => {
    return rootNavigationRef;
  };
