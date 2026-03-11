import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Shield, FileText, Bell, ChevronRight, LogOut, Star, MapPin, Phone, Mail, Car } from 'lucide-react-native';
import { MOCK_WORKER } from '../data/mockData';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/colors';

const MENU_ITEMS = [
  { icon: Shield, label: 'My Policy', sub: 'Pro Guard · Active', color: COLORS.blue },
  { icon: FileText, label: 'Claims History', sub: '3 claims filed', color: COLORS.green },
  { icon: Bell, label: 'Notifications', sub: 'Manage alerts', color: COLORS.orange },
  { icon: Star, label: 'Upgrade Plan', sub: 'Explore Elite Guard', color: COLORS.yellow },
  { icon: LogOut, label: 'Sign Out', sub: '', color: COLORS.red },
];

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start(); }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
      <View style={[styles.header, { paddingTop: insets.top + 8, paddingBottom: SPACING.lg }]}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{MOCK_WORKER.initials || 'RK'}</Text>
          </View>
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✓</Text>
          </View>
        </View>
        <Text style={styles.workerName}>{MOCK_WORKER.name}</Text>
        <Text style={styles.workerSub}>{MOCK_WORKER.platform} · {MOCK_WORKER.zone}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>₹{(MOCK_WORKER.accountBalance||3840).toLocaleString('en-IN')}</Text>
            <Text style={styles.statLbl}>Balance</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{MOCK_WORKER.policyId || 'POL-2026-003891'}</Text>
            <Text style={styles.statLbl}>Policy ID</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: '#4ADE80' }]}>Active</Text>
            <Text style={styles.statLbl}>Status</Text>
          </View>
        </View>
      </View>

      <Animated.ScrollView style={{ opacity: fadeAnim }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.infoCard, SHADOWS.card]}>
          <Text style={styles.infoTitle}>Personal Details</Text>
          {[
            { icon: Phone, label: MOCK_WORKER.phone || '+91 98765 43210' },
            { icon: Mail, label: MOCK_WORKER.email || 'rahul.kumar@swiggy.in' },
            { icon: MapPin, label: MOCK_WORKER.address || 'Koramangala, Bengaluru 560034' },
            { icon: Car, label: MOCK_WORKER.vehicleNumber || 'KA-05-MN-7832' },
          ].map(({ icon: Icon, label }) => (
            <View key={label} style={styles.infoRow}>
              <View style={styles.infoIconWrap}><Icon size={14} color={COLORS.blue} strokeWidth={2.5} /></View>
              <Text style={styles.infoLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.menuSection}>Account</Text>
        {MENU_ITEMS.map(({ icon: Icon, label, sub, color }) => (
          <TouchableOpacity key={label} activeOpacity={0.8} style={[styles.menuItem, SHADOWS.card]}>
            <View style={[styles.menuIcon, { backgroundColor: color + '18' }]}>
              <Icon size={16} color={color} strokeWidth={2.5} />
            </View>
            <View style={styles.menuText}>
              <Text style={[styles.menuLabel, color === COLORS.red && { color: COLORS.red }]}>{label}</Text>
              {sub ? <Text style={styles.menuSub}>{sub}</Text> : null}
            </View>
            {color !== COLORS.red && <ChevronRight size={15} color={COLORS.textMuted} strokeWidth={2} />}
          </TouchableOpacity>
        ))}

        <Text style={styles.versionText}>Blink Insurance v1.0.0 · Policy backed by IRDAI</Text>

        <View style={{ height: 100 }} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgPrimary },
  header: { backgroundColor: COLORS.navy, paddingHorizontal: SPACING.md, alignItems: 'center' },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  avatarText: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
  verifiedBadge: { position: 'absolute', bottom: 2, right: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.navy },
  verifiedText: { fontSize: 10, color: '#FFFFFF', fontWeight: '800' },
  workerName: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  workerSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 16 },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: RADIUS.xl, padding: SPACING.sm, width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  statLbl: { fontSize: 9, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  scroll: { padding: SPACING.md },
  infoCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.bgBorder },
  infoTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  infoIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: COLORS.blueLight, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 13, color: COLORS.textSecondary },
  menuSection: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.sm },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.bgBorder, gap: 12 },
  menuIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  menuSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  versionText: { fontSize: 10, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.sm },
});
