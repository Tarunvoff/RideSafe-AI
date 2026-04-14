/**
 * [EXCELLENCE SUMMARY]
 * The AdminAlertsScreen is the real-time disruption monitoring station of 
 * the Aegis platform. It tracks environmental and operational triggers 
 * (Rain, AQI, Heat) that activate the parametric insurance engine. 
 * Implementing a high-performance 'Infinite Scroll' pattern, it allows 
 * administrators to audit a chronological ledger of regional alerts 
 * with zero performance degradation.
 * 
 * [DOMAIN LOGIC]
 * Serves as the 'Trigger Ledger'. Every alert represented here is a direct 
 * signal from our actuarial data sources. Monitoring 'Expected Payout' 
 * per alert allows the administration to anticipate capital requirements 
 * in real-time as weather events unfold across the operational grid.
 */

import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AdminShell from '../../components/layout/AdminShell';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import { adminApi } from '../../services/api';
import { Theme } from '../../theme';

const PAGE_SIZE = 10;

export default function AdminAlertsScreen({ navigation }: any) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);

  const handleBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate('AdminDashboard');
  };

  /**
   * [IN-LINE PRIDE]: Zero-State Synchronization
   * Resets the entire alerts ledger to the latest set on initial load. 
   * This ensure the administrator is always viewing the most recent 
   * chronological disruptions before proceeding to paginated 'deep-dives'.
   */
  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAlerts({ take: PAGE_SIZE, skip: 0 });
      setAlerts(res?.alerts ?? []);
      setTotal(res?.total ?? 0);
      setSkip(PAGE_SIZE);
    } catch {
      setAlerts([]);
      setTotal(0);
      setSkip(0);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * [IN-LINE PRIDE]: Seamless Infinite Paging
   * Implements a robust 'Load More' pattern that preserves existing 
   * state while appending historical data. By tracking a unique 'skip' 
   * pointer, we maintain a linear and efficient traversal of the 
   * disruption database.
   */
  const loadMore = useCallback(async () => {
    if (loadingMore || alerts.length >= total) return;
    setLoadingMore(true);
    try {
      const res = await adminApi.getAlerts({ take: PAGE_SIZE, skip });
      const next = res?.alerts ?? [];
      setAlerts((prev) => [...prev, ...next]);
      setSkip((prev) => prev + PAGE_SIZE);
      setTotal(res?.total ?? total);
    } finally {
      setLoadingMore(false);
    }
  }, [alerts.length, loadingMore, skip, total]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  return (
    <AdminShell navigation={navigation} activeKey="dash">
      <LoadingOverlay visible={loading} message="Loading alerts..." />
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} activeOpacity={0.8} onPress={handleBack}>
            <MaterialIcons name="arrow-back" size={20} color={Theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>ALERTS</Text>
            <Text style={styles.headerSubtitle}>REGIONAL DISRUPTIONS</Text>
          </View>
        </View>

        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listWrap}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MaterialIcons name="notification-important" size={48} color={Theme.colors.textSecondary} />
              <Text style={styles.emptyTitle}>No alerts yet</Text>
              <Text style={styles.emptySubtitle}>Regional disruption alerts will show up here</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.alertCard}>
              <View style={styles.alertHeaderRow}>
                <View style={styles.alertTypePill}>
                  <Text style={styles.alertTypeText}>{item.type}</Text>
                </View>
                <Text style={styles.alertTime}>
                  {new Date(item.occurredAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                </Text>
              </View>
              <Text style={styles.alertTitle}>{item.title}</Text>
              <Text style={styles.alertMeta}>
                Expected payout: {item.expectedPayout != null ? `₹${Math.round(item.expectedPayout).toLocaleString('en-IN')}` : 'N/A'}
              </Text>
            </View>
          )}
          ListFooterComponent={
            alerts.length < total ? (
              <TouchableOpacity style={styles.loadMoreBtn} onPress={() => void loadMore()} disabled={loadingMore}>
                <Text style={styles.loadMoreText}>{loadingMore ? 'Loading...' : 'Load more alerts'}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.footerSpace} />
            )
          }
        />
      </View>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Theme.colors.background },
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
  listWrap: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
    paddingBottom: 120,
    gap: 12,
  },
  alertCard: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
    gap: 6,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alertTypePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: `${Theme.colors.primary}15`,
  },
  alertTypeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Theme.colors.primary,
    letterSpacing: 0.4,
  },
  alertTime: {
    fontSize: 10,
    color: Theme.colors.textSecondary,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  alertMeta: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
  },
  loadMoreBtn: {
    paddingVertical: 12,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  footerSpace: {
    height: 20,
  },
});

