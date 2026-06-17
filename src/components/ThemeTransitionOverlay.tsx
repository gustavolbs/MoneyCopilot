import { useLayoutEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { useThemeStore } from '@/store/themeStore';

export function ThemeTransitionOverlay() {
  const transition = useThemeStore((state) => state.transition);
  const clearTransition = useThemeStore((state) => state.clearTransition);
  const opacity = useRef(new Animated.Value(0)).current;
  const [overlayColor, setOverlayColor] = useState('transparent');
  const [visible, setVisible] = useState(false);

  useLayoutEffect(() => {
    if (!transition) {
      return;
    }

    setOverlayColor(transition.color);
    setVisible(true);
    opacity.setValue(1);
    Animated.timing(opacity, {
      toValue: 0,
      duration: 260,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setVisible(false);
      clearTransition();
    });
  }, [clearTransition, opacity, transition]);

  if (!visible) return null;

  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.overlay, { backgroundColor: overlayColor, opacity }]} />;
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 999,
  },
});
