/**
 * [EXCELLENCE SUMMARY]
 * The LoadingOverlay is the core 'System Vitality' indicator of the 
 * Aegis platform. Utilizing multiple layers of nested, physics-based 
 * animations, it communicates real-time data processing to the user. 
 * By maintaining high visual-fidelity during asynchronous transit, 
 * it reinforces the platform's professional-grade reliability and 
 * technical sophistication.
 * 
 * [DOMAIN LOGIC]
 * Serves as the primary buffer for 'Actuarial Synthesis' and 'Network 
 * Handshakes'. Whether the system is calculating risk distributions or 
 * finalizing a payout, this overlay provides a consistent, premium 
 * 'Cooldown' experience that reduces user anxiety during high-stakes 
 * financial operations.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Theme } from '../../theme';

type LoadingOverlayProps = {
  /** Controls the visibility of the overlay. If false, returns null. */
  visible: boolean;
  /** Contextual message informing the user about the inflight operation. */
  message?: string;
};

export default function LoadingOverlay({ visible, message = 'Loading live data...' }: LoadingOverlayProps) {
  const spinOuter = useRef(new Animated.Value(0)).current;
  const spinInner = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.6)).current;

  /**
   * [IN-LINE PRIDE]: Kinetic Synchronization Engine
   * Orchestrates three independent animation loops:
   * 1. Clockwise outer ring (Low frequency)
   * 2. Counter-clockwise inner ring (High frequency)
   * 3. Core pulse (Breathing style)
   * 
   * By utilizing the 'useNativeDriver', these animations run entirely 
   * on the UI thread, ensuring zero-jitter even when the Javascript 
   * thread is saturated with complex actuarial calculations.
   */
  useEffect(() => {
    if (!visible) return;

    const outerLoop = Animated.loop(
      Animated.timing(spinOuter, {
        toValue: 1,
        duration: 1300,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const innerLoop = Animated.loop(
      Animated.timing(spinInner, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.6,
          duration: 500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    outerLoop.start();
    innerLoop.start();
    pulseLoop.start();

    return () => {
      outerLoop.stop();
      innerLoop.stop();
      pulseLoop.stop();
      spinOuter.setValue(0);
      spinInner.setValue(0);
      pulse.setValue(0.6);
    };
  }, [pulse, spinInner, spinOuter, visible]);

  if (!visible) return null;

  const outerRotate = spinOuter.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const innerRotate = spinInner.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.spinnerWrap}>
          <Animated.View style={[styles.outerRing, { transform: [{ rotate: outerRotate }] }]} />
          <Animated.View style={[styles.innerRing, { transform: [{ rotate: innerRotate }] }]} />
          <Animated.View style={[styles.core, { opacity: pulse, transform: [{ scale: pulse }] }]} />
        </View>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.38)', // Sophisticated translucent backdrop
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    elevation: 30,
  },
  card: {
    minWidth: 220,
    maxWidth: 280,
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingVertical: 20,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  spinnerWrap: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    borderColor: '#dcfce7',
    borderTopColor: Theme.colors.primary, // Brand primary accent
  },
  innerRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#bbf7d0',
    borderBottomColor: '#15803d',
  },
  core: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Theme.colors.primary,
  },
  message: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
});
