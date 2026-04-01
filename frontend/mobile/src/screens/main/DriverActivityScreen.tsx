import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import DriverBottomNavbar from '../../components/DriverBottomNavbar';
import DriverLogoutMenu from '../../components/DriverLogoutMenu';
import MainTopNavbar from '../../components/MainTopNavbar';
import { useAuth } from '../../context/AuthContext';
import { Theme } from '../../theme';

const palette = {
  background: '#f6f7f5',
  card: '#ffffff',
  mutedCard: '#eff6ef',
  accent: Theme.colors.primary, // same green used in plans
  accentSoft: '#dffbe8',
  text: '#1f1f1f',
  mutedText: '#4b4b4b',
  softBorder: '#d7e6d5',
};

const STORE_PROFILE = {
  platform: 'Blinkit 24x7',
  storeName: 'Koramangala Dark Store',
  h3Cell: 'H3 8F5B2C',
  supervisor: 'Lead Anjali',
  shift: '7 PM – 3 AM',
  rating: 4.9,
};

const WEEKLY_SUMMARY = {
  completed: 186,
  rejected: 6,
  earnings: 7850,
  lastWeekEarnings: 7260,
  surgeBonus: 920,
  hours: 42,
};

const DAILY_EARNINGS = [
  { day: 'Mon', amount: 1180 },
  { day: 'Tue', amount: 980 },
  { day: 'Wed', amount: 1340 },
  { day: 'Thu', amount: 1260 },
  { day: 'Fri', amount: 1450 },
  { day: 'Sat', amount: 1380 },
  { day: 'Sun', amount: 1260 },
];

