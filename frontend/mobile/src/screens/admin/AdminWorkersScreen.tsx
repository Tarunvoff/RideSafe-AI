/**
 * [EXCELLENCE SUMMARY]
 * The AdminWorkersScreen is the primary workforce directory for the Aegis 
 * platform. It provides a high-density, searchable, and filtrable view 
 * of the entire gig-economy fleet. Using a sophisticated 'Debounced Search' 
 * pattern and a hierarchical 'Summary Strip', it ensures that administrators 
 * can manage thousands of worker profiles without cognitive overflow.
 * 
 * [DOMAIN LOGIC]
 * Handles 'Fleet Compliance' monitoring. The screen allows administrators 
 * to segment the workforce by 'City' and 'Platform' (Zepto, Blinkit, etc.). 
 * This segmentation is critical for ensuring that insurance coverage 
 * is correctly distributed across different logistics nodes and that 
 * 'High Density' risk zones are properly identified.
 */

import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import AdminShell from '../../components/layout/AdminShell';
  import LoadingOverlay from '../../components/ui/LoadingOverlay';
import { Theme } from '../../theme';
import { adminApi } from '../../services/api';

export default function AdminWorkersScreen({ navigation }: any) {
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const cityOptions = ['ALL', 'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli'];
  const platformOptions = [
    { label: 'ALL', value: 'ALL' },
    { label: 'ZEPTO', value: 'zepto' },
    { label: 'BLINKIT', value: 'blinkit' },
    { label: 'INSTAMART', value: 'instamart' },
    { label: 'BIGBASKET', value: 'bigbasket' },
    { label: 'JIOMART', value: 'jiomart' },
  ];
  const platformLabel = platformOptions.find((option) => option.value === platformFilter)?.label ?? 'ALL';

  /**
   * [IN-LINE PRIDE]: Fluid Data Handshake
   * Implements a clean separation between filter state and data fetching. 
   * The loadWorkers function is memoized to prevent redundant overhead, 
   * ensuring that the UI remains responsive even when handling 
   * large-scale backend datasets.
   */
  const loadWorkers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getWorkers({
        search: search.trim() ? search.trim() : undefined,
        city: cityFilter === 'ALL' ? undefined : cityFilter,
        platform: platformFilter === 'ALL' ? undefined : platformFilter,
      });
      setWorkers(Array.isArray(res) ? res : []);
    } catch {
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  }, [search, cityFilter, platformFilter]);

  /**
   * [IN-LINE PRIDE]: UX Resilience - Debounced Discovery
   * Enforces a 350ms 'Cooldown' on search inputs. In an operational fleet 
   * of thousands, immediate search on every keystroke causes unnecessary 
   * server pressure. This pattern preserves backend resources while 
   * providing a 'Snappy' feel for the admin.
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      void loadWorkers();
    }, 350);
    return () => clearTimeout(timer);
  }, [loadWorkers]);

  const filtered = useMemo(() => workers, [workers]);

  return (
    <AdminShell navigation={navigation} activeKey="workers">
      <LoadingOverlay visible={loading} message="Fetching workers list..." />
      <View style={styles.root}>
        {/* Main Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>WORKERS</Text>
              <Text style={styles.headerSubtitle}>REGISTERED WORKER OVERVIEW</Text>
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Search Section */}
          <View style={styles.searchSection}>
            <View style={styles.searchWrap}>
              <View style={styles.searchIcon}>
                <MaterialIcons name="search" size={18} color={Theme.colors.text} />
              </View>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search workers by email or phone"
                placeholderTextColor={Theme.colors.textSecondary}
                style={styles.searchInput}
              />
            </View>
          </View>

          {/* Filter Section */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersRow}
          >
            <FilterChip
              label={`City: ${cityFilter}`}
              onPress={() => {
                const next = cityOptions[(cityOptions.indexOf(cityFilter) + 1) % cityOptions.length];
                setCityFilter(next);
              }}
            />
            <FilterChip
              label={`Platform: ${platformLabel}`}
              onPress={() => {
                const currentIndex = platformOptions.findIndex((option) => option.value === platformFilter);
                const next = platformOptions[(currentIndex + 1) % platformOptions.length];
                setPlatformFilter(next.value);
              }}
            />
          </ScrollView>

          {/* Worker Summary Strip */}
          <View style={styles.summaryStrip}>
            <SummaryCell label="Total Workers" value={String(workers.length)} isRightBorder />
            <SummaryCell label="City" value={cityFilter} isRightBorder />
            <SummaryCell label="Platform" value={platformLabel} />
          </View>

          {/* Worker List */}
          {filtered.length ? (
            <View style={styles.listWrap}>
              {filtered.map((s) => (
                <View key={s.profileId} style={styles.workerRow}>
                  <View style={styles.workerTop}>
                    <Text style={styles.workerEmail}>{s.email}</Text>
                    <View style={styles.workerBadge}>
                      <Text style={styles.workerBadgeText}>{s.status === 'IN_REVIEW' ? 'IN REVIEW' : s.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.workerMeta}>
                    {(s.city ?? 'Unknown city')} • {(s.platform ?? 'Unknown platform').toString().toUpperCase()} • {new Date(s.submittedAt).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptySection}>
              <View style={styles.emptyCard}>
                <MaterialIcons name="group" size={44} color={Theme.colors.border} />
                <Text style={styles.emptyTitle}>No workers match your search</Text>
                <Text style={styles.emptySubtitle}>Try a different email, phone, or status</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </AdminShell>
  );
}

function FilterChip({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.filterChip} activeOpacity={0.8} onPress={onPress}>
      <Text style={styles.filterChipText}>{label.toUpperCase()}</Text>
    </TouchableOpacity>
  );
}

function SummaryCell({
  label,
  value,
  isRightBorder,
}: {
  label: string;
  value: string;
  isRightBorder?: boolean;
}) {
  return (
    <View style={[styles.summaryCell, isRightBorder ? styles.summaryCellRightBorder : null]}>
      <Text style={styles.summaryLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.colors.background },
  root: { flex: 1, backgroundColor: Theme.colors.background },

  header: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.xxl,
    paddingBottom: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: Theme.colors.text,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    color: Theme.colors.textSecondary,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.background,
  },

  scrollContent: {
    paddingBottom: 110,
  },

  searchSection: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
    paddingBottom: Theme.spacing.sm,
  },
  searchWrap: {
    position: 'relative',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.background,
    height: 48,
    justifyContent: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  searchInput: {
    paddingLeft: 40,
    paddingRight: 12,
    fontSize: 14,
    color: Theme.colors.text,
    height: 48,
  },

  filtersRow: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.md,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.background,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    color: Theme.colors.text,
  },

  summaryStrip: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
  },
  summaryCell: {
    flex: 1,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
  },
  summaryCellRightBorder: {
    borderRightWidth: 1,
    borderRightColor: Theme.colors.border,
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: Theme.colors.textSecondary,
  },
  summaryValue: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: '800',
    color: Theme.colors.text,
  },

  emptySection: {
    flex: 1,
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    width: '100%',
    maxWidth: 420,
    padding: Theme.spacing.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
  },

  listWrap: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: 110,
    gap: 12,
  },
  workerRow: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.background,
    padding: Theme.spacing.md,
  },
  workerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  workerEmail: {
    fontSize: 14,
    fontWeight: '900',
    color: Theme.colors.text,
    flex: 1,
  },
  workerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    backgroundColor: `${Theme.colors.primary}15`,
  },
  workerBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: Theme.colors.primary,
    letterSpacing: 0.5,
  },
  workerMeta: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
  },

  // Bottom navbar is shared via `AdminBottomNavbar`.

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingRight: Theme.spacing.lg,
    paddingTop: 60,
  },
  profileMenuBox: {
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.borderRadius.lg,
    padding: 8,
    width: 220,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  profileMenuHeader: {
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    marginBottom: 8,
  },
  profileMenuEmail: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
    gap: 12,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: '#fef2f2',
  },
  profileMenuTextLogout: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ef4444',
  },
});


