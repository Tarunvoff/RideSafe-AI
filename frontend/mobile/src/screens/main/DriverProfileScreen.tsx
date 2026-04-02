import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
} from 'react-native';
import MainTopNavbar from '../../components/MainTopNavbar';
import DriverBottomNavbar from '../../components/DriverBottomNavbar';
import DriverLogoutMenu from '../../components/DriverLogoutMenu';
import LoadingOverlay from '../../components/LoadingOverlay';
import { useAuth } from '../../context/AuthContext';
import { kycApi } from '../../services/api';
import { Theme } from '../../theme';

// ─── Types ────────────────────────────────────────────────────────────────────
type KYCDetails = {
  status: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  basicIdentity: { fullName: string; dob: string; gender: string } | null;
  personalDetails: { address: string; city: string; state: string; pincode: string } | null;
  identityVerification: { aadhaarNumber: string; panNumber: string } | null;
  payoutSetup: { method: string; upiId?: string; accountHolder?: string; bankName?: string } | null;
};

type NotifPrefs = {
  riskAlerts: boolean;
  payoutUpdates: boolean;
  policyReminders: boolean;
  systemUpdates: boolean;
};

// ─── Sub-screen Modals ────────────────────────────────────────────────────────

function NotificationModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [prefs, setPrefs] = useState<NotifPrefs>({
    riskAlerts: true,
    payoutUpdates: true,
    policyReminders: true,
    systemUpdates: false,
  });

  const toggle = (key: keyof NotifPrefs) =>
    setPrefs(p => ({ ...p, [key]: !p[key] }));

  const handleClear = () => {
    Alert.alert(
      'Clear All Notifications',
      'This will clear all notification history from this device. You will still receive future notifications.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Done', 'Notification history cleared.');
          },
        },
      ],
    );
  };

  const rows: { key: keyof NotifPrefs; label: string; desc: string; icon: string }[] = [
    { key: 'riskAlerts', label: 'Risk Alerts', desc: 'Real-time zone risk and fraud warnings', icon: 'warning-outline' },
    { key: 'payoutUpdates', label: 'Payout Updates', desc: 'Claim approval and payout status', icon: 'cash-outline' },
    { key: 'policyReminders', label: 'Policy Reminders', desc: 'Expiry alerts and renewal nudges', icon: 'document-text-outline' },
    { key: 'systemUpdates', label: 'System Updates', desc: 'App updates and maintenance notices', icon: 'settings-outline' },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={modalStyles.wrap}>
        {/* Header */}
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
            <Ionicons name="close" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={modalStyles.headerTitle}>Notification Settings</Text>
          <TouchableOpacity onPress={handleClear} style={modalStyles.clearBtn}>
            <Text style={modalStyles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={modalStyles.body}>
          <Text style={modalStyles.sectionLabel}>MANAGE NOTIFICATIONS</Text>

          <View style={modalStyles.card}>
            {rows.map((row, i) => (
              <View key={row.key}>
                {i > 0 && <View style={modalStyles.divider} />}
                <View style={modalStyles.notifRow}>
                  <View style={modalStyles.notifIcon}>
                    <Ionicons name={row.icon as any} size={20} color="#16a34a" />
                  </View>
                  <View style={modalStyles.notifText}>
                    <Text style={modalStyles.notifLabel}>{row.label}</Text>
                    <Text style={modalStyles.notifDesc}>{row.desc}</Text>
                  </View>
                  <Switch
                    value={prefs[row.key]}
                    onValueChange={() => toggle(row.key)}
                    trackColor={{ false: '#d1d5db', true: '#86efac' }}
                    thumbColor={prefs[row.key] ? '#16a34a' : '#9ca3af'}
                  />
                </View>
              </View>
            ))}
          </View>

          <Text style={modalStyles.hint}>
            Push notifications require device permission. Tap Clear to remove all notification history from this device.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function DataPrivacyModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={modalStyles.wrap}>
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
            <Ionicons name="close" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={modalStyles.headerTitle}>Data & Privacy</Text>
          <View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={modalStyles.body}>
          {[
            {
              icon: 'shield-checkmark-outline',
              title: 'What We Collect',
              body: 'Aegis collects your name, government ID numbers, address, payout details, and GPS data solely to verify your identity, detect fraud, and process insurance payouts. No unnecessary data is collected.',
            },
            {
              icon: 'lock-closed-outline',
              title: 'How We Store It',
              body: 'All personally identifiable information is encrypted at rest (AES-256) and in transit (TLS 1.3). Your Aadhaar and PAN numbers are stored in hashed form after verification.',
            },
            {
              icon: 'share-social-outline',
              title: 'Who We Share With',
              body: 'Your data is shared only with platform partners (Zepto, Blinkit, Instamart etc.) strictly to validate earnings and with the IRDAI-regulated insurer for claim processing. We do not sell your data.',
            },
            {
              icon: 'location-outline',
              title: 'Location Data',
              body: 'GPS data is used in real-time for zone risk scoring and fraud detection. Location history beyond 30 days is automatically deleted.',
            },
            {
              icon: 'trash-outline',
              title: 'Your Rights',
              body: 'You may request a full data export or account deletion at any time by contacting support@aegis-protect.in. Deletion requests are processed within 30 days as per DPDP Act 2023.',
            },
          ].map((item, i) => (
            <View key={i} style={modalStyles.privacyItem}>
              <View style={modalStyles.privacyIconWrap}>
                <Ionicons name={item.icon as any} size={22} color="#16a34a" />
              </View>
              <View style={modalStyles.privacyText}>
                <Text style={modalStyles.privacyTitle}>{item.title}</Text>
                <Text style={modalStyles.privacyBody}>{item.body}</Text>
              </View>
            </View>
          ))}

          <View style={modalStyles.legalBox}>
            <Text style={modalStyles.legalText}>
              Last updated: March 2026 · Aegis Protect Pvt. Ltd.{'\n'}
              Compliant with DPDP Act 2023 & IRDAI Guidelines
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function HelpSupportModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const faqs = [
    { q: 'How is my risk score calculated?', a: 'Your risk score is computed using GPS zone data, historical disruption patterns, device integrity signals, and platform velocity checks. It updates every ride.' },
    { q: 'When will my claim be approved?', a: 'Claims are processed within 2–5 business days after a disruption event is verified. You will receive a notification once the payout is approved.' },
    { q: 'My KYC is stuck in review. What do I do?', a: 'KYC review typically takes 1–2 business days. If it has been more than 5 days, contact our support via email below.' },
    { q: 'Can I change my payout method?', a: 'Yes. Contact our support team and we will guide you through the update process after re-verification.' },
    { q: 'How do I delete my account?', a: 'Send a deletion request to support@aegis-protect.in. Per DPDP Act 2023, your data will be purged within 30 days.' },
  ];

  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={modalStyles.wrap}>
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
            <Ionicons name="close" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={modalStyles.headerTitle}>Help & Support</Text>
          <View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={modalStyles.body}>
          {/* Contact */}
          <Text style={modalStyles.sectionLabel}>CONTACT US</Text>
          <View style={modalStyles.card}>
            {[
              { icon: 'mail-outline', label: 'Email Support', value: 'support@aegis-protect.in' },
              { icon: 'call-outline', label: 'Phone Helpline', value: '1800-209-AEGIS (Mon–Sat, 9am–6pm)' },
              { icon: 'logo-whatsapp', label: 'WhatsApp', value: '+91 98200 00000' },
            ].map((item, i) => (
              <View key={i}>
                {i > 0 && <View style={modalStyles.divider} />}
                <View style={modalStyles.notifRow}>
                  <View style={modalStyles.notifIcon}>
                    <Ionicons name={item.icon as any} size={20} color="#16a34a" />
                  </View>
                  <View style={modalStyles.notifText}>
                    <Text style={modalStyles.notifLabel}>{item.label}</Text>
                    <Text style={modalStyles.notifDesc}>{item.value}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* FAQ */}
          <Text style={[modalStyles.sectionLabel, { marginTop: 20 }]}>FREQUENTLY ASKED QUESTIONS</Text>
          <View style={modalStyles.card}>
            {faqs.map((faq, i) => (
              <View key={i}>
                {i > 0 && <View style={modalStyles.divider} />}
                <TouchableOpacity
                  style={modalStyles.faqRow}
                  activeOpacity={0.7}
                  onPress={() => setOpenIdx(openIdx === i ? null : i)}
                >
                  <Text style={modalStyles.faqQ}>{faq.q}</Text>
                  <Ionicons
                    name={openIdx === i ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#6b7280"
                  />
                </TouchableOpacity>
                {openIdx === i && (
                  <Text style={modalStyles.faqA}>{faq.a}</Text>
                )}
              </View>
            ))}
          </View>

          <View style={modalStyles.legalBox}>
            <Text style={modalStyles.legalText}>App Version 1.4.2 · Aegis Protect Pvt. Ltd.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function KYCReportModal({
  visible,
  onClose,
  kycData,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  kycData: KYCDetails | null;
  loading: boolean;
}) {
  const kycStatusColor = (s: string) => {
    if (s === 'APPROVED') return '#16a34a';
    if (s === 'SUBMITTED') return '#d97706';
    if (s === 'REJECTED') return '#dc2626';
    return '#6b7280';
  };

  const formatDob = (dob: string | undefined) => {
    if (!dob) return '—';
    try {
      return new Date(dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return dob; }
  };

  const maskAadhaar = (n: string) => n ? `XXXX XXXX ${n.slice(-4)}` : '—';
  const maskPan = (n: string) => n ? `${n.slice(0, 2)}XXXXXXX${n.slice(-1)}` : '—';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={modalStyles.wrap}>
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
            <Ionicons name="close" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={modalStyles.headerTitle}>KYC Report</Text>
          <View style={{ width: 44 }} />
        </View>

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#16a34a" />
            <Text style={{ marginTop: 12, color: '#6b7280', fontSize: 14 }}>Loading KYC data…</Text>
          </View>
        ) : !kycData ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <Ionicons name="alert-circle-outline" size={48} color="#d1d5db" />
            <Text style={{ marginTop: 12, color: '#6b7280', fontSize: 15, textAlign: 'center' }}>
              KYC data not available. Please complete your KYC process.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={modalStyles.body}>
            {/* Status badge */}
            <View style={[modalStyles.statusBadge, { borderColor: kycStatusColor(kycData.status) }]}>
              <View style={[modalStyles.statusDot, { backgroundColor: kycStatusColor(kycData.status) }]} />
              <Text style={[modalStyles.statusText, { color: kycStatusColor(kycData.status) }]}>
                {kycData.status.replace('_', ' ')}
              </Text>
              {kycData.submittedAt && (
                <Text style={modalStyles.statusDate}>
                  Submitted {new Date(kycData.submittedAt).toLocaleDateString('en-IN')}
                </Text>
              )}
            </View>

            <Text style={modalStyles.sectionLabel}>PERSONAL IDENTITY</Text>
            <View style={modalStyles.reportCard}>
              <KYCRow label="Full Name" value={kycData.basicIdentity?.fullName} />
              <KYCRow label="Date of Birth" value={formatDob(kycData.basicIdentity?.dob)} />
              <KYCRow label="Gender" value={kycData.basicIdentity?.gender} />
            </View>

            <Text style={[modalStyles.sectionLabel, { marginTop: 16 }]}>ADDRESS</Text>
            <View style={modalStyles.reportCard}>
              <KYCRow label="Street" value={kycData.personalDetails?.address} />
              <KYCRow label="City" value={kycData.personalDetails?.city} />
              <KYCRow label="State" value={kycData.personalDetails?.state} />
              <KYCRow label="Pincode" value={kycData.personalDetails?.pincode} />
            </View>

            <Text style={[modalStyles.sectionLabel, { marginTop: 16 }]}>IDENTITY DOCUMENTS</Text>
            <View style={modalStyles.reportCard}>
              <KYCRow label="Aadhaar" value={maskAadhaar(kycData.identityVerification?.aadhaarNumber ?? '')} />
              <KYCRow label="PAN" value={maskPan(kycData.identityVerification?.panNumber ?? '')} />
            </View>

            <Text style={[modalStyles.sectionLabel, { marginTop: 16 }]}>PAYOUT DETAILS</Text>
            <View style={modalStyles.reportCard}>
              <KYCRow label="Method" value={kycData.payoutSetup?.method} />
              {kycData.payoutSetup?.method === 'UPI' && (
                <KYCRow label="UPI ID" value={kycData.payoutSetup?.upiId} />
              )}
              {kycData.payoutSetup?.method === 'BANK' && (
                <>
                  <KYCRow label="Account Holder" value={kycData.payoutSetup?.accountHolder} />
                  <KYCRow label="Bank" value={kycData.payoutSetup?.bankName} />
                </>
              )}
            </View>

            <View style={modalStyles.legalBox}>
              <Ionicons name="lock-closed-outline" size={14} color="#9ca3af" />
              <Text style={[modalStyles.legalText, { marginLeft: 6 }]}>
                This information is encrypted and used only for verification and claim processing.
              </Text>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function KYCRow({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <View style={modalStyles.kycRow}>
      <Text style={modalStyles.kycLabel}>{label}</Text>
      <Text style={modalStyles.kycValue}>{value || '—'}</Text>
    </View>
  );
}

// ─── Main Profile Screen ──────────────────────────────────────────────────────

export default function DriverProfileScreen({ navigation }: any) {
  const { logout, user, updateDriverName } = useAuth();
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);

  // Name editing
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  // Modals
  const [notifModal, setNotifModal] = useState(false);
  const [privacyModal, setPrivacyModal] = useState(false);
  const [helpModal, setHelpModal] = useState(false);
  const [kycModal, setKycModal] = useState(false);

  // KYC data
  const [kycData, setKycData] = useState<KYCDetails | null>(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);

  // Derive display name: user.driverName → KYC name → email prefix
  const displayName =
    user?.driverName ||
    kycData?.basicIdentity?.fullName ||
    (user?.email ? user.email.split('@')[0] : 'Driver');

  // Load KYC details once on mount
  const loadKycData = useCallback(async () => {
    if (kycData) return; // already loaded
    setKycLoading(true);
    try {
      const data = await kycApi.getDetails();
      setKycData(data);
      // If no driverName saved yet, sync from KYC
      if (!user?.driverName && data.basicIdentity?.fullName) {
        await updateDriverName(data.basicIdentity.fullName);
      }
    } catch {
      // silently ignore - might not have completed KYC
    } finally {
      setKycLoading(false);
    }
  }, [kycData, user?.driverName, updateDriverName]);

  useEffect(() => {
    void loadKycData();
  }, [loadKycData]);

  const handleLogout = async () => {
    try {
      setProfileMenuVisible(false);
      await logout();
    } catch {
      setProfileMenuVisible(false);
    }
  };

  const openKycModal = async () => {
    if (!kycData) {
      setKycLoading(true);
      try {
        const data = await kycApi.getDetails();
        setKycData(data);
      } catch {
        // ignore
      } finally {
        setKycLoading(false);
      }
    }
    setKycModal(true);
  };

  const startNameEdit = () => {
    setNameInput(displayName);
    setEditingName(true);
  };

  const saveNameEdit = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      Alert.alert('Invalid Name', 'Name cannot be empty.');
      return;
    }
    try {
      setNameSaving(true);
      await updateDriverName(trimmed);
      setEditingName(false);
    } finally {
      setNameSaving(false);
    }
  };

  const cancelNameEdit = () => setEditingName(false);

  // Build driver ID from email or user id
  const driverId = user?.id
    ? `GS-${user.id.slice(0, 5).toUpperCase()}`
    : user?.email
      ? `GS-${user.email.slice(0, 5).toUpperCase()}`
      : 'GS-XXXXX';

  return (
    <SafeAreaView style={styles.safeArea}>
      <MainTopNavbar onProfilePress={() => setProfileMenuVisible(true)} />
      <LoadingOverlay
        visible={kycLoading || nameSaving}
        message={nameSaving ? 'Updating your profile name...' : 'Loading profile and KYC details...'}
      />

      <DriverLogoutMenu
        visible={profileMenuVisible}
        userEmail={user?.email ?? null}
        onClose={() => setProfileMenuVisible(false)}
        onLogout={() => { void handleLogout(); }}
      />

      {/* Modals */}
      <NotificationModal visible={notifModal} onClose={() => setNotifModal(false)} />
      <DataPrivacyModal visible={privacyModal} onClose={() => setPrivacyModal(false)} />
      <HelpSupportModal visible={helpModal} onClose={() => setHelpModal(false)} />
      <KYCReportModal
        visible={kycModal}
        onClose={() => setKycModal(false)}
        kycData={kycData}
        loading={kycLoading}
      />

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Profile Header — avatar top-left matching top navbar DP */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrap}>
            <Image
              source={{
                uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDTIkvlbxtF8Srcz_Cbugho4nxtNwxEgZ5rkeHZSy6E9BSEcqdj52m1gjQ5Ln04L3Cj42Jp-5EEJfISSDs1bg9ljCoHBEVxm4Z8qk7wkc1QVrwGgErxrBvjSYGYyVbjd1hdbsHQYw5etDbImLeRNen_-I3XBRA0bpHiYSDBshxoZGzhTdeYoLCIVqXROGHAyF2Uoj-JZ7VtGj9VWylbpWrw03AM7q0pa_t0ySFKRjj7uWUE8UQwRPxoYOHOdRdHfuQhvkFTIIlkDySq',
              }}
              style={styles.avatarImg}
            />
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#ffffff" />
            </View>
          </View>

          <View style={styles.driverInfo}>
            {editingName ? (
              <View style={styles.nameEditRow}>
                <TextInput
                  style={styles.nameInput}
                  value={nameInput}
                  onChangeText={setNameInput}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={saveNameEdit}
                />
                <TouchableOpacity onPress={saveNameEdit} style={styles.nameActionBtn}>
                  <Ionicons name="checkmark" size={18} color="#16a34a" />
                </TouchableOpacity>
                <TouchableOpacity onPress={cancelNameEdit} style={styles.nameActionBtn}>
                  <Ionicons name="close" size={18} color="#dc2626" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.driverNameRow}>
                <Text style={styles.driverName}>{displayName}</Text>
                <View style={styles.driverVerifiedPill}>
                  <Text style={styles.driverVerifiedText}>VERIFIED</Text>
                </View>
              </View>
            )}
            <Text style={styles.driverId}>{driverId}</Text>
            <Text style={styles.driverEmail}>{user?.email ?? ''}</Text>
          </View>

          {!editingName && (
            <TouchableOpacity style={styles.editBtn} activeOpacity={0.8} onPress={startNameEdit}>
              <Ionicons name="pencil" size={18} color="#111827" />
            </TouchableOpacity>
          )}
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionOverline}>PREFERENCES</Text>

          <View style={styles.prefCard}>
            <TouchableOpacity
              style={styles.prefItem}
              activeOpacity={0.8}
              onPress={() => setNotifModal(true)}
            >
              <View style={styles.prefLabelRow}>
                <Ionicons name="notifications-outline" size={24} color="#6b7280" />
                <Text style={styles.prefTitle}>Notification Settings</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>

            <View style={styles.prefDivider} />

            <TouchableOpacity
              style={styles.prefItem}
              activeOpacity={0.8}
              onPress={() => setPrivacyModal(true)}
            >
              <View style={styles.prefLabelRow}>
                <Ionicons name="lock-closed-outline" size={24} color="#6b7280" />
                <Text style={styles.prefTitle}>Data & Privacy</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>

            <View style={styles.prefDivider} />

            <TouchableOpacity
              style={styles.prefItem}
              activeOpacity={0.8}
              onPress={() => setHelpModal(true)}
            >
              <View style={styles.prefLabelRow}>
                <Ionicons name="help-circle-outline" size={24} color="#6b7280" />
                <Text style={styles.prefTitle}>Help & Support</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>

        {/* KYC + Logout */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.kycButton} activeOpacity={0.9} onPress={openKycModal}>
            <Ionicons name="document-text-outline" size={22} color="#374151" style={{ marginRight: 10 }} />
            <Text style={styles.kycButtonText}>View My KYC Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            activeOpacity={0.9}
            onPress={() => { void handleLogout(); }}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <DriverBottomNavbar navigation={navigation} activeKey="profile" />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f9fa' },
  contentContainer: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
    paddingBottom: 40,
    flexGrow: 1,
  },

  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.xl,
    borderRadius: Theme.borderRadius.xl,
    backgroundColor: '#ffffff',
    marginBottom: Theme.spacing.xl,
    shadowColor: '#111827',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    minHeight: 120,
  },
  avatarWrap: { marginRight: Theme.spacing.lg },
  avatarImg: { width: 80, height: 80, borderRadius: 40 },
  verifiedBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  driverInfo: { flex: 1 },
  driverNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' },
  driverName: { fontSize: 22, fontWeight: '700', color: '#111827' },
  driverVerifiedPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#dcfce7',
  },
  driverVerifiedText: { fontSize: 11, fontWeight: '800', color: '#166534', letterSpacing: 0.8 },
  driverId: { fontSize: 15, color: '#6b7280', fontWeight: '500' },
  driverEmail: { marginTop: 4, fontSize: 13, color: '#9ca3af' },
  editBtn: { padding: 12, borderRadius: 12, backgroundColor: '#f3f4f6' },

  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  nameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    borderBottomWidth: 1.5,
    borderBottomColor: '#16a34a',
    paddingVertical: 2,
  },
  nameActionBtn: { padding: 4 },

  section: { marginBottom: Theme.spacing.lg },
  sectionOverline: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#6b7280',
    marginBottom: Theme.spacing.md,
  },

  prefCard: {
    backgroundColor: '#ffffff',
    borderRadius: Theme.borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#111827',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  prefItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: 20,
    backgroundColor: '#ffffff',
    minHeight: 72,
  },
  prefLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  prefTitle: { fontSize: 16, color: '#111827', fontWeight: '600' },
  prefDivider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: Theme.spacing.md },

  kycButton: {
    width: '100%',
    backgroundColor: '#f3f4f6',
    paddingVertical: 18,
    borderRadius: Theme.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    minHeight: 64,
  },
  kycButtonText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  logoutButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: Theme.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    minHeight: 64,
  },
  logoutButtonText: { fontSize: 16, fontWeight: '800', color: '#b91c1c' },
});

const modalStyles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  closeBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  clearBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  clearText: { fontSize: 13, fontWeight: '600', color: '#dc2626' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  body: { padding: 16, paddingBottom: 48 },

  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#6b7280',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#111827',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 16 },

  notifRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifText: { flex: 1 },
  notifLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  notifDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  hint: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 18,
  },

  privacyItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: '#111827',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  privacyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  privacyText: { flex: 1 },
  privacyTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 6 },
  privacyBody: { fontSize: 13, color: '#4b5563', lineHeight: 20 },

  faqRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  faqQ: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  faqA: { fontSize: 13, color: '#4b5563', lineHeight: 20, paddingHorizontal: 16, paddingBottom: 14 },

  legalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  legalText: { fontSize: 11, color: '#9ca3af', lineHeight: 16, flex: 1 },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  statusDate: { fontSize: 11, color: '#9ca3af', marginLeft: 'auto' },

  reportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#111827',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  kycRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  kycLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  kycValue: { fontSize: 13, color: '#111827', fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
});