export default function DriverActivityScreen({ navigation }: any) {
  const { logout, user } = useAuth();
  const [profileMenuVisible, setProfileMenuVisible] = React.useState(false);

  const handleLogout = async () => {
    try {
      setProfileMenuVisible(false);
      await logout();
    } catch (error) {
      setProfileMenuVisible(false);
    }
  };

  const totalOrders = WEEKLY_SUMMARY.completed + WEEKLY_SUMMARY.rejected;
  const successRate = Math.round((WEEKLY_SUMMARY.completed / totalOrders) * 100);
  const earningsDelta = WEEKLY_SUMMARY.earnings - WEEKLY_SUMMARY.lastWeekEarnings;
  const earningsDeltaPct = Math.round(
    (earningsDelta / WEEKLY_SUMMARY.lastWeekEarnings) * 100,
  );
  const maxDaily = Math.max(...DAILY_EARNINGS.map((d) => d.amount));

  return (
    <SafeAreaView style={styles.safeArea}>
      <MainTopNavbar onProfilePress={() => setProfileMenuVisible(true)} />

      <DriverLogoutMenu
        visible={profileMenuVisible}
        userEmail={user?.email ?? null}
        onClose={() => setProfileMenuVisible(false)}
        onLogout={() => {
          void handleLogout();
        }}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Work Pulse</Text>
          <Text style={styles.pageSubtitle}>
            Week view for {user?.driverName ?? 'you'}
          </Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileLeft}>
            <Text style={styles.sectionLabel}>Store</Text>
            <Text style={styles.profileName}>{STORE_PROFILE.storeName}</Text>
            <View style={styles.profileMetaRow}>
              <Text style={styles.profileMeta}>{STORE_PROFILE.platform}</Text>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.profileMeta}>{STORE_PROFILE.shift}</Text>
            </View>
            <View style={styles.profileMetaRow}>
              <Text style={styles.profileMeta}>{STORE_PROFILE.supervisor}</Text>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.profileMeta}>{STORE_PROFILE.h3Cell}</Text>
            </View>
          </View>
          <View style={styles.profileRating}>
            <Ionicons name="star" size={26} color={palette.accent} />
            <Text style={styles.profileRatingValue}>{STORE_PROFILE.rating.toFixed(1)}</Text>
            <Text style={styles.profileRatingLabel}>Score</Text>
          </View>
        </View>

        <View style={styles.statGrid}>
          <View style={[styles.statCard, styles.statCardAccent]}>
            <Text style={styles.statLabel}>Orders Accepted</Text>
            <Text style={styles.statValue}>{WEEKLY_SUMMARY.completed}</Text>
            <Text style={styles.statHint}>Week</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Orders Skipped</Text>
            <Text style={styles.statValue}>{WEEKLY_SUMMARY.rejected}</Text>
            <Text style={styles.statHint}>Manual</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>On-time Delivered</Text>
            <Text style={styles.statValue}>{successRate}%</Text>
            <Text style={styles.statHint}>Done</Text>
          </View>
        </View>

        <View style={styles.earningsCard}>
          <Text style={styles.sectionLabel}>Weekly earnings</Text>
          <View style={styles.earningsRow}>
            <Text style={styles.earningsValue}>₹{WEEKLY_SUMMARY.earnings.toLocaleString('en-IN')}</Text>
            <View style={styles.trendPill}>
              <Ionicons
                name={earningsDelta >= 0 ? 'arrow-up' : 'arrow-down'}
                size={18}
                color={palette.accent}
              />
              <Text style={styles.trendText}>{earningsDelta >= 0 ? '+' : ''}{earningsDeltaPct}%</Text>
            </View>
          </View>
          <Text style={styles.earningsMeta}>Bonus ₹{WEEKLY_SUMMARY.surgeBonus} · {WEEKLY_SUMMARY.hours} hrs</Text>
          <Text style={styles.earningsMeta}>Prev ₹{WEEKLY_SUMMARY.lastWeekEarnings.toLocaleString('en-IN')}</Text>
        </View>

        <View style={styles.dailyCard}>
          <Text style={styles.sectionLabel}>Week strip</Text>
          {DAILY_EARNINGS.map((item) => {
            const widthPct = Math.max(20, Math.round((item.amount / maxDaily) * 100));
            return (
              <View key={item.day} style={styles.dailyRow}>
                <Text style={styles.dailyDay}>{item.day}</Text>
                <View style={styles.dailyBarTrack}>
                  <View style={[styles.dailyBarFill, { width: `${widthPct}%` }]} />
                </View>
                <Text style={styles.dailyAmount}>₹{item.amount}</Text>
              </View>
            );
          })}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <DriverBottomNavbar navigation={navigation} activeKey="activity" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  content: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
    paddingBottom: 120,
    gap: Theme.spacing.lg,
  },
  pageHeader: { gap: 6 },
  pageTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: palette.text,
  },
  pageSubtitle: {
    fontSize: 16,
    color: palette.mutedText,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 14,
    color: palette.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  profileCard: {
    backgroundColor: palette.card,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: palette.softBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  profileLeft: { flex: 1, gap: 4 },
  profileName: {
    fontSize: 22,
    fontWeight: '900',
    color: palette.text,
  },
  profileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bullet: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.mutedText,
  },
  profileMeta: {
    fontSize: 15,
    color: palette.mutedText,
    fontWeight: '600',
  },
  profileRating: {
    width: 90,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: palette.mutedCard,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.md,
    borderWidth: 1,
    borderColor: palette.softBorder,
  },
  profileRatingValue: {
    fontSize: 36,
    fontWeight: '900',
    color: palette.text,
  },
  profileRatingLabel: {
    fontSize: 12,
    color: palette.mutedText,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statGrid: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  statCard: {
    flex: 1,
    borderRadius: Theme.borderRadius.md,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderWidth: 1,
    borderColor: palette.softBorder,
    backgroundColor: palette.card,
    gap: 4,
  },
  statCardAccent: {
    backgroundColor: palette.mutedCard,
  },
  statLabel: {
    fontSize: 13,
    color: palette.mutedText,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '900',
    color: palette.text,
  },
  statHint: {
    fontSize: 14,
    color: palette.mutedText,
  },
  earningsCard: {
    backgroundColor: palette.card,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: palette.softBorder,
    padding: Theme.spacing.lg,
    gap: 10,
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  earningsValue: {
    fontSize: 42,
    fontWeight: '900',
    color: palette.text,
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: palette.mutedCard,
  },
  trendText: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.text,
  },
  earningsMeta: {
    fontSize: 15,
    color: palette.mutedText,
    fontWeight: '600',
  },
  dailyCard: {
    backgroundColor: palette.card,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: palette.softBorder,
    padding: Theme.spacing.lg,
    gap: 12,
  },
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dailyDay: {
    width: 40,
    fontSize: 18,
    fontWeight: '800',
    color: palette.text,
  },
  dailyBarTrack: {
    flex: 1,
    height: 20,
    borderRadius: 999,
    backgroundColor: '#e7dfd3',
    overflow: 'hidden',
  },
  dailyBarFill: {
    height: '100%',
    backgroundColor: palette.accent,
  },
  dailyAmount: {
    width: 90,
    textAlign: 'right',
    fontSize: 18,
    fontWeight: '800',
    color: palette.text,
  },
  contextCard: {
    backgroundColor: palette.card,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: palette.softBorder,
    padding: Theme.spacing.lg,
    gap: 8,
  },
  contextLine: {
    fontSize: 16,
    color: palette.mutedText,
    fontWeight: '600',
  },
});

