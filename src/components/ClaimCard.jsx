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
import { CircleCheck, Clock, CircleAlert, CreditCard } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS, RADIUS } from '../constants/colors';

const STATUS_CONFIG = {
  paid: {
    label: 'Paid',
    color: COLORS.green,
    bg: 'rgba(16,185,129,0.12)',
    icon: CircleCheck,
    gradient: ['rgba(16,185,129,0.12)', 'rgba(16,185,129,0.04)'],
  },
  processing: {
    label: 'Processing',
    color: COLORS.yellow,
    bg: 'rgba(245,158,11,0.12)',
    icon: Clock,
    gradient: ['rgba(245,158,11,0.12)', 'rgba(245,158,11,0.04)'],
  },
  rejected: {
    label: 'Rejected',
    color: COLORS.red,
    bg: 'rgba(239,68,68,0.12)',
    icon: CircleAlert,
    gradient: ['rgba(239,68,68,0.12)', 'rgba(239,68,68,0.04)'],
  },
};

/**
 * ClaimCard
 * Displays a single insurance claim with auto-payout simulation,
 * status, timeline and animated payout counter.
 */
export default function ClaimCard({ claim, onPress, index = 0, showTimeline = false }) {
  const status = STATUS_CONFIG[claim.status] || STATUS_CONFIG.processing;
  const StatusIcon = status.icon;

  const translateY = useSharedValue(30);
  const opacity = useSharedValue(0);
  const payoutScale = useSharedValue(0.5);

  useEffect(() => {
    translateY.value = withDelay(index * 130, withSpring(0, { damping: 16 }));
    opacity.value = withDelay(index * 130, withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }));
    payoutScale.value = withDelay(index * 130 + 400, withSpring(1, { damping: 12, stiffness: 120 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const payoutStyle = useAnimatedStyle(() => ({
    transform: [{ scale: payoutScale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity onPress={() => onPress?.(claim)} activeOpacity={0.87}>
        <LinearGradient
          colors={status.gradient}
          style={[styles.card, SHADOWS.subtle, { borderColor: `${status.color}30` }]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.claimInfo}>
              <Text style={styles.claimId}>{claim.id}</Text>
              <Text style={styles.claimTitle}>{claim.title}</Text>
              <Text style={styles.claimDate}>{claim.date} · {claim.disruption}</Text>
            </View>

            {/* Status badge */}
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <StatusIcon size={14} color={status.color} strokeWidth={2.5} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Payout Block */}
          <View style={styles.payoutRow}>
            <View style={styles.amountBlock}>
              <Text style={styles.amountLabel}>Estimated Loss</Text>
              <Text style={styles.estimatedLoss}>-₹{claim.estimatedLoss}</Text>
            </View>

            <View style={styles.arrowWrap}>
              <Text style={styles.arrow}>→</Text>
            </View>

            <View style={styles.amountBlock}>
              <Text style={styles.amountLabel}>Insurance Payout</Text>
              <Animated.View style={payoutStyle}>
                <Text style={[styles.payoutAmount, { color: status.color }]}>
                  +₹{claim.approvedPayout}
                </Text>
              </Animated.View>
            </View>
          </View>

          {/* Processing time + payment method */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Clock size={11} color={COLORS.textMuted} strokeWidth={2} />
              <Text style={styles.metaText}>{claim.processingTime}</Text>
            </View>
            <View style={styles.metaItem}>
              <CreditCard size={11} color={COLORS.textMuted} strokeWidth={2} />
              <Text style={styles.metaText}>{claim.paymentMethod}</Text>
            </View>
            {claim.transactionId && (
              <Text style={styles.txnId} numberOfLines={1}>
                {claim.transactionId}
              </Text>
            )}
          </View>

          {/* Fraud Rejection Banner */}
          {claim.status === 'rejected' && claim.rejectReason === 'GPS Spoofing Detected' && (
            <View style={[styles.fraudBanner, { borderLeftColor: COLORS.red }]}>
              <Text style={styles.fraudReason}>🚨 {claim.rejectReason}</Text>
              <Text style={styles.fraudDetails}>{claim.rejectDetails}</Text>
              {claim.fraudScore && (
                <View style={styles.fraudScore}>
                  <Text style={styles.fraudScoreLabel}>Fraud Confidence</Text>
                  <Text style={styles.fraudScoreValue}>{claim.fraudScore}%</Text>
                </View>
              )}
            </View>
          )}

          {/* Optional Timeline */}
          {showTimeline && (
            <View style={styles.timeline}>
              {claim.timeline.map((step, i) => (
                <View key={i} style={styles.timelineStep}>
                  <View style={[
                    styles.timelineDot,
                    step.done
                      ? { backgroundColor: COLORS.green }
                      : { backgroundColor: COLORS.bgBorder },
                  ]} />
                  {i < claim.timeline.length - 1 && (
                    <View style={[
                      styles.timelineLine,
                      { backgroundColor: step.done ? COLORS.green : COLORS.bgBorder },
                    ]} />
                  )}
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineEvent, step.done && { color: COLORS.textPrimary }]}>
                      {step.event}
                    </Text>
                    <Text style={styles.timelineTime}>{step.time}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  claimInfo: { flex: 1 },
  claimId: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  claimTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    marginTop: 3,
  },
  claimDate: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.glassBorder,
    marginVertical: SPACING.sm,
  },
  payoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountBlock: { flex: 1, alignItems: 'center' },
  amountLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginBottom: 4,
    textAlign: 'center',
  },
  estimatedLoss: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.red,
  },
  arrowWrap: {
    paddingHorizontal: SPACING.sm,
  },
  arrow: {
    fontSize: 20,
    color: COLORS.textMuted,
  },
  payoutAmount: {
    fontSize: 20,
    fontWeight: '900',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.glassBorder,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  txnId: {
    flex: 1,
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'right',
  },
  timeline: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.glassBorder,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: SPACING.sm,
  },
  timelineDotWrap: { alignItems: 'center' },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 3,
  },
  timelineLine: {
    position: 'absolute',
    left: 4.5,
    top: 13,
    width: 1,
    height: 14,
  },
  timelineContent: { flex: 1 },
  timelineEvent: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textMuted,
  },
  timelineTime: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  fraudBanner: {
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  fraudReason: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.red,
    marginBottom: SPACING.xs,
  },
  fraudDetails: {
    ...TYPOGRAPHY.caption,
    color: COLORS.red,
    lineHeight: 15,
    marginBottom: SPACING.sm,
  },
  fraudScore: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(239, 68, 68, 0.3)',
  },
  fraudScoreLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.red,
    fontWeight: '600',
  },
  fraudScoreValue: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.red,
  },
});
