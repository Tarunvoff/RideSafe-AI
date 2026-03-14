import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../constants/colors';

/**
 * StatsCard
 * Compact metric card: icon, value, label and optional trend.
 */
export default function StatsCard({
  icon: IconComp,
  value,
  label,
  sublabel,
  color = COLORS.purple,
  gradient,
  delay = 0,
  wide = false,
}) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.88);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 380, easing: Easing.out(Easing.quad) }));
    scale.value = withDelay(delay, withTiming(1, { duration: 380, easing: Easing.out(Easing.back(1.2)) }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animStyle, wide && styles.wide]}>
      <LinearGradient
        colors={gradient || ['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.02)']}
        style={[styles.card, SHADOWS.subtle]}
      >
        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: `${color}20` }]}>
          {IconComp && <IconComp size={18} color={color} strokeWidth={2} />}
        </View>

        {/* Value */}
        <Text style={[styles.value, { color }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>

        {/* Label */}
        <Text style={styles.label} numberOfLines={1}>{label}</Text>

        {/* Sublabel */}
        {sublabel ? (
          <Text style={styles.sublabel} numberOfLines={1}>{sublabel}</Text>
        ) : null}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    minWidth: 100,
  },
  wide: {
    flex: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  label: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  sublabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
