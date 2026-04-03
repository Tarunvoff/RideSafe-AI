import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Circle, Polyline, Svg } from 'react-native-svg';
import AdminShell from '../../components/AdminShell';
import LoadingOverlay from '../../components/LoadingOverlay';
import { adminApi } from '../../services/api';
import { Theme } from '../../theme';

export default function AdminAnalyticsScreen({ navigation }: any) {
  const [summary, setSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const handleBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate('AdminDashboard');
  };

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getDashboard();
      setSummary(res ?? null);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const safeSummary = summary ?? {
    riskTrend: [],
    payoutTrend: [],
    workersByCity: [],
    platformSplit: [],
    claimsByType: [],
    alertsByType: [],
    fraudStatusSplit: [],
  };

  const formatINR = useMemo(
    () => (value: number) => `₹${Math.round(value ?? 0).toLocaleString('en-IN')}`,
    [],
  );

  const riskSeries = useMemo(
    () =>
      (safeSummary.riskTrend ?? [])
        .map((item: any) => Number(item.avg_risk ?? 0))
        .slice(-7),
    [safeSummary.riskTrend],
  );

  const payoutSeries = useMemo(
    () =>
      (safeSummary.payoutTrend ?? [])
        .map((item: any) => Number(item.total_payout ?? 0))
        .slice(-7),
    [safeSummary.payoutTrend],
  );

  const topCities = useMemo(
    () => (safeSummary.workersByCity ?? []).slice(0, 5),
    [safeSummary.workersByCity],
  );

  const topPlatforms = useMemo(
    () => (safeSummary.platformSplit ?? []).slice(0, 5),
    [safeSummary.platformSplit],
  );

  const topClaims = useMemo(
    () => (safeSummary.claimsByType ?? []).slice(0, 5),
    [safeSummary.claimsByType],
  );

  const topAlerts = useMemo(
    () => (safeSummary.alertsByType ?? []).slice(0, 5),
    [safeSummary.alertsByType],
  );

  const topFraudStatus = useMemo(
    () => (safeSummary.fraudStatusSplit ?? []).slice(0, 5),
    [safeSummary.fraudStatusSplit],
  );

  return (
    <AdminShell navigation={navigation} activeKey="dash">
      <LoadingOverlay visible={loading} message="Loading analytics..." />
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} activeOpacity={0.8} onPress={handleBack}>
            <MaterialIcons name="arrow-back" size={20} color={Theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>ANALYTICS</Text>
            <Text style={styles.headerSubtitle}>TAMIL NADU OPERATIONS</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionKicker}>FRAUD SIGNALS</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardRow}
            >
              <ChartCard title="Risk Trend" subtitle="Avg risk score (7 days)">
                <LineChart data={riskSeries} stroke={Theme.colors.primary} />
              </ChartCard>
              <ChartCard title="Fraud Status Mix" subtitle="Analyst outcomes">
                <BarList data={topFraudStatus} accent="#14b8a6" />
              </ChartCard>
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionKicker}>CLAIMS & PAYOUTS</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardRow}
            >
              <ChartCard title="Payout Velocity" subtitle="Approved payouts (7 days)">
                <LineChart data={payoutSeries} stroke="#0ea5e9" valueFormatter={formatINR} />
              </ChartCard>
              <ChartCard title="Claims by Type" subtitle="Last 30 days">
                <BarList data={topClaims} accent="#6366f1" />
              </ChartCard>
              <ChartCard title="Alerts by Type" subtitle="Last 30 days">
                <BarList data={topAlerts} accent="#ef4444" />
              </ChartCard>
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionKicker}>DRIVER DISTRIBUTION</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardRow}
            >
              <ChartCard title="Workers by City" subtitle="Tamil Nadu cluster">
                <BarList data={topCities} accent="#22c55e" />
              </ChartCard>
              <ChartCard title="Platform Split" subtitle="Active fleet share">
                <BarList data={topPlatforms} accent="#f59e0b" />
              </ChartCard>
            </ScrollView>
          </View>
        </ScrollView>
      </View>
    </AdminShell>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>{title}</Text>
        {subtitle ? <Text style={styles.chartSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.chartBody}>{children}</View>
    </View>
  );
}

function LineChart({
  data,
  stroke,
  valueFormatter,
}: {
  data: number[];
  stroke: string;
  valueFormatter?: (value: number) => string;
}) {
  const width = 220;
  const height = 64;
  const padding = 6;
  const maxValue = Math.max(1, ...data);
  const minValue = Math.min(...data, 0);
  const range = Math.max(1, maxValue - minValue);
  const points = data
    .map((value, index) => {
      const x = padding + (index / Math.max(1, data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((value - minValue) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <View style={styles.lineChartWrap}>
      <Svg width={width} height={height}>
        <Polyline points={points} fill="none" stroke={stroke} strokeWidth={2} />
        {data.map((value, index) => {
          const x = padding + (index / Math.max(1, data.length - 1)) * (width - padding * 2);
          const y = height - padding - ((value - minValue) / range) * (height - padding * 2);
          return <Circle key={`pt-${index}`} cx={x} cy={y} r={3} fill={stroke} />;
        })}
      </Svg>
      {valueFormatter ? (
        <Text style={styles.lineChartCaption}>
          Latest: {valueFormatter(data[data.length - 1] ?? 0)}
        </Text>
      ) : null}
    </View>
  );
}


function BarList({ data, accent }: { data: Array<{ label: string; value: number }>; accent: string }) {
  const maxValue = Math.max(1, ...(data ?? []).map((item) => item.value ?? 0));
  return (
    <View style={styles.barListWrap}>
      {(data ?? []).map((item, index) => (
        <View key={`${item.label}-${index}`} style={styles.barListRow}>
          <View style={styles.barListLabelCol}>
            <Text style={styles.barListLabel}>{item.label}</Text>
            <Text style={styles.barListValue}>{item.value}</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${Math.round((item.value / maxValue) * 100)}%`, backgroundColor: accent }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Theme.colors.background },
  scrollContent: { paddingBottom: 110 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.xxl,
    paddingBottom: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.background,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 3,
    color: Theme.colors.text,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
    color: Theme.colors.textSecondary,
  },
  section: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.sm,
    gap: Theme.spacing.xs,
  },
  sectionKicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    color: Theme.colors.text,
  },
  chartCard: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.xs,
    backgroundColor: Theme.colors.background,
    gap: Theme.spacing.xs,
    width: 260,
  },
  chartHeader: { gap: 4 },
  chartTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  chartSubtitle: {
    fontSize: 10,
    color: Theme.colors.textSecondary,
  },
  chartBody: { gap: Theme.spacing.xs },
  lineChartWrap: {
    alignItems: 'flex-start',
    gap: 6,
  },
  lineChartCaption: {
    fontSize: 10,
    color: Theme.colors.textSecondary,
    fontWeight: '700',
  },
  barListWrap: {
    gap: 4,
  },
  barListRow: {
    gap: 6,
  },
  barListLabelCol: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barListLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  barListValue: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
  },
  barTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: Theme.colors.surface,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  cardRow: {
    paddingTop: Theme.spacing.xs,
    paddingBottom: Theme.spacing.xs,
    gap: Theme.spacing.sm,
  },
});
