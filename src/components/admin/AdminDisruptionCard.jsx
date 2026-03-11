import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  CloudRain, Thermometer, Wind, Smartphone, MapPin, Zap, AlertTriangle,
} from 'lucide-react-native';

const TYPE_ICONS = {
  weather:  CloudRain,
  heatwave: Thermometer,
  aqi:      Wind,
  platform: Smartphone,
  event:    MapPin,
  curfew:   AlertTriangle,
};

const SEVERITY_CONFIG = {
  critical: { color: '#EF4444', bg: '#FEE2E2', border: '#FECACA', label: 'Critical' },
  high:     { color: '#F97316', bg: '#FFEDD5', border: '#FED7AA', label: 'High' },
  medium:   { color: '#F59E0B', bg: '#FEF3C7', border: '#FDE68A', label: 'Medium' },
  low:      { color: '#10B981', bg: '#DCFCE7', border: '#BBF7D0', label: 'Low' },
};

const STATUS_CONFIG = {
  active:    { color: '#EF4444', label: '🔴 Active' },
  imminent:  { color: '#F97316', label: '🟠 Imminent' },
  scheduled: { color: '#F59E0B', label: '🟡 Scheduled' },
  resolved:  { color: '#10B981', label: '🟢 Resolved' },
};

export default function AdminDisruptionCard({ disruption }) {
  const severity = SEVERITY_CONFIG[disruption.severity] || SEVERITY_CONFIG.medium;
  const status = STATUS_CONFIG[disruption.status] || STATUS_CONFIG.scheduled;
  const TypeIcon = TYPE_ICONS[disruption.type] || Zap;

  return (
    <View style={[styles.card, { borderTopColor: severity.color, borderTopWidth: 3 }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: severity.bg }]}>
          <TypeIcon size={18} color={severity.color} strokeWidth={2.5} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{disruption.title}</Text>
          <Text style={styles.city}>{disruption.city}</Text>
        </View>
        <View style={styles.right}>
          <View style={[styles.severityPill, { backgroundColor: severity.bg, borderColor: severity.border }]}>
            <Text style={[styles.severityText, { color: severity.color }]}>{severity.label}</Text>
          </View>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Affected Workers</Text>
          <Text style={[styles.statValue, { color: severity.color }]}>
            {disruption.affectedWorkers.toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Predicted Loss</Text>
          <Text style={[styles.statValue, { color: '#F97316' }]}>
            ₹{(disruption.predictedIncomeLoss / 100000).toFixed(1)}L
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Probability</Text>
          <Text style={[styles.statValue, { color: '#2563EB' }]}>{disruption.probability}%</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>⏱ {disruption.startTime} · {disruption.duration}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8EEF8',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  city: { fontSize: 11, color: '#64748B', marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  severityPill: { borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  severityText: { fontSize: 10, fontWeight: '700' },
  statusText: { fontSize: 10, fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10 },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600', marginBottom: 3 },
  statValue: { fontSize: 15, fontWeight: '900' },
  statDivider: { width: 1, height: 30, backgroundColor: '#E2E8F0' },
  footer: { marginTop: 10 },
  footerText: { fontSize: 11, color: '#64748B' },
});
