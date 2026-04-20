import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ToastType = "success" | "error";

type ToastState = {
  message: string;
  type: ToastType;
};

type UseToastOptions = {
  durationMs?: number;
  position?: "top" | "bottom";
};

export function useToast(options: UseToastOptions = {}) {
  const { durationMs = 2200, position = "top" } = options;
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  const hideToast = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setToast(null);
      }
    });
  }, [opacity]);

  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      clearTimer();
      setToast({ message, type });
      opacity.setValue(0);

      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();

      timerRef.current = setTimeout(() => {
        hideToast();
      }, durationMs);
    },
    [clearTimer, durationMs, hideToast, opacity],
  );

  const toastElement = toast ? (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        position === "top"
          ? { top: insets.top + 12 }
          : {
              bottom: insets.bottom + 12,
            },
        {
          backgroundColor: toast.type === "error" ? "#C5283D" : "#1E8E3E",
          opacity,
          transform: [
            {
              translateY: opacity.interpolate({
                inputRange: [0, 1],
                outputRange: [position === "top" ? -16 : 16, 0],
              }),
            },
          ],
        },
      ]}>
      <Text selectable style={styles.toastText}>
        {toast.message}
      </Text>
    </Animated.View>
  ) : null;

  return {
    showToast,
    hideToast,
    toastElement,
  };
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 18,
    right: 18,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    zIndex: 100,
  },
  toastText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
