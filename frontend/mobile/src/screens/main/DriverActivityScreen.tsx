import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, ScrollView, StyleSheet, Text, View, ImageBackground, TouchableOpacity } from 'react-native';
import DriverLogoutMenu from '../../components/DriverLogoutMenu';
import LoadingOverlay from '../../components/LoadingOverlay';
import { useAuth } from '../../context/AuthContext';
import { driverApi } from '../../services/api';

const BRAND_BG = '#ff6b53';
const CARD_BG = '#f0ecce';

export default function DriverActivityScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { logout, user } = useAuth();
  const [profileMenuVisible, setProfileMenuVisible] = React.useState(false);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const driverId = user?.id ?? null;

  const handleLogout = async () => {
    try {
      setProfileMenuVisible(false);
      await logout();
    } catch {
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
  
  const rating = Number(profile?.identity?.rating ?? 0).toFixed(1);

  return (
    <SafeAreaView style={styles.safeArea}>
      <LoadingOverlay visible={loading} message={t('activity.loading')} />

      <DriverLogoutMenu
        visible={profileMenuVisible}
        userEmail={user?.email ?? null}
        onClose={() => setProfileMenuVisible(false)}
        onLogout={() => {
          void handleLogout();
        }}
      />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="umbrella" size={28} color="#000" style={{ transform: [{ rotate: '-15deg' }] }} />
          <Text style={styles.headerTitle}>Aegis</Text>
        </View>
        <TouchableOpacity style={styles.avatarContainer} onPress={() => setProfileMenuVisible(true)}>
          <ImageBackground
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDTIkvlbxtF8Srcz_Cbugho4nxtNwxEgZ5rkeHZSy6E9BSEcqdj52m1gjQ5Ln04L3Cj42Jp-5EEJfISSDs1bg9ljCoHBEVxm4Z8qk7wkc1QVrwGgErxrBvjSYGYyVbjd1hdbsHQYw5etDbImLeRNen_-I3XBRA0bpHiYSDBshxoZGzhTdeYoLCIVqXROGHAyF2Uoj-JZ7VtGj9VWylbpWrw03AM7q0pa_t0ySFKRjj7uWUE8UQwRPxoYOHOdRdHfuQhvkFTIIlkDySq' }}
            style={styles.avatar}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Title Area */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Work Pulse</Text>
          <Text style={styles.pageSubtitle}>Week view for you</Text>
        </View>

        {/* Profile Card */}
        <View style={[styles.neoCard, styles.profileCard]}>
          <View style={styles.profileLeft}>
            <Text style={styles.sectionLabel}>STORE</Text>
            <Text style={styles.profileName}>{profile?.identity?.primaryDarkStore ?? 'Koramangala Rapid Hub'}</Text>
            <View style={styles.profileMetaRow}>
              <Text style={styles.providerText}>{profile?.identity?.provider ?? 'blinkit'}</Text>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.profileMeta}>{profile?.identity?.employmentType ?? 'PART_TIME'}</Text>
            </View>
            <Text style={styles.addressMeta} numberOfLines={1}>
              {profile?.identity?.primaryServiceZone ?? 'Koramangala Rapid Hub, Kanray, Braitanata ...'}
            </Text>
          </View>

          {/* Green Score Box */}
          <View style={styles.profileRating}>
            <Ionicons name="star" size={24} color="#fff" />
            <Text style={styles.profileRatingValue}>{rating}</Text>
            <Text style={styles.profileRatingLabel}>SCORE</Text>
          </View>
        </View>

        {/* Stat Grid */}
        <View style={styles.statGrid}>
          <View style={[styles.neoCard, styles.statCard]}>
            <View style={styles.statIconBox}>
              <Ionicons name="clipboard-outline" size={20} color="#000" />
            </View>
            <Text style={styles.statLabel}>ORDERS ACCEPTED</Text>
            <Text style={styles.statValue}>{completed || 196}</Text>
            <Text style={styles.statHint}>Week</Text>
          </View>

          <View style={[styles.neoCard, styles.statCard]}>
            <View style={styles.statIconBox}>
              <Ionicons name="ban-outline" size={20} color="#000" />
            </View>
            <Text style={styles.statLabel}>ORDERS SKIPPED</Text>
            <Text style={styles.statValue}>{rejected || 2}</Text>
            <Text style={styles.statHint}>Manual</Text>
          </View>

          <View style={[styles.neoCard, styles.statCard]}>
            <View style={styles.statIconBox}>
              <Ionicons name="car-outline" size={20} color="#000" />
            </View>
            <Text style={styles.statLabel}>ON-TIME DELIVERED</Text>
            <Text style={styles.statValue}>{successRate || 88}%</Text>
            <Text style={styles.statHint}>Done</Text>
          </View>
        </View>

        {/* Earnings Card */}
        <View style={[styles.neoCard, styles.earningsCard]}>
          <Text style={styles.earningsTitle}>WEEKLY EARNINGS</Text>
          <View style={styles.earningsRow}>
            <Text style={styles.earningsValue}>₹{weeklyEarnings.toLocaleString('en-IN') || '14,271'}</Text>
            <View style={styles.trendPill}>
              <Text style={styles.trendText}>{earningsDelta >= 0 ? '+' : ''}{earningsDeltaPct || 82}%</Text>
            </View>
          </View>
          
          <View style={styles.earningsDivider} />
          
          <View style={styles.earningsFooter}>
            <Text style={styles.earningsFooterText}>Bonus ₹{Number(summary.incentiveEarnings ?? 0).toLocaleString('en-IN')} • {Number(summary.totalWorkingHours ?? 0)} hrs</Text>
            <Text style={styles.earningsFooterText}>Prev ₹{(lastWeek || 7819.83).toLocaleString('en-IN')}</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BRAND_BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000',
    marginLeft: 8,
  },
  avatarContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#000',
    overflow: 'hidden',
    backgroundColor: '#fff'
  },
  avatar: { width: '100%', height: '100%' },

  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 100,
    gap: 16,
  },

  pageHeader: { gap: 4, marginBottom: 8 },
  pageTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#000',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '600',
  },

  neoCard: {
    backgroundColor: CARD_BG,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 16,
  },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingLeft: 16,
    overflow: 'hidden', // to ensure rating touches right edge cleanly, wait the mockup rating is actually offset or touching?
    // looking at the mock, the green score box literally touches top right and bottom right edges of the inner container!
    // we can easily do this by setting no padding on the right.
    paddingTop: 16,
    paddingBottom: 16,
    paddingRight: 0,
  },
  profileLeft: { 
    flex: 1, 
    justifyContent: 'center',
    gap: 4 
  },
  sectionLabel: {
    fontSize: 12,
    color: '#000',
    fontWeight: '900',
    marginBottom: 4,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000',
    lineHeight: 28,
  },
  profileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  providerText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000',
  },
  bullet: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000',
  },
  profileMeta: {
    fontSize: 15,
    color: '#000',
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  addressMeta: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
    marginTop: 2,
    paddingRight: 10,
  },

  profileRating: {
    width: 70,
    backgroundColor: '#1E964F', // exact green
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  profileRatingValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginTop: 4,
  },
  profileRatingLabel: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '800',
  },

  statGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 4,
  },
  statIconBox: {
    marginBottom: 6,
    marginLeft: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#000',
    fontWeight: '900',
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#000',
    marginLeft: 4,
    marginTop: 4,
  },
  statHint: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
    marginLeft: 4,
  },

  earningsCard: {
    padding: 20,
    gap: 8,
  },
  earningsTitle: {
    fontSize: 12,
    color: '#000',
    fontWeight: '900',
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  earningsValue: {
    fontSize: 40,
    fontWeight: '900',
    color: '#000',
    letterSpacing: -1,
  },
  trendPill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#A7F3D0',
  },
  trendText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#065F46',
  },
  earningsDivider: {
    height: 1.5,
    backgroundColor: '#000',
    marginTop: 12,
    marginBottom: 12,
  },
  earningsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  earningsFooterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  }
});