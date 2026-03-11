import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import {
  CloudRain, Thermometer, Wind, MapPin, Zap, AlertTriangle,
} from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS, RADIUS } from '../constants/colors';
import { SEVERITY_CONFIG } from '../constants/theme';

const ICON_MAP = {
  'cloud-rain': CloudRain,
  thermometer: Thermometer,
  wind: Wind,
  'map-pin': MapPin,
  zap: Zap,
  'alert-triangle': AlertTriangle,
};

/**
 * AlertCard
 * Contextual disruption alert card with severity, payout info and pulse animation.
 */
export default function AlertCard({ alert, onPress, index = 0 }) {
  const { severity, title, subtitle, description, probability,
    expectedLoss, expectedPayout, timeStart, duration,
    affectedZones, icon, color, gradient, isActive, timestamp } = alert;

  const sev = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.medium;
  const IconComp = ICON_MAP[icon] || AlertTriangle;

  // Pulse dot for active alerts
  const dotOpacity = useSharedValue(1);
  const slideX = useSharedValue(-20);
  const opacity = useSharedValue(0);

  useEffect(() => {
    slideX.value = withDelay(index * 100, withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) }));
    opacity.value = withDelay(index * 100, withTiming(1, { duration: 400 }));

    if (isActive) {
      dotOpacity.value = withRepeat(
        withSequence(
          withTiming(0.2, { duration: 700 }),
          withTiming(1, { duration: 700 })
        ),
        -1,
        false
      );
    }
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
    opacity: opacity.value,
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
  }));

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity onPress={() => onPress?.(alert)} activeOpacity={0.87}>
        <LinearGradient
          colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.02)']}
          style={[styles.card, SHADOWS.subtle]}
        >
          {/* Left accent bar */}
          <View style={[styles.accentBar, { backgroundColor: color }]} />

          <View style={styles.content}>
            {/* Row 1: Icon + Title + Status */}
            <View style={styles.topRow}>
              <LinearGradient colors={gradient} style={styles.iconWrap}>
                <IconComp size={18} color={COLORS.white} strokeWidth={2} />
              </LinearGradient>

              <View style={styles.titleBlock}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
              </View>

              {/* Status dot */}
              <View style={styles.statusWrap}>
                {isActive && (
                  <Animated.View style={[styles.pulseDot, { backgroundColor: color }, dotStyle]} />
                )}
                <View style={[styles.severityBadge, { backgroundColor: sev.bg }]}>
                  <Text style={[styles.severityText, { color: sev.color }]}>
                    {sev.label}
                  </Text>
                </View>
              </View>
            </View>

            {/* Description */}
            <Text style={styles.desc} numberOfLines={2}>{description}</Text>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Disruption Prob.</Text>
                <Text style={[styles.statValue, { color }]}>{probability}%</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Est. Income Loss</Text>
                <Text style={[styles.statValue, { color: COLORS.red }]}>
                  ₹{expectedLoss}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Expected Payout</Text>
                <Text style={[styles.statValue, { color: COLORS.green }]}>
                  ₹{expectedPayout}
                </Text>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>🕐 {timeStart} · {duration}</Text>
              <Text style={styles.timestamp}>{timestamp}</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
    borderTopLeftRadius: RADIUS.lg,
    borderBottomLeftRadius: RADIUS.lg,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: { flex: 1 },
  title: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statusWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  desc: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.glassBg,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.glassBorder,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  timestamp: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
});
