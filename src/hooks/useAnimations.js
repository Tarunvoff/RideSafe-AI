import { useRef, useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

/**
 * useCardAnimation
 * Provides entrance animation values for a card (opacity + scale).
 */
export function useCardAnimation(delay = 0) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.92);

  const enter = useCallback(() => {
    opacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) });
    scale.value = withSpring(1, { damping: 15, stiffness: 100 });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return { animStyle, enter };
}

/**
 * usePulseAnimation
 * Repeating scale pulse for attention-grabbing elements.
 */
export function usePulseAnimation(intensity = 1.05, speed = 800) {
  const scale = useSharedValue(1);

  const startPulse = useCallback(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(intensity, { duration: speed, easing: Easing.inOut(Easing.sine) }),
        withTiming(1, { duration: speed, easing: Easing.inOut(Easing.sine) })
      ),
      -1,
      false
    );
  }, [intensity, speed]);

  const stopPulse = useCallback(() => {
    scale.value = withTiming(1, { duration: 200 });
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { pulseStyle, startPulse, stopPulse };
}

/**
 * useSlideIn
 * Slide + fade entrance from a given direction.
 */
export function useSlideIn(direction = 'bottom', distance = 30, delay = 0) {
  const translateY = useSharedValue(direction === 'bottom' ? distance : direction === 'top' ? -distance : 0);
  const translateX = useSharedValue(direction === 'right' ? distance : direction === 'left' ? -distance : 0);
  const opacity = useSharedValue(0);

  const enter = useCallback(() => {
    setTimeout(() => {
      opacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.quad) });
      if (direction === 'bottom' || direction === 'top') {
        translateY.value = withSpring(0, { damping: 18, stiffness: 100 });
      } else {
        translateX.value = withSpring(0, { damping: 18, stiffness: 100 });
      }
    }, delay);
  }, [delay, direction]);

  const slideStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
    ],
  }));

  return { slideStyle, enter };
}

/**
 * useCountUp
 * Animated number count-up hook (returns a rounded integer).
 */
export function useCountUp(target, duration = 1200, delay = 0) {
  const value = useSharedValue(0);

  const start = useCallback(() => {
    setTimeout(() => {
      value.value = withTiming(target, { duration, easing: Easing.out(Easing.cubic) });
    }, delay);
  }, [target, duration, delay]);

  return { value, start };
}
