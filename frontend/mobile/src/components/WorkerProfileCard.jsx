import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, MapPin, Clock, Bike, Star } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../constants/colors';

/**
 * WorkerProfileCard
 * Displays worker profile summary in a glassmorphic card.
 */
export default function WorkerProfileCard({ worker, compact = false }) {
  const initials = worker.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const platformColor = worker.platform === 'Swiggy' ? '#FF6900' : '#CB202D';

  return (
    <LinearGradient
      colors={['rgba(102,126,234,0.14)', 'rgba(118,75,162,0.07)']}
      style={[styles.card, SHADOWS.card]}
    >
      {/* Avatar + Name */}
      <View style={styles.avatarRow}>
        <LinearGradient colors={COLORS.gradientPurple} style={styles.avatar}>
          <Text style={styles.initials}>{initials}</Text>
        </LinearGradient>

        <View style={styles.nameBlock}>
          <Text style={styles.name}>{worker.name}</Text>
          <View style={styles.platformRow}>
            <View style={[styles.platformDot, { backgroundColor: platformColor }]} />
            <Text style={[styles.platform, { color: platformColor }]}>{worker.platform}</Text>
          </View>
          <View style={styles.ratingRow}>
            <Star size={12} color={COLORS.yellow} fill={COLORS.yellow} />
            <Text style={styles.rating}>{worker.rating} · {worker.totalDeliveries} deliveries</Text>
          </View>
        </View>

        <View style={styles.memberBadge}>
          <Text style={styles.memberText}>Member</Text>
          <Text style={styles.memberSince}>{worker.memberSince}</Text>
        </View>
      </View>

      {!compact && (
        <>
          <View style={styles.divider} />
          {/* Details Grid */}
          <View style={styles.grid}>
            <DetailItem icon={MapPin} label="Zone" value={`${worker.city} · ${worker.zone}`} />
            <DetailItem icon={Clock} label="Hours" value={worker.workingHours} />
            <DetailItem icon={Bike} label="Vehicle" value={worker.vehicleType} />
            <DetailItem icon={User} label="Worker ID" value={worker.id} />
          </View>

          <View style={styles.divider} />
          {/* Earnings row */}
          <View style={styles.earningsRow}>
            <EarningBadge label="Avg Daily" value={`₹${worker.avgDailyEarnings}`} />
            <EarningBadge label="Avg Weekly" value={`₹${worker.avgWeeklyEarnings.toLocaleString('en-IN')}`} />
            <EarningBadge label="Active Policy" value={worker.activePolicy} highlight />
          </View>
        </>
      )}
    </LinearGradient>
  );
}

function DetailItem({ icon: Icon, label, value }) {
  return (
    <View style={styles.detailItem}>
      <Icon size={13} color={COLORS.textMuted} strokeWidth={2} />
      <View>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function EarningBadge({ label, value, highlight }) {
  return (
    <View style={[styles.earningBadge, highlight && styles.earningBadgeHighlight]}>
      <Text style={styles.earningLabel}>{label}</Text>
      <Text style={[styles.earningValue, highlight && styles.earningValueHighlight]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
  },
  nameBlock: { flex: 1 },
  name: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  platformDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  platform: {
    fontSize: 13,
    fontWeight: '700',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  rating: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  memberBadge: {
    backgroundColor: 'rgba(139,92,246,0.18)',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  memberText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.purpleLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  memberSince: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.purple,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.glassBorder,
    marginVertical: SPACING.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  detailItem: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  detailLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  earningsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  earningBadge: {
    flex: 1,
    backgroundColor: COLORS.glassBg,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  earningBadgeHighlight: {
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderColor: 'rgba(139,92,246,0.3)',
  },
  earningLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  earningValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  earningValueHighlight: {
    color: COLORS.purpleLight,
  },
});
