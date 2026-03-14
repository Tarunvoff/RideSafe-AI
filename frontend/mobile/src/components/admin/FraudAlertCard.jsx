import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertTriangle, Copy, MapPin, Clock, Shield, Users } from 'lucide-react-native';

const FRAUD_TYPE_CONFIG = {
  duplicate_claim:        { label: 'Duplicate Claim', icon: Copy, color: '#EF4444' },
  abnormal_frequency:     { label: 'Abnormal Frequency', icon: Clock, color: '#F97316' },
  location_mismatch:      { label: 'Location Mismatch', icon: MapPin, color: '#F59E0B' },
  unrealistic_income:     { label: 'Unrealistic Income', icon: Shield, color: '#8B5CF6' },
  multiple_accounts:      { label: 'Multiple Accounts', icon: Users, color: '#EF4444' },
  claim_during_inactivity:{ label: 'Inactive During Claim', icon: Clock, color: '#F59E0B' },
};

const SEVERITY_CONFIG = {
  critical: { color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
  high:     { color: '#F97316', bg: '#FFF7ED', border: '#FED7AA' },
  medium:   { color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
  low:      { color: '#10B981', bg: '#F0FDF4', border: '#BBF7D0' },
};

const REVIEW_STATUS = {
  under_review: { label: 'Under Review', color: '#F59E0B', bg: '#FEF3C7' },
  escalated:    { label: 'Escalated', color: '#EF4444', bg: '#FEE2E2' },
  pending:      { label: 'Pending', color: '#8B5CF6', bg: '#F5F3FF' },
  blocked:      { label: 'Blocked', color: '#94A3B8', bg: '#F1F5F9' },
  cleared:      { label: 'Cleared', color: '#10B981', bg: '#DCFCE7' },
};

export default function FraudAlertCard({ alert, onAction }) {
  const typeConfig = FRAUD_TYPE_CONFIG[alert.type] || { label: alert.type, icon: AlertTriangle, color: '#EF4444' };
  const severity = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.medium;
  const reviewStatus = REVIEW_STATUS[alert.status] || REVIEW_STATUS.pending;
  const TypeIcon = typeConfig.icon;

  return (
    <View style={[styles.card, { borderColor: severity.border, borderWidth: 1.5 }]}>
      {/* Warning Banner */}
      <View style={[styles.banner, { backgroundColor: severity.bg }]}>
        <AlertTriangle size={14} color={severity.color} strokeWidth={2.5} />
        <Text style={[styles.bannerText, { color: severity.color }]}>
          {alert.severity.toUpperCase()} FRAUD RISK
        </Text>
        <View style={[styles.reviewPill, { backgroundColor: reviewStatus.bg }]}>
          <Text style={[styles.reviewText, { color: reviewStatus.color }]}>{reviewStatus.label}</Text>
        </View>
      </View>

      <View style={styles.body}>
        {/* Type + Title */}
        <View style={styles.typeRow}>
          <View style={[styles.typeIconWrap, { backgroundColor: typeConfig.color + '15' }]}>
            <TypeIcon size={14} color={typeConfig.color} strokeWidth={2.5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.typeLabel}>{typeConfig.label}</Text>
            <Text style={styles.title}>{alert.title}</Text>
          </View>
          <View style={styles.riskBadge}>
            <Text style={styles.riskBadgeText}>{alert.riskScore}</Text>
            <Text style={styles.riskBadgeLabel}>Risk</Text>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.description}>{alert.description}</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{alert.claimsCount}</Text>
            <Text style={styles.statLabel}>Claims</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>
              ₹{alert.totalFlaggedAmount.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.statLabel}>Flagged Amount</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{alert.city}</Text>
            <Text style={styles.statLabel}>City</Text>
          </View>
        </View>

        {/* Worker + Date */}
        <View style={styles.footer}>
          <Text style={styles.workerId}>Worker: {alert.workerName} · {alert.workerId}</Text>
          <Text style={styles.flagDate}>Flagged {alert.flaggedDate}</Text>
        </View>

        {/* Actions */}
        {alert.status !== 'blocked' && alert.status !== 'cleared' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}
              onPress={() => onAction?.(alert, 'block')}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionText, { color: '#EF4444' }]}>Block Account</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' }]}
              onPress={() => onAction?.(alert, 'clear')}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionText, { color: '#10B981' }]}>Clear Alert</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  bannerText: { fontSize: 11, fontWeight: '800', flex: 1, letterSpacing: 0.5 },
  reviewPill: { borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
  reviewText: { fontSize: 10, fontWeight: '700' },
  body: { padding: 14 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  typeIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase' },
  title: { fontSize: 13, fontWeight: '800', color: '#0F172A', marginTop: 1 },
  riskBadge: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center',
  },
  riskBadgeText: { fontSize: 14, fontWeight: '900', color: '#EF4444' },
  riskBadgeLabel: { fontSize: 8, color: '#94A3B8', fontWeight: '600' },
  description: { fontSize: 12, color: '#475569', lineHeight: 18, marginBottom: 12 },
  statsRow: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, marginBottom: 12 },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  statLabel: { fontSize: 9, color: '#94A3B8', fontWeight: '600' },
  statDivider: { width: 1, backgroundColor: '#E2E8F0' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  workerId: { fontSize: 11, color: '#64748B' },
  flagDate: { fontSize: 11, color: '#94A3B8' },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1 },
  actionText: { fontSize: 12, fontWeight: '700' },
});
