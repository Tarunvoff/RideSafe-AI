import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertTriangle, CloudRain, Wind, Zap, MapPin, Clock,
  ChevronDown, ChevronRight, Radio, TrendingDown, IndianRupee,
} from 'lucide-react-native';
import { MOCK_ALERTS, MOCK_WORKER } from '../data/mockData';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/colors';

const FILTERS = ['All', 'Live', 'Upcoming', 'Weather', 'AQI'];

const ICON_MAP = { weather: CloudRain, aqi: Wind, heat: Zap, disruption: MapPin };

export default function DisruptionAlertsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(1);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const liveAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    Animated.loop(Animated.sequence([
      Animated.timing(liveAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
      Animated.timing(liveAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ])).start();
    // Stagger alerts appearing for real feel
    const steps = [1, 2, 3, 4, 5];
    steps.forEach((n, i) => {
      setTimeout(() => setVisibleCount(n), i * 800);
    });
  }, []);

  const filtered = MOCK_ALERTS.filter((a) => {
    if (filter === 'All') return true;
    if (filter === 'Live') return a.isActive;
    if (filter === 'Upcoming') return !a.isActive;
    if (filter === 'Weather') return a.type === 'weather' || a.type === 'heat';
    if (filter === 'AQI') return a.type === 'aqi';
    return true;
  });

  const activeCount = MOCK_ALERTS.filter((a) => a.isActive).length;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerSub}>Hello, {MOCK_WORKER.firstName}</Text>
            <Text style={styles.headerTitle}>Disruption Alerts</Text>
          </View>
          <View style={styles.liveIndicator}>
            <Animated.View style={[styles.liveDot, { opacity: liveAnim }]} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        {activeCount > 0 && (
          <View style={styles.criticalBanner}>
            <Radio size={14} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.criticalBannerText}>
              {activeCount} active disruption{activeCount > 1 ? 's' : ''} detected in {MOCK_WORKER.zone}
            </Text>
          </View>
        )}

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filtersContent}>
          {FILTERS.map((f) => (
            <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.filterChip, filter === f && styles.filterChipActive]}>
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
              {f === 'Live' && activeCount > 0 && (
                <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{activeCount}</Text></View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Animated.ScrollView style={[styles.scroll, { opacity: fadeAnim }]} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Impact summary */}
        <View style={[styles.impactCard, SHADOWS.card]}>
          <View style={styles.impactItem}>
            <TrendingDown size={18} color={COLORS.red} strokeWidth={2} />
            <Text style={styles.impactValue}>-₹{MOCK_ALERTS.reduce((s, a) => s + (a.isActive ? a.expectedLoss : 0), 0)}</Text>
            <Text style={styles.impactLabel}>At-risk earnings</Text>
          </View>
          <View style={styles.impactDivider} />
          <View style={styles.impactItem}>
            <IndianRupee size={18} color={COLORS.green} strokeWidth={2} />
            <Text style={[styles.impactValue, { color: COLORS.green }]}>+₹{MOCK_ALERTS.reduce((s, a) => s + (a.isActive ? a.expectedPayout : 0), 0)}</Text>
            <Text style={styles.impactLabel}>Auto-payout ready</Text>
          </View>
          <View style={styles.impactDivider} />
          <View style={styles.impactItem}>
            <AlertTriangle size={18} color={COLORS.orange} strokeWidth={2} />
            <Text style={styles.impactValue}>{MOCK_ALERTS.length}</Text>
            <Text style={styles.impactLabel}>Total alerts</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>
          {filter === 'Live' ? 'Active Right Now' : filter === 'Upcoming' ? 'Scheduled Alerts' : 'All Alerts'} · {filtered.length} alerts
        </Text>

        {filtered.slice(0, visibleCount).map((alert, index) => (
          <AlertFeedCard
            key={alert.id}
            alert={alert}
            index={index}
            expanded={expandedId === alert.id}
            onToggle={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
          />
        ))}

        {visibleCount < filtered.length && (
          <View style={styles.loadingMore}>
            <View style={styles.loadingDot} />
            <View style={[styles.loadingDot, { marginHorizontal: 4 }]} />
            <View style={styles.loadingDot} />
            <Text style={styles.loadingText}>Fetching more alerts...</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </Animated.ScrollView>
    </View>
  );
}

function AlertFeedCard({ alert, index, expanded, onToggle }) {
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;

  const Icon = ICON_MAP[alert.type] || AlertTriangle;
  const severityConfig = {
    critical: { color: COLORS.red, bg: COLORS.redLight, label: 'CRITICAL', border: '#FCA5A5' },
    high:     { color: COLORS.orange, bg: COLORS.orangeLight, label: 'HIGH', border: '#FED7AA' },
    medium:   { color: COLORS.yellow, bg: COLORS.yellowLight, label: 'MEDIUM', border: '#FEF08A' },
    low:      { color: COLORS.blue, bg: COLORS.blueLight, label: 'LOW', border: '#BFDBFE' },
  };
  const sc = severityConfig[alert.severity] || severityConfig.low;

  useEffect(() => {
    const delay = index * 120;
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.timing(opacAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();
    }, delay);

    if (alert.isActive) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])).start();
    }
  }, []);

  useEffect(() => {
    Animated.timing(expandAnim, { toValue: expanded ? 1 : 0, duration: 250, useNativeDriver: false }).start();
  }, [expanded]);

  const expandHeight = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 200] });

  return (
    <Animated.View style={[{ opacity: opacAnim, transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.9}
        style={[styles.alertCard, { borderLeftColor: sc.color }, SHADOWS.card]}
      >
        <View style={styles.alertCardInner}>
          <View style={[styles.alertIconWrap, { backgroundColor: sc.bg }]}>
            <Icon size={18} color={sc.color} strokeWidth={2.5} />
          </View>

          <View style={styles.alertBody}>
            <View style={styles.alertTop}>
              <View style={[styles.severityBadge, { backgroundColor: sc.bg }]}>
                {alert.isActive && (
                  <Animated.View style={[styles.activeDot, { backgroundColor: sc.color, transform: [{ scale: pulseAnim }] }]} />
                )}
                <Text style={[styles.severityText, { color: sc.color }]}>
                  {alert.isActive ? '● LIVE' : '○ UPCOMING'} · {sc.label}
                </Text>
              </View>
              <View style={styles.alertTimeRow}>
                <Clock size={10} color={COLORS.textMuted} strokeWidth={2} />
                <Text style={styles.alertTime}>{alert.timestamp}</Text>
              </View>
            </View>

            <Text style={styles.alertTitle}>{alert.title}</Text>
            <View style={styles.alertZoneRow}>
              <MapPin size={11} color={COLORS.textMuted} strokeWidth={2} />
              <Text style={styles.alertZone}>{alert.subtitle}</Text>
            </View>

            <View style={styles.alertStats}>
              <View style={styles.alertStat}>
                <Text style={styles.alertStatLabel}>Probability</Text>
                <View style={styles.alertStatBar}>
                  <View style={[styles.alertStatFill, { width: `${alert.probability}%`, backgroundColor: sc.color }]} />
                </View>
                <Text style={[styles.alertStatValue, { color: sc.color }]}>{alert.probability}%</Text>
              </View>
              <View style={styles.alertStatDivider} />
              <View style={styles.alertPayoutRow}>
                <View>
                  <Text style={styles.alertStatLabel}>Income Risk</Text>
                  <Text style={[styles.alertPayoutVal, { color: COLORS.red }]}>-₹{alert.expectedLoss}</Text>
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.alertStatLabel}>Coverage</Text>
                  <Text style={[styles.alertPayoutVal, { color: COLORS.green }]}>+₹{alert.expectedPayout}</Text>
                </View>
              </View>
            </View>
          </View>

          <ChevronDown
            size={16}
            color={COLORS.textMuted}
            strokeWidth={2}
            style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
          />
        </View>

        {/* Expandable detail */}
        <Animated.View style={{ height: expandHeight, overflow: 'hidden' }}>
          <View style={styles.alertDetail}>
            <Text style={styles.alertDetailText}>{alert.description}</Text>
            <View style={styles.alertDetailRow}>
              <View style={styles.alertDetailItem}>
                <Text style={styles.alertDetailLabel}>Starts</Text>
                <Text style={styles.alertDetailValue}>{alert.timeStart}</Text>
              </View>
              <View style={styles.alertDetailItem}>
                <Text style={styles.alertDetailLabel}>Duration</Text>
                <Text style={styles.alertDetailValue}>{alert.duration}</Text>
              </View>
            </View>
            <Text style={styles.alertDetailLabel}>Affected Zones</Text>
            <View style={styles.zoneChips}>
              {alert.affectedZones.map((z) => (
                <View key={z} style={styles.zoneChip}>
                  <Text style={styles.zoneChipText}>{z}</Text>
                </View>
              ))}
            </View>
            {alert.isActive && (
              <View style={[styles.autoPayoutBanner]}>
                <Zap size={13} color={COLORS.green} strokeWidth={2.5} />
                <Text style={styles.autoPayoutText}>Auto-payout of ₹{alert.expectedPayout} will be triggered automatically</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgPrimary },
  header: { backgroundColor: COLORS.navy, paddingHorizontal: SPACING.md, paddingBottom: 0 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(239,68,68,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  liveText: { fontSize: 11, fontWeight: '800', color: '#EF4444', letterSpacing: 1 },
  criticalBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: RADIUS.md, padding: SPACING.sm, marginBottom: SPACING.sm, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  criticalBannerText: { fontSize: 12, color: '#FCA5A5', fontWeight: '600', flex: 1 },
  filtersScroll: { marginBottom: 0 },
  filtersContent: { paddingBottom: SPACING.md, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', flexDirection: 'row', alignItems: 'center', gap: 5 },
  filterChipActive: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  filterText: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  filterTextActive: { color: COLORS.navy, fontWeight: '700' },
  filterBadge: { backgroundColor: COLORS.red, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  filterBadgeText: { fontSize: 9, color: '#fff', fontWeight: '800' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md },
  impactCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, flexDirection: 'row', padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.bgBorder },
  impactItem: { flex: 1, alignItems: 'center', gap: 4 },
  impactDivider: { width: 1, backgroundColor: COLORS.bgBorder },
  impactValue: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  impactLabel: { fontSize: 9, color: COLORS.textMuted, textAlign: 'center' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.sm },
  alertCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.bgBorder, borderLeftWidth: 4, overflow: 'hidden' },
  alertCardInner: { flexDirection: 'row', alignItems: 'flex-start', padding: SPACING.md, gap: 12 },
  alertIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  alertBody: { flex: 1 },
  alertTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  severityBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  activeDot: { width: 5, height: 5, borderRadius: 2.5 },
  severityText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  alertTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  alertTime: { fontSize: 10, color: COLORS.textMuted },
  alertTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 3 },
  alertZoneRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 10 },
  alertZone: { fontSize: 11, color: COLORS.textMuted },
  alertStats: { flexDirection: 'row', alignItems: 'center' },
  alertStat: { flex: 1 },
  alertStatLabel: { fontSize: 9, color: COLORS.textMuted, marginBottom: 3 },
  alertStatBar: { height: 4, backgroundColor: COLORS.bgBorder, borderRadius: 2, marginBottom: 3 },
  alertStatFill: { height: 4, borderRadius: 2 },
  alertStatValue: { fontSize: 11, fontWeight: '700' },
  alertStatDivider: { width: 1, height: 32, backgroundColor: COLORS.bgBorder, marginHorizontal: 10 },
  alertPayoutRow: { flexDirection: 'row' },
  alertPayoutVal: { fontSize: 13, fontWeight: '800' },
  alertDetail: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.bgBorder, paddingTop: SPACING.sm },
  alertDetailText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 10 },
  alertDetailRow: { flexDirection: 'row', gap: SPACING.lg, marginBottom: 10 },
  alertDetailItem: {},
  alertDetailLabel: { fontSize: 10, color: COLORS.textMuted, marginBottom: 2 },
  alertDetailValue: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  zoneChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4, marginBottom: 10 },
  zoneChip: { backgroundColor: COLORS.blueLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  zoneChipText: { fontSize: 10, color: COLORS.blue, fontWeight: '600' },
  autoPayoutBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.greenLight, borderRadius: RADIUS.md, padding: SPACING.sm, borderWidth: 1, borderColor: '#A7F3D0' },
  autoPayoutText: { fontSize: 11, color: COLORS.green, fontWeight: '600', flex: 1 },
  loadingMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg, gap: 6 },
  loadingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.blue, opacity: 0.4 },
  loadingText: { fontSize: 11, color: COLORS.textMuted, marginLeft: 6 },
});
