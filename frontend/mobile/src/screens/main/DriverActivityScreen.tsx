import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import DriverBottomNavbar from '../../components/DriverBottomNavbar';
import DriverLogoutMenu from '../../components/DriverLogoutMenu';
import LoadingOverlay from '../../components/LoadingOverlay';
import MainTopNavbar from '../../components/MainTopNavbar';
import { useAuth } from '../../context/AuthContext';
import { driverApi } from '../../services/api';
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

export default function DriverActivityScreen({ navigation }: any) {
  const { logout, user } = useAuth();
  const [profileMenuVisible, setProfileMenuVisible] = React.useState(false);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const driverId = user?.id ?? null;

  const handleLogout = async () => {
    try {
      setProfileMenuVisible(false);
      await logout();
    } catch (error) {
      setProfileMenuVisible(false);
    }
  };

  const loadProfile = useCallback(async () => {
    if (!driverId) return;
    setLoading(true);
    try {
      const res = await driverApi.getProfile(driverId);
      setProfile(res?.driverProfile ?? null);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const week = profile?.currentWeek ?? {};
  const summary = profile?.workSummary ?? {};
  const totalOrders = Number(week.totalOrdersAssigned ?? (week.totalCompletedDeliveries ?? 0) + (week.totalOrdersRejected ?? 0));
  const completed = Number(week.totalCompletedDeliveries ?? 0);
  const rejected = Number(week.totalOrdersRejected ?? 0);
  const successRate = totalOrders ? Math.round((completed / totalOrders) * 100) : 0;
  const weeklyEarnings = Number(week.weeklyEarningsTotal ?? 0);
  const lastWeek = Number(summary.averageWeeklyEarnings ?? 0);
  const earningsDelta = weeklyEarnings - lastWeek;
  const earningsDeltaPct = lastWeek ? Math.round((earningsDelta / lastWeek) * 100) : 0;

  const dailyEarnings = useMemo(() => {
    const daily = week.dailyBreakdown ?? [];
    return daily.map((day: any) => ({
      day: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
      amount: Number(day.totalEarnings ?? 0),
    }));
  }, [week.dailyBreakdown]);

  const maxDaily = dailyEarnings.length ? Math.max(...dailyEarnings.map((d: any) => d.amount)) : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <MainTopNavbar onProfilePress={() => setProfileMenuVisible(true)} />
      <LoadingOverlay visible={loading} message="Loading work pulse..." />

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
            <Text style={styles.profileName}>{profile?.identity?.primaryDarkStore ?? '—'}</Text>
            <View style={styles.profileMetaRow}>
              <Text style={styles.profileMeta}>{profile?.identity?.provider ?? '—'}</Text>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.profileMeta}>{profile?.identity?.employmentType ?? '—'}</Text>
            </View>
            <View style={styles.profileMetaRow}>
              <Text style={styles.profileMeta}>{profile?.identity?.primaryServiceZone ?? '—'}</Text>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.profileMeta}>{profile?.identity?.primaryDarkStore ?? '—'}</Text>
            </View>
          </View>
          <View style={styles.profileRating}>
            <Ionicons name="star" size={26} color={palette.accent} />
            <Text style={styles.profileRatingValue}>{Number(profile?.identity?.rating ?? 0).toFixed(1)}</Text>
            <Text style={styles.profileRatingLabel}>Score</Text>
          </View>
        </View>

        <View style={styles.statGrid}>
          <View style={[styles.statCard, styles.statCardAccent]}>
            <Text style={styles.statLabel}>Orders Accepted</Text>
            <Text style={styles.statValue}>{completed}</Text>
            <Text style={styles.statHint}>Week</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Orders Skipped</Text>
            <Text style={styles.statValue}>{rejected}</Text>
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
            <Text style={styles.earningsValue}>₹{weeklyEarnings.toLocaleString('en-IN')}</Text>
            <View style={styles.trendPill}>
              <Ionicons
                name={earningsDelta >= 0 ? 'arrow-up' : 'arrow-down'}
                size={18}
                color={palette.accent}
              />
              <Text style={styles.trendText}>{earningsDelta >= 0 ? '+' : ''}{earningsDeltaPct}%</Text>
            </View>
          </View>
          <Text style={styles.earningsMeta}>Bonus ₹{Number(summary.incentiveEarnings ?? 0).toLocaleString('en-IN')} · {Number(summary.totalWorkingHours ?? 0)} hrs</Text>
          <Text style={styles.earningsMeta}>Prev ₹{lastWeek.toLocaleString('en-IN')}</Text>
        </View>

        <View style={styles.dailyCard}>
          <Text style={styles.sectionLabel}>Week strip</Text>
          {dailyEarnings.map((item: any) => {
            const widthPct = maxDaily ? Math.max(20, Math.round((item.amount / maxDaily) * 100)) : 20;
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

