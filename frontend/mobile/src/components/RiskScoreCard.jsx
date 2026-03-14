import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react-native';
import AnimatedProgressRing from './AnimatedProgressRing';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS, RADIUS } from '../constants/colors';
import { getRiskLevel } from '../constants/theme';

/**
 * RiskScoreCard
 * Displays overall AI risk score with animated ring and trend indicator.
 */
export default function RiskScoreCard({ riskData, onPress, compact = false }) {
  const { overall, label, trend, trendDirection } = riskData;
  const level = getRiskLevel(overall);

  const cardScale = useSharedValue(0.92);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    cardOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) });
    cardScale.value = withSpring(1, { damping: 15, stiffness: 100 });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  return (
    <Animated.View style={[animStyle]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.88}>
        <LinearGradient
          colors={['rgba(102,126,234,0.18)', 'rgba(118,75,162,0.10)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, SHADOWS.card]}
        >
          {/* Glow accent */}
          <View style={[styles.glow, { backgroundColor: level.color }]} />

          {/* Header row */}
          <View style={styles.header}>
            <View>
              <Text style={styles.cardTitle}>AI Risk Score</Text>
              <Text style={styles.cardSubtitle}>Updated just now</Text>
            </View>
            <View style={[styles.trendBadge, { backgroundColor: trendDirection === 'up' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)' }]}>
              {trendDirection === 'up' ? (
                <TrendingUp size={13} color={COLORS.red} strokeWidth={2.5} />
              ) : (
                <TrendingDown size={13} color={COLORS.green} strokeWidth={2.5} />
              )}
              <Text style={[styles.trendText, { color: trendDirection === 'up' ? COLORS.red : COLORS.green }]}>
                {trend}
              </Text>
            </View>
          </View>

          {/* Ring + info */}
          <View style={styles.body}>
            <AnimatedProgressRing
              score={overall}
              size={compact ? 120 : 150}
              strokeWidth={10}
              color={level.color}
              bgColor={COLORS.bgSurface}
              delay={200}
            />

            <View style={styles.infoBlock}>
              <View style={[styles.levelBadge, { backgroundColor: level.bg }]}>
                <Activity size={12} color={level.color} strokeWidth={2.5} />
                <Text style={[styles.levelText, { color: level.color }]}>{level.label}</Text>
              </View>
              <Text style={styles.infoDesc}>
                Based on live weather,{'\n'}pollution & disruption data
              </Text>
              <View style={styles.scoreMeta}>
                <Text style={styles.scoreMetaLabel}>Disruption Prob.</Text>
                <Text style={[styles.scoreMetaValue, { color: level.color }]}>
                  {overall}%
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    right: -40,
    top: -40,
    opacity: 0.07,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  cardTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },
  cardSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '700',
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  infoBlock: {
    flex: 1,
    gap: SPACING.sm,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  levelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  infoDesc: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  scoreMeta: {
    backgroundColor: COLORS.glassBg,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  scoreMetaLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  scoreMetaValue: {
    ...TYPOGRAPHY.h3,
    marginTop: 2,
  },
});
