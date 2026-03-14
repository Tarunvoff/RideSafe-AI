import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Shield, Zap } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY } from '../constants/colors';

const { width, height } = Dimensions.get('window');

/**
 * SplashScreen
 * Animated logo reveal with floating particles and gradient bg.
 * Auto-navigates to Welcome after 2.8s.
 */
export default function SplashScreen({ navigation }) {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(20)).current;
  const ringScale = useRef(new Animated.Value(0.5)).current;
  const ringOpacity = useRef(new Animated.Value(0.8)).current;
  const particle1 = useRef(new Animated.Value(0)).current;
  const particle2 = useRef(new Animated.Value(0)).current;
  const particle3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo entrance
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, damping: 12, stiffness: 100, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(ringScale, { toValue: 1, damping: 10, stiffness: 80, useNativeDriver: true }),
    ]).start();

    // Tagline slide up
    Animated.sequence([
      Animated.delay(700),
      Animated.parallel([
        Animated.timing(taglineOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(taglineY, { toValue: 0, damping: 15, useNativeDriver: true }),
      ]),
    ]).start();

    // Ring pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringOpacity, { toValue: 0.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 0.8, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    // Floating particles
    [particle1, particle2, particle3].forEach((p, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 400),
          Animated.timing(p, { toValue: -30, duration: 2000 + i * 500, useNativeDriver: true }),
          Animated.timing(p, { toValue: 0, duration: 2000 + i * 500, useNativeDriver: true }),
        ])
      ).start();
    });

    // Navigate after 2.8s
    const timeout = setTimeout(() => {
      navigation.replace('Welcome');
    }, 2800);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <LinearGradient colors={['#0A0818', '#1a0533', '#0F0C29']} style={styles.container}>
      {/* Background decorative circles */}
      <Animated.View style={[styles.bgCircle, styles.bgCircle1, { opacity: ringOpacity }]} />
      <Animated.View style={[styles.bgCircle, styles.bgCircle2, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
      <Animated.View style={[styles.bgCircle, styles.bgCircle3, { opacity: 0.15 }]} />

      {/* Floating particles */}
      <Animated.View style={[styles.particle, styles.p1, { transform: [{ translateY: particle1 }] }]} />
      <Animated.View style={[styles.particle, styles.p2, { transform: [{ translateY: particle2 }] }]} />
      <Animated.View style={[styles.particle, styles.p3, { transform: [{ translateY: particle3 }] }]} />

      {/* Logo */}
      <Animated.View style={[styles.logoContainer, {
        opacity: logoOpacity,
        transform: [{ scale: logoScale }],
      }]}>
        <LinearGradient
          colors={['#8B5CF6', '#6D28D9', '#4C1D95']}
          style={styles.logoRing}
        >
          <LinearGradient colors={['#667eea', '#764ba2']} style={styles.logoInner}>
            <Shield size={32} color={COLORS.white} strokeWidth={2.5} />
          </LinearGradient>
        </LinearGradient>

        <View style={styles.logoTextRow}>
          <Text style={styles.logoText}>Blink</Text>
          <View style={styles.logoBadge}>
            <Zap size={10} color={COLORS.white} fill={COLORS.white} />
          </View>
        </View>
        <Text style={styles.logoSub}>Insurance</Text>
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={{
        opacity: taglineOpacity,
        transform: [{ translateY: taglineY }],
        alignItems: 'center',
        marginTop: 40,
      }}>
        <Text style={styles.tagline}>AI-Powered Parametric</Text>
        <Text style={styles.taglineAccent}>Income Protection</Text>
        <Text style={styles.taglineSub}>for Gig Workers</Text>
      </Animated.View>

      {/* Bottom loading dots */}
      <Animated.View style={[styles.dotsRow, { opacity: taglineOpacity }]}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.dot, i === 1 && styles.dotActive]} />
        ))}
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgCircle: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
  },
  bgCircle1: {
    width: 300,
    height: 300,
    borderColor: 'rgba(139,92,246,0.15)',
    top: height * 0.15,
    alignSelf: 'center',
  },
  bgCircle2: {
    width: 200,
    height: 200,
    borderColor: 'rgba(139,92,246,0.25)',
    top: height * 0.22,
    alignSelf: 'center',
  },
  bgCircle3: {
    width: 500,
    height: 500,
    backgroundColor: 'rgba(139,92,246,0.05)',
    bottom: -100,
    alignSelf: 'center',
    borderColor: 'transparent',
  },
  particle: {
    position: 'absolute',
    borderRadius: 99,
    backgroundColor: COLORS.purple,
    opacity: 0.4,
  },
  p1: { width: 6, height: 6, left: width * 0.2, top: height * 0.3 },
  p2: { width: 4, height: 4, right: width * 0.25, top: height * 0.4 },
  p3: { width: 8, height: 8, left: width * 0.65, top: height * 0.25 },
  logoContainer: { alignItems: 'center' },
  logoRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  logoInner: {
    width: '100%',
    height: '100%',
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 6,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: -1,
  },
  logoBadge: {
    backgroundColor: COLORS.purple,
    borderRadius: 8,
    padding: 4,
    marginBottom: 8,
  },
  logoSub: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  taglineAccent: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.purpleLight,
    textAlign: 'center',
    marginTop: 2,
  },
  taglineSub: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: 4,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    position: 'absolute',
    bottom: 60,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    backgroundColor: COLORS.purple,
    width: 20,
  },
});
