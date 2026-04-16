import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationsApi } from '../../services/api';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  date?: string;
  read?: boolean;
};

type NotificationCenterContextValue = {
  open: () => void;
  close: () => void;
  unreadCount: number;
  refresh: () => Promise<void>;
};

const AUTO_REFRESH_MS = 30000;
const NotificationCenterContext = createContext<NotificationCenterContextValue | null>(null);

export function useNotificationCenter() {
  return useContext(NotificationCenterContext);
}

export default function NotificationCenterProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const playHaptic = useCallback(async (type: 'open' | 'close' | 'tap' | 'success') => {
    try {
      if (type === 'open') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        return;
      }
      if (type === 'success') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }
      await Haptics.selectionAsync();
    } catch {
      // Ignore haptic failures on unsupported devices.
    }
  }, []);

  const animateOpen = useCallback(() => {
    Animated.parallel([
      Animated.timing(panelAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropAnim, panelAnim]);

  const animateClose = useCallback((onDone?: () => void) => {
    Animated.parallel([
      Animated.timing(panelAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 170,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDone?.();
    });
  }, [backdropAnim, panelAnim]);

  const openCenter = useCallback(() => {
    setVisible(true);
    void playHaptic('open');
    requestAnimationFrame(() => {
      animateOpen();
    });
  }, [animateOpen, playHaptic]);

  const closeCenter = useCallback(() => {
    void playHaptic('close');
    animateClose(() => setVisible(false));
  }, [animateClose, playHaptic]);

  const syncNotifications = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const [alerts, unread] = await Promise.all([
        notificationsApi.getAlerts(),
        notificationsApi.getUnreadCount(),
      ]);
      const list = Array.isArray(alerts) ? alerts : [];
      setItems(list);
      if (Number.isFinite(unread)) {
        setUnreadCount(Math.max(0, unread));
      } else {
        setUnreadCount(list.filter((item) => !item.read).length);
      }
    } catch {
      // Silent fallback keeps UI stable even if endpoint is temporarily unavailable.
      setItems([]);
      setUnreadCount(0);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void syncNotifications(false);
    const timer = setInterval(() => {
      void syncNotifications(false);
    }, AUTO_REFRESH_MS);

    return () => clearInterval(timer);
  }, [syncNotifications]);

  useEffect(() => {
    if (visible) {
      void syncNotifications(true);
    }
  }, [visible, syncNotifications]);

  const unreadItems = useMemo(() => items.filter((item) => !item.read), [items]);
  const readItems = useMemo(() => items.filter((item) => item.read), [items]);

  const markOneAsRead = useCallback(async (item: NotificationItem) => {
    if (item.read) return;
    try {
      await notificationsApi.markAsRead(item.id);
      setItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      void playHaptic('tap');
    } catch {
      // Keep optimistic UX simple; next refresh reconciles server state.
    }
  }, [playHaptic]);

  const markAllAsRead = useCallback(async () => {
    if (unreadItems.length === 0) return;
    await Promise.allSettled(unreadItems.map((item) => notificationsApi.markAsRead(item.id)));
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);
    void playHaptic('success');
  }, [playHaptic, unreadItems]);

  const contextValue = useMemo<NotificationCenterContextValue>(
    () => ({
      open: openCenter,
      close: closeCenter,
      unreadCount,
      refresh: async () => {
        await syncNotifications(true);
      },
    }),
    [closeCenter, openCenter, unreadCount, syncNotifications],
  );

  return (
    <NotificationCenterContext.Provider value={contextValue}>
      {children}
      <Pressable
        accessibilityRole="button"
        onPress={openCenter}
        style={[styles.bellButton, { top: 12 }]}
      >
        <Ionicons name="notifications-outline" size={20} color="#ffffff" />
        {unreadCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        ) : null}
      </Pressable>

      <Modal
        visible={visible}
        animationType="none"
        transparent
        onRequestClose={closeCenter}
      >
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}> 
          <Pressable style={StyleSheet.absoluteFill} onPress={closeCenter} />

          <Animated.View
            style={[
              styles.panel,
              {
                marginTop: insets.top + 56,
                marginRight: 14,
                transform: [
                  {
                    translateY: panelAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [28, 0],
                    }),
                  },
                  {
                    scale: panelAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.97, 1],
                    }),
                  },
                ],
                opacity: panelAnim,
              },
            ]}
          >
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.title}>Notifications</Text>
                <Text style={styles.subtitle}>{unreadCount} unread</Text>
              </View>

              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.iconAction} onPress={() => void syncNotifications(true)}>
                  <Ionicons name="refresh" size={18} color="#334155" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconAction} onPress={closeCenter}>
                  <Ionicons name="close" size={20} color="#334155" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.topActionsRow}>
              <TouchableOpacity
                style={[styles.markAllButton, unreadCount === 0 && styles.markAllButtonDisabled]}
                onPress={() => void markAllAsRead()}
                disabled={unreadCount === 0}
              >
                <Text style={[styles.markAllText, unreadCount === 0 && styles.markAllTextDisabled]}>
                  Mark all as read
                </Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#0f766e" />
              </View>
            ) : items.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="notifications-off-outline" size={22} color="#94a3b8" />
                <Text style={styles.emptyText}>No notifications yet.</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                {unreadItems.length > 0 ? (
                  <View style={styles.groupBlock}>
                    <Text style={styles.groupTitle}>Unread</Text>
                    {unreadItems.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.unreadCard}
                        activeOpacity={0.9}
                        onPress={() => void markOneAsRead(item)}
                      >
                        <View style={styles.dot} />
                        <View style={styles.cardTextWrap}>
                          <Text style={styles.cardTitle}>{item.title}</Text>
                          <Text style={styles.cardMessage}>{item.message}</Text>
                          {item.date ? <Text style={styles.cardMeta}>{new Date(item.date).toLocaleString('en-IN')}</Text> : null}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}

                {readItems.length > 0 ? (
                  <View style={styles.groupBlock}>
                    <Text style={styles.groupTitle}>Earlier</Text>
                    {readItems.map((item) => (
                      <View key={item.id} style={styles.readCard}>
                        <View style={styles.cardTextWrap}>
                          <Text style={styles.cardTitleRead}>{item.title}</Text>
                          <Text style={styles.cardMessageRead}>{item.message}</Text>
                          {item.date ? <Text style={styles.cardMeta}>{new Date(item.date).toLocaleString('en-IN')}</Text> : null}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
              </ScrollView>
            )}
          </Animated.View>
        </Animated.View>
      </Modal>
    </NotificationCenterContext.Provider>
  );
}

const styles = StyleSheet.create({
  bellButton: {
    position: 'absolute',
    right: 80,
    zIndex: 90,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.24)',
    alignItems: 'flex-end',
  },
  panel: {
    width: '86%',
    maxWidth: 420,
    maxHeight: '70%',
    backgroundColor: '#fefefe',
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: '#dbe4ef',
    shadowColor: '#0f172a',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#475569',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconAction: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#edf2f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topActionsRow: {
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  markAllButton: {
    backgroundColor: '#d8faf2',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  markAllButtonDisabled: {
    backgroundColor: '#e2e8f0',
  },
  markAllText: {
    color: '#0f766e',
    fontWeight: '700',
    fontSize: 12,
  },
  markAllTextDisabled: {
    color: '#94a3b8',
  },
  loadingBox: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 12,
    gap: 12,
  },
  groupBlock: {
    gap: 8,
  },
  groupTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#475569',
    fontWeight: '700',
  },
  unreadCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 13,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#bcefe5',
  },
  readCard: {
    padding: 13,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#14b8a6',
    marginTop: 7,
  },
  cardTextWrap: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  cardTitleRead: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  cardMessage: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 18,
  },
  cardMessageRead: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18,
  },
  cardMeta: {
    marginTop: 2,
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '500',
  },
});
