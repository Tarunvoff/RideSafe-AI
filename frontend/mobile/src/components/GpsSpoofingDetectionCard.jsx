import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  MapPin,
  Zap,
  Eye,
  CLock,
  RefreshCw,
} from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS, RADIUS } from '../constants/colors';

/**
 * GpsSpoofingDetectionCard
 * Beautiful MVP component to display GPS mock location detection results
 * Shows:
 * - Fraud score with visual indicator
 * - Real-time detection signals
 * - Location authenticity status
 * - Recommendation (APPROVE/REJECT/MANUAL_REVIEW)
 */
export default function GpsSpoofingDetectionCard({
  detectionResult,
  isChecking,
  onRefresh,
  onViewDetails,
  compact = false,
}) {
  // Define all hooks unconditionally (before any conditional returns)
  const cardScale = useSharedValue(0.92);
  const cardOpacity = useSharedValue(0);
  const signalOpacity = useSharedValue(0);

  useEffect(() => {
    cardOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) });
    cardScale.value = withSpring(1, { damping: 15, stiffness: 100 });
    signalOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
  }, []);

  // Define animated styles unconditionally
  const animStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const signalAnimStyle = useAnimatedStyle(() => ({
    opacity: signalOpacity.value,
  }));

  // Early return only happens AFTER all hooks are called
  if (!detectionResult) {
    return null;
  }

  // Determine colors based on fraud score and recommendation
  const getStatusColors = () => {
    const { recommendation } = detectionResult;

    if (recommendation === 'REJECT') {
      return {
        gradient: ['rgba(220, 38, 38, 0.12)', 'rgba(239, 68, 68, 0.08)'],
        accentColor: COLORS.red,
        bgColor: 'rgba(220, 38, 38, 0.1)',
        badgeColor: COLORS.red,
        icon: AlertTriangle,
        statusLabel: 'SUSPICIOUS',
      };
    }

    if (recommendation === 'MANUAL_REVIEW') {
      return {
        gradient: ['rgba(217, 119, 6, 0.12)', 'rgba(245, 158, 11, 0.08)'],
        accentColor: COLORS.orange,
        bgColor: 'rgba(217, 119, 6, 0.1)',
        badgeColor: COLORS.orange,
        icon: AlertCircle,
        statusLabel: 'NEEDS REVIEW',
      };
    }

    // APPROVE
    return {
      gradient: ['rgba(5, 150, 105, 0.12)', 'rgba(16, 185, 129, 0.08)'],
      accentColor: COLORS.green,
      bgColor: 'rgba(5, 150, 105, 0.1)',
      badgeColor: COLORS.green,
      icon: CheckCircle,
      statusLabel: 'VERIFIED',
    };
  };

  const statusColors = getStatusColors();
  const StatusIcon = statusColors.icon;

  // Render individual signal indicator
  const SignalIndicator = ({ signal, index }) => {
    const isBad = signal.detected;
    const severityColor =
      signal.severity === 'critical'
        ? COLORS.red
        : signal.severity === 'high'
          ? COLORS.orange
          : COLORS.yellow;

    return (
      <Animated.View
        key={`signal-${index}`}
        style={[signalAnimStyle, { marginBottom: SPACING.xs }]}
      >
        <View
          style={[
            styles.signalItem,
            {
              borderLeftColor: isBad ? severityColor : 'rgba(200, 200, 200, 0.3)',
              backgroundColor: isBad
                ? `${severityColor}15`
                : 'rgba(200, 200, 200, 0.05)',
            },
          ]}
        >
          <View
            style={[
              styles.signalDot,
              {
                backgroundColor: isBad ? severityColor : 'rgba(150, 150, 150, 0.4)',
              },
            ]}
          />
          <View style={styles.signalContent}>
            <Text
              style={[
                styles.signalMessage,
                { color: isBad ? severityColor : COLORS.textMuted },
              ]}
            >
              {signal.message}
            </Text>
            {isBad && (
              <Text style={[styles.signalSeverity, { color: severityColor }]}>
                {signal.severity.toUpperCase()}
              </Text>
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <Animated.View style={[animStyle]}>
      <TouchableOpacity
        onPress={onViewDetails}
        activeOpacity={0.88}
        style={styles.cardContainer}
      >
        <LinearGradient
          colors={statusColors.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, SHADOWS.card]}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.iconBg,
                  { backgroundColor: statusColors.bgColor },
                ]}
              >
                <Shield
                  size={20}
                  color={statusColors.accentColor}
                  strokeWidth={2.2}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>GPS Authentication</Text>
                <Text style={styles.cardSubtitle}>
                  Location authenticity check
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${statusColors.accentColor}20` },
              ]}
            >
              <StatusIcon
                size={14}
                color={statusColors.accentColor}
                strokeWidth={2.5}
              />
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: statusColors.accentColor },
                ]}
              >
                {statusColors.statusLabel}
              </Text>
            </View>
          </View>

          {/* Fraud Score Section */}
          <View style={styles.scoreSection}>
            <View style={styles.scoreRow}>
              <View style={styles.scoreLeft}>
                <Text style={styles.scoreLabel}>Fraud Risk Score</Text>
                <Text style={styles.confidenceText}>
                  Confidence: {detectionResult.confidence}
                </Text>
              </View>

              <View style={styles.scoreCircle}>
                <LinearGradient
                  colors={[statusColors.accentColor, statusColors.accentColor]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.scoreGradient}
                >
                  <View style={styles.scoreInner}>
                    <Text style={styles.scoreValue}>
                      {detectionResult.fraudScore}
                    </Text>
                    <Text style={styles.scorePercent}>%</Text>
                  </View>
                </LinearGradient>
              </View>
            </View>

            {/* Score bar */}
            <View style={styles.scoreBarBg}>
              <View
                style={[
                  styles.scoreBar,
                  {
                    width: `${detectionResult.fraudScore}%`,
                    backgroundColor: statusColors.accentColor,
                  },
                ]}
              />
            </View>
          </View>

          {/* Location Info */}
          {detectionResult.location && (
            <View style={styles.locationSection}>
              <View style={styles.locationItem}>
                <MapPin
                  size={14}
                  color={COLORS.textMuted}
                  strokeWidth={2.2}
                />
                <View style={styles.locationText}>
                  <Text style={styles.locationLabel}>Last Detection</Text>
                  <Text style={styles.locationValue}>
                    {detectionResult.location.latitude.toFixed(4)}°,{' '}
                    {detectionResult.location.longitude.toFixed(4)}°
                  </Text>
                </View>
              </View>

              <View style={styles.accuracyItem}>
                <Zap
                  size={14}
                  color={COLORS.textMuted}
                  strokeWidth={2.2}
                />
                <View style={styles.accuracyText}>
                  <Text style={styles.accuracyLabel}>Accuracy</Text>
                  <Text style={styles.accuracyValue}>
                    {detectionResult.location.accuracy}m
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Detection Signals */}
          {!compact && (
            <View style={styles.signalsSection}>
              <View style={styles.signalsHeader}>
                <Eye size={14} color={COLORS.textPrimary} strokeWidth={2.2} />
                <Text style={styles.signalsTitle}>Detection Signals</Text>
              </View>

              <Animated.View style={signalAnimStyle}>
                {detectionResult.signals.slice(0, 3).map((signal, idx) => (
                  <SignalIndicator key={idx} signal={signal} index={idx} />
                ))}
              </Animated.View>
            </View>
          )}

          {/* Reason Text */}
          <View style={styles.reasonSection}>
            <Text style={styles.reasonLabel}>Assessment</Text>
            <Text style={styles.reasonText}>
              {detectionResult.reasonText}
            </Text>
          </View>

          {/* Fraud Warning Banner */}
          {detectionResult.recommendation === 'REJECT' && (
            <View style={[styles.warningBanner, { borderLeftColor: statusColors.accentColor }]}>
              <AlertTriangle size={16} color={COLORS.red} strokeWidth={2.5} style={{ marginRight: SPACING.xs }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.warningTitle}>⚠️ Fraud Detected</Text>
                <Text style={styles.warningText}>
                  GPS spoofing detected. If repeated, your insurance coverage will be cancelled immediately.
                </Text>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSecondary]}
              onPress={onRefresh}
              disabled={isChecking}
            >
              {isChecking ? (
                <ActivityIndicator
                  size="small"
                  color={COLORS.textPrimary}
                />
              ) : (
                <>
                  <RefreshCw
                    size={14}
                    color={COLORS.textPrimary}
                    strokeWidth={2.2}
                  />
                  <Text style={styles.actionBtnText}>Re-check</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.actionBtnPrimary,
                { backgroundColor: statusColors.accentColor },
              ]}
              onPress={onViewDetails}
            >
              <Text style={styles.actionBtnTextPrimary}>View Full Report</Text>
            </TouchableOpacity>
          </View>

          {/* Timestamp */}
          <Text style={styles.timestamp}>
            Last checked:{' '}
            {new Date(detectionResult.timestamp).toLocaleTimeString()}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginVertical: SPACING.xs,
    marginHorizontal: SPACING.md,
  },
  card: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },

  // Header - Compact
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconBg: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },
  cardSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  statusBadgeText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Score Section - Compact
  scoreSection: {
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  scoreLeft: {
    flex: 1,
  },
  scoreLabel: {
    ...TYPOGRAPHY.h4,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs / 2,
  },
  confidenceText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textMuted,
  },
  scoreCircle: {
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreGradient: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  scorePercent: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: -2,
  },
  scoreBarBg: {
    height: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  scoreBar: {
    height: '100%',
    borderRadius: RADIUS.sm,
  },

  // Location Section - Compact
  locationSection: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  locationItem: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  locationText: {
    flex: 1,
  },
  locationLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs / 2,
  },
  locationValue: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  accuracyItem: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  accuracyText: {
    flex: 1,
  },
  accuracyLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs / 2,
  },
  accuracyValue: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  // Signals Section - Compact
  signalsSection: {
    marginBottom: SPACING.md,
  },
  signalsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  signalsTitle: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  signalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    borderLeftWidth: 3,
    marginBottom: SPACING.xs,
  },
  signalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  signalContent: {
    flex: 1,
  },
  signalMessage: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
  },
  signalSeverity: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    marginTop: SPACING.xs / 2,
    letterSpacing: 0.3,
  },

  // Reason Section - Compact
  reasonSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  reasonLabel: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs / 2,
  },
  reasonText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },

  // Warning Banner - Fraud Alert
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    alignItems: 'flex-start',
  },
  warningTitle: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.red,
    marginBottom: SPACING.xs / 2,
  },
  warningText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.red,
    lineHeight: 15,
  },

  // Action Buttons - Compact
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  actionBtn: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  actionBtnSecondary: {
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  actionBtnPrimary: {
    backgroundColor: COLORS.blue,
  },
  actionBtnText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  actionBtnTextPrimary: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.textWhite,
  },

  // Timestamp - Compact
  timestamp: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
