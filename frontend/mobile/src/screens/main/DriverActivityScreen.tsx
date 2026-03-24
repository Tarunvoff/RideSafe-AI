import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MainTopNavbar from '../../components/MainTopNavbar';
import DriverLogoutMenu from '../../components/DriverLogoutMenu';
import DriverBottomNavbar from '../../components/DriverBottomNavbar';
import { Theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';

type ActivityItem = {
  id: string;
  label: string;
  icon: string;
  time: string;
  description: string;
  bucket: 'ALL' | 'PINGS' | 'VALIDATION' | 'RISK_UPDATES';
};

const MOCK_ACTIVITY: ActivityItem[] = [
  {
    id: 'a1',
    label: 'Ping Received',
    icon: 'satellite' as any,
    time: '10:45 AM',
    description: 'System successfully received backend heartbeat',
    bucket: 'PINGS',
  },
  {
    id: 'a2',
    label: 'Location Validated',
    icon: 'location_on' as any,
    time: '10:43 AM',
    description: 'GPS coordinates mapped to active cell',
    bucket: 'VALIDATION',
  },
  {
    id: 'a3',
    label: 'Grid Mapping Updated',
    icon: 'grid_view' as any,
    time: '10:40 AM',
    description: 'Driver successfully mapped to H3 grid cell',
    bucket: 'VALIDATION',
  },
  {
    id: 'a4',
    label: 'Risk Level Increased',
    icon: 'warning' as any,
    time: '09:15 AM',
    description: 'Risk level changed to MEDIUM due to nearby precipitation',
    bucket: 'RISK_UPDATES',
  },
  {
    id: 'a5',
    label: 'Duplicate Ping Ignored',
    icon: 'error_outline' as any,
    time: '08:45 AM',
    description: 'Duplicate backend signal discarded',
    bucket: 'PINGS',
  },
];

export default function DriverActivityScreen({ navigation }: any) {
  const { logout, user } = useAuth();
  const [activeFilter, setActiveFilter] = React.useState<
    ActivityItem['bucket']
  >('ALL');
  const [profileMenuVisible, setProfileMenuVisible] = React.useState(false);

  const handleLogout = async () => {
    try {
      setProfileMenuVisible(false);
      await logout();
    } catch (e) {
      setProfileMenuVisible(false);
    }
  };

  const filtered = React.useMemo(() => {
    if (activeFilter === 'ALL') return MOCK_ACTIVITY;
    return MOCK_ACTIVITY.filter((x) => x.bucket === activeFilter);
  }, [activeFilter]);

  const filters: Array<{ key: ActivityItem['bucket']; label: string }> = [
    { key: 'ALL', label: 'All' },
    { key: 'PINGS', label: 'Pings' },
    { key: 'VALIDATION', label: 'Validation' },
    { key: 'RISK_UPDATES', label: 'Risk Updates' },
  ];

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

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryOverline}>
                Today's Total Pings
              </Text>
              <Text style={styles.summaryBig}>142</Text>
            </View>
            <View style={styles.lowRiskPill}>
              <View style={styles.lowRiskDot} />
              <Text style={styles.lowRiskText}>Low Risk</Text>
            </View>
          </View>

          <View style={styles.summaryBottomRow}>
            <Ionicons
              name={'history' as any}
              size={14}
              color="#16a34a"
            />
            <Text style={styles.summaryBottomText}>
              Last Update: 2 min ago
            </Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {filters.map((f) => {
            const isActive = f.key === activeFilter;
            return (
              <TouchableOpacity
                key={f.key}
                activeOpacity={0.9}
                onPress={() => setActiveFilter(f.key)}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Activity Timeline */}
        <View style={styles.timelineWrap}>
          <View style={styles.timelineLine} />
          {filtered.map((item, idx) => (
            <View key={item.id} style={styles.timelineItemRow}>
              <View style={styles.timelineIconCol}>
                <View style={styles.timelineIconCircle}>
                  <Ionicons
                    name={item.icon as any}
                    size={18}
                    color="#16a34a"
                  />
                </View>
              </View>

              <View style={styles.timelineContent}>
                <View style={styles.timelineTitleRow}>
                  <Text style={styles.timelineTitle}>{item.label}</Text>
                  <Text style={styles.timelineTime}>{item.time}</Text>
                </View>
                <Text style={styles.timelineDesc}>{item.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <DriverBottomNavbar navigation={navigation} activeKey="activity" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f9fa' },
  content: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
    paddingBottom: 120,
  },

  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  summaryOverline: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#6b7280',
    marginBottom: 6,
  },
  summaryBig: {
    fontSize: 40,
    fontWeight: '900',
    color: '#0f172a',
    lineHeight: 42,
  },
  lowRiskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220,252,231,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.25)',
    marginTop: 4,
  },
  lowRiskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16a34a',
    marginRight: 6,
  },
  lowRiskText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    color: '#166534',
  },
  summaryBottomRow: {
    marginTop: Theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryBottomText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
  },

  filtersRow: {
    gap: 10,
    paddingBottom: 10,
    marginBottom: Theme.spacing.lg,
  },
  filterChip: {
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: {
    backgroundColor: 'rgba(22,163,74,0.95)',
    borderColor: 'rgba(22,163,74,0.95)',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6b7280',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },

  timelineWrap: {
    position: 'relative',
    paddingLeft: 8,
    paddingRight: 4,
    paddingBottom: 12,
  },
  timelineLine: {
    position: 'absolute',
    left: 30,
    top: 6,
    bottom: 6,
    width: 2,
    backgroundColor: 'rgba(107,114,128,0.25)',
    borderRadius: 1,
  },
  timelineItemRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 22,
    alignItems: 'flex-start',
    position: 'relative',
    zIndex: 1,
  },
  timelineIconCol: {
    width: 46,
    alignItems: 'center',
  },
  timelineIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineContent: { flex: 1, paddingTop: 4 },
  timelineTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
    flex: 1,
    marginRight: 10,
  },
  timelineTime: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
  },
  timelineDesc: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
    fontWeight: '600',
  },
});

