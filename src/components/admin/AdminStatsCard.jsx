import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';

/**
 * AdminStatsCard – compact metric tile for the dashboard overview
 *
 * Props:
 *  label      – string
 *  value      – string | number
 *  sub        – optional subtitle / unit
 *  color      – accent color
 *  trend      – 'up' | 'down' | 'neutral' | undefined
 *  trendValue – string  e.g. '+12%'
 *  icon       – Lucide icon component
 *  wide       – if true, occupies full row width
 */
export default function AdminStatsCard({ label, value, sub, color = '#2563EB', trend, trendValue, icon: Icon, wide }) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : '#94A3B8';

  return (
    <View style={[styles.card, wide && styles.cardWide]}>
      <View style={[styles.iconWrap, { backgroundColor: color + '18' }]}>
        {Icon && <Icon size={18} color={color} strokeWidth={2.5} />}
      </View>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      <Text style={[styles.value, { color }]} numberOfLines={1}>{value}</Text>
      {sub ? <Text style={styles.sub} numberOfLines={1}>{sub}</Text> : null}
      {trend && trendValue ? (
        <View style={styles.trendRow}>
          <TrendIcon size={11} color={trendColor} strokeWidth={2.5} />
          <Text style={[styles.trendText, { color: trendColor }]}>{trendValue}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    margin: 5,
    borderWidth: 1,
    borderColor: '#E8EEF8',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    minWidth: 130,
  },
  cardWide: {
    flex: undefined,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  sub: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
