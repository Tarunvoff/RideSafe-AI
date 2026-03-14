import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle, Shield, Activity } from 'lucide-react-native';
import { COLORS, RADIUS } from '../constants/colors';

const STATUS_CONFIG = {
  pass: {
    color: COLORS.green,
    label: 'PASS',
    icon: Shield,
  },
  warn: {
    color: COLORS.orange,
    label: 'WARN',
    icon: Activity,
  },
  fail: {
    color: COLORS.red,
    label: 'FAIL',
    icon: AlertTriangle,
  },
};

export default function PresenceLayerCard({ layer }) {
  const config = STATUS_CONFIG[layer?.status] || STATUS_CONFIG.warn;
  const Icon = config.icon;

  return (
    <View style={[styles.card, { borderColor: `${config.color}55` }]}>
      <View style={styles.topRow}>
        <View style={styles.titleWrap}>
          <Icon size={14} color={config.color} strokeWidth={2.5} />
          <Text style={styles.title}>{layer?.title}</Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: `${config.color}20`, borderColor: `${config.color}55` }]}>
          <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
        </View>
      </View>

      <Text style={styles.description}>{layer?.description}</Text>

      <View style={styles.meterRow}>
        <View style={styles.meterTrack}>
          <View
            style={[
              styles.meterFill,
              {
                width: `${Math.min(100, Math.max(0, layer?.scorePct || 0))}%`,
                backgroundColor: config.color,
              },
            ]}
          />
        </View>
        <Text style={[styles.scoreText, { color: config.color }]}>{layer?.scorePct ?? 0}%</Text>
      </View>

      {!!layer?.signals?.length && (
        <View style={styles.signalsWrap}>
          {layer.signals.slice(0, 2).map((signal) => (
            <Text key={signal} style={styles.signalText}>• {signal}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(15,23,42,0.72)',
    borderRadius: RADIUS.lg,
    padding: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  title: {
    color: COLORS.textWhite,
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  description: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 8,
  },
  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  meterTrack: {
    flex: 1,
    height: 6,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  meterFill: {
    height: 6,
    borderRadius: RADIUS.full,
  },
  scoreText: {
    fontSize: 11,
    fontWeight: '800',
    minWidth: 34,
    textAlign: 'right',
  },
  signalsWrap: {
    marginTop: 8,
  },
  signalText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    marginBottom: 2,
  },
});
