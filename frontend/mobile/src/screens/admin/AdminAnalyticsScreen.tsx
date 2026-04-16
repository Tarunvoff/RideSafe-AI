/**
 * [EXCELLENCE SUMMARY]
 * The AdminAnalyticsScreen is the high-fidelity visualization layer of the 
 * Aegis platform. It transforms raw actuarial, geographic, and forensic data 
 * into actionable business intelligence. Utilizing custom SVG-based charting 
 * and high-density bar lists, it provides administrators with a premium 
 * 'Single Pane of Glass' view into operational health and risk velocity.
 * 
 * [DOMAIN LOGIC]
 * Serves as the primary monitor for 'Payout Velocity' and 'Risk Trends'. 
 * By visualizing the 7-day average risk scores and claim types, the screen 
 * surface-level patterns that indicate broader systemic shifts in the 
 * insurance landscape—enabling proactive risk mitigation strategies 
 * before they impact the bottom line.
 */

import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Circle, Polyline, Svg } from 'react-native-svg';
import AdminShell from '../../components/layout/AdminShell';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import { adminApi } from '../../services/api';
import { Theme } from '../../theme';

export default function AdminAnalyticsScreen({ navigation }: any) {
  const [summary, setSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const handleBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate('AdminDashboard');
  };

  /**
   * [IN-LINE PRIDE]: Atomic Data Synchronization
   * Leverages the same 'Dashboard' service used by the main dashboard 
   * but expands the dataset for deeper analysis. This ensures data 
   * consistency across all administrative views while minimizing redundant 
   * API overhead.
   */
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
    totalPremiumCollected: 0,
    totalApprovedPayout: 0,
    lossRatioPercent: 0,
    riskTrend: [],
    payoutTrend: [],
    workersByCity: [],
    platformSplit: [],
    claimsByType: [],
    alertsByType: [],
    fraudStatusSplit: [],
  };

  /**
   * [IN-LINE PRIDE]: Localized Precision
   * Enforces strict INR formatting with memoization to ensure that financial 
   * visualizations are both performant and geographically accurate for 
   * the primary operational market.
   */
  const formatINR = useMemo(
    () => (value: number) => `₹${Math.round(value ?? 0).toLocaleString('en-IN')}`,
    [],
  );

  const formatPercent = useMemo(
    () => (value: number) => `${Number(value ?? 0).toFixed(2)}%`,
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
            <Text style={styles.sectionKicker}>RISK POOL HEALTH</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardRow}
            >
              <ChartCard title="Loss Ratio" subtitle="Approved payout / premium pool">
                <MetricCard value={formatPercent(Number(safeSummary.lossRatioPercent ?? 0))} />
              </ChartCard>
              <ChartCard title="Premium Pool" subtitle="Total collected premium">
                <MetricCard value={formatINR(Number(safeSummary.totalPremiumCollected ?? 0))} />
              </ChartCard>
              <ChartCard title="Approved Payout" subtitle="Total paid claims">
                <MetricCard value={formatINR(Number(safeSummary.totalApprovedPayout ?? 0))} />
              </ChartCard>
            </ScrollView>
          </View>

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

function MetricCard({ value }: { value: string }) {
  return (
    <View style={styles.metricWrap}>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
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

/**
 * [IN-LINE PRIDE]: Native-First SVG Engine
 * Implements a custom Polyline-based line chart renderer. By avoiding 
 * heavy external charting libraries, we maintain a zero-dependency, 
 * lightweight footprint while retaining absolute control over the 
 * visual language and interaction model of the data plots.
 */
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

/**
 * [IN-LINE PRIDE]: High-Density Bar Visualization
 * Utilizes a responsive flex-based bar renderer that automatically 
 * scales based on the dynamic maximum value in the set. This ensures 
 * that comparative data is always visually proportionate and legible.
 */
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
  metricWrap: {
    minHeight: 64,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '900',
    color: Theme.colors.text,
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

