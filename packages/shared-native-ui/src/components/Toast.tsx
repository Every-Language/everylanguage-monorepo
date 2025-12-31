import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { initialWindowMetrics } from 'react-native-safe-area-context';
import { useToastStore } from '../stores/toastStore';
import { useTheme } from '../hooks';

export const Toast: React.FC = () => {
  // Use initialWindowMetrics directly - it's always available and provides
  // the initial safe area insets. This prevents errors when SafeAreaProvider
  // isn't ready during initial render.
  // Note: This won't be reactive to safe area changes, but that's acceptable
  // for Toast positioning since safe area insets rarely change during app usage.
  const insets = initialWindowMetrics?.insets ?? {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  };

  const { toasts, hideToast } = useToastStore();
  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      left: 16,
      right: 16,
      zIndex: 9999,
    },
  });

  if (toasts.length === 0) return null;

  return (
    <View
      style={[styles.container, { top: insets.top + 10 }]}
      pointerEvents='box-none'>
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onHide={() => hideToast(toast.id)}
        />
      ))}
    </View>
  );
};

interface ToastItemProps {
  toast: {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  };
  onHide: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onHide }) => {
  const slideAnim = React.useRef(new Animated.Value(-100)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    toast: {
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    toastContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    icon: {
      marginRight: 12,
    },
    message: {
      flex: 1,
      color: theme.colors.textInverse,
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 20,
    },
    closeButton: {
      marginLeft: 12,
      padding: 4,
    },
  });

  useEffect(() => {
    // Slide in animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, opacityAnim]);

  const handleHide = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  const getToastStyle = () => {
    switch (toast.type) {
      case 'success':
        return {
          backgroundColor: theme.colors.success,
          borderColor: theme.colors.success,
        };
      case 'error':
        return {
          backgroundColor: theme.colors.error,
          borderColor: theme.colors.error,
        };
      case 'warning':
        return {
          backgroundColor: theme.colors.warning,
          borderColor: theme.colors.warning,
        };
      default:
        return {
          backgroundColor: theme.colors.info,
          borderColor: theme.colors.info,
        };
    }
  };

  const getIconName = () => {
    switch (toast.type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'warning':
        return 'warning';
      default:
        return 'information-circle';
    }
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        getToastStyle(),
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
          shadowColor: theme.colors.shadow,
        },
      ]}>
      <TouchableOpacity
        style={styles.toastContent}
        onPress={handleHide}
        activeOpacity={0.8}>
        <Ionicons
          name={getIconName()}
          size={20}
          color={theme.colors.textInverse}
          style={styles.icon}
        />
        <Text
          style={[styles.message, { color: theme.colors.textInverse }]}
          numberOfLines={2}>
          {toast.message}
        </Text>
        <TouchableOpacity onPress={handleHide} style={styles.closeButton}>
          <Ionicons name='close' size={16} color={theme.colors.textInverse} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};
