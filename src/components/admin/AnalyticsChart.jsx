import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');

// ──────────────────────────────────────────────────────────────
// BarChart – vertical bars
// Props: data: [{ label, value }], color, maxValue (optional), height, title
// ──────────────────────────────────────────────────────────────
export function BarChart({ data = [], color = '#2563EB', title, height = 120, accentColor }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);

  return (
    <View style={styles.chartWrap}>
      {title && <Text style={styles.chartTitle}>{title}</Text>}
      <View style={[styles.barContainer, { height }]}>
        {data.map((item, i) => {
          const barH = Math.max((item.value / max) * (height - 24), 4);
          const isLast = i === data.length - 1;
          const barColor = (accentColor && isLast) ? accentColor : color;
          return (
            <View key={i} style={styles.barCol}>
              <Text style={styles.barValue}>
                {item.value >= 1000 ? `${(item.value / 1000).toFixed(1)}k` : item.value}
              </Text>
              <View style={[styles.bar, { height: barH, backgroundColor: barColor + (isLast ? 'FF' : 'AA') }]} />
              <Text style={styles.barLabel} numberOfLines={1}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
// PieChart (simulated with colored rows + proportional widths)
// Props: data: [{ label, value, color }], title
// ──────────────────────────────────────────────────────────────
export function PieChart({ data = [], title }) {
  if (!data.length) return null;
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <View style={styles.chartWrap}>
      {title && <Text style={styles.chartTitle}>{title}</Text>}

      {/* Proportional horizontal bar */}
      <View style={styles.pieBar}>
        {data.map((item, i) => (
          <View
            key={i}
            style={[
              styles.pieSegment,
              {
                flex: item.value,
                backgroundColor: item.color,
                borderTopLeftRadius: i === 0 ? 8 : 0,
                borderBottomLeftRadius: i === 0 ? 8 : 0,
                borderTopRightRadius: i === data.length - 1 ? 8 : 0,
                borderBottomRightRadius: i === data.length - 1 ? 8 : 0,
              },
            ]}
          />
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {data.map((item, i) => (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendLabel}>{item.label}</Text>
            <Text style={styles.legendValue}>
              {Math.round((item.value / total) * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
// TrendLine – sparkline using proportional heights
// Props: data: number[], color, title, subtitle
// ──────────────────────────────────────────────────────────────
export function TrendLine({ data = [], color = '#2563EB', title, subtitle, height = 80 }) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  return (
    <View style={styles.chartWrap}>
      {title && (
        <View style={styles.trendHeader}>
          <Text style={styles.chartTitle}>{title}</Text>
          {subtitle && <Text style={[styles.trendSub, { color }]}>{subtitle}</Text>}
        </View>
      )}
      <View style={[styles.trendContainer, { height }]}>
        {data.map((v, i) => {
          const barH = Math.max(((v - min) / range) * (height - 8), 4);
          const isLast = i === data.length - 1;
          return (
            <View key={i} style={styles.trendBarWrap}>
              <View
                style={[
                  styles.trendBar,
                  {
                    height: barH,
                    backgroundColor: isLast ? color : color + '55',
                    borderRadius: 4,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
// StatRow – horizontal key-value stat (for analytics summary)
// ──────────────────────────────────────────────────────────────
export function StatRow({ label, value, color = '#0F172A', percentage }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statRowLabel}>{label}</Text>
      <View style={styles.statRowRight}>
        {percentage !== undefined && (
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${Math.min(percentage, 100)}%`, backgroundColor: color }]}
            />
          </View>
        )}
        <Text style={[styles.statRowValue, { color }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8EEF8',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingHorizontal: 2,
  },
  barValue: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
  },
  bar: {
    width: '80%',
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 8,
    color: '#94A3B8',
    maxWidth: 36,
    textAlign: 'center',
  },
  pieBar: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  pieSegment: { height: '100%' },
  legend: { gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendLabel: { flex: 1, fontSize: 12, color: '#334155', fontWeight: '600' },
  legendValue: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  trendHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  trendSub: { fontSize: 12, fontWeight: '700' },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  trendBarWrap: { flex: 1, justifyContent: 'flex-end', height: '100%' },
  trendBar: { width: '100%' },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  statRowLabel: { flex: 1, fontSize: 13, color: '#334155', fontWeight: '600' },
  statRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: { width: 80, height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  statRowValue: { fontSize: 13, fontWeight: '800', minWidth: 50, textAlign: 'right' },
});
