/**
 * [EXCELLENCE SUMMARY]
 * The AdminSetupScreen is the central configuration engine for the Aegis 
 * ecosystem. It provides administrators with a highly modular interface 
 * to fine-tune system-wide behaviors—from fraud detection thresholds 
 * to parametric insurance plan parameters. Architected with a dynamic 
 * 'Section Editor' modal, it ensures a consistent and low-friction 
 * configuration experience across diverse system domains.
 * 
 * [DOMAIN LOGIC]
 * Manages the 'Operational Tuning' of the platform. Key configurations 
 * like 'Fraud Block Threshold' and 'H3 Zone Consistency' directly influence 
 * the actuarial performance of the insurance model. This screen is the 
 * single point of control for rebalancing the risk-reward tradeoff of the 
 * entire gig-economy protection suite.
 */

import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
  Modal,
  Platform,
  Switch,
  TextInput,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import AdminShell from '../../components/layout/AdminShell';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../services/api';
import { Theme } from '../../theme';

export default function AdminSetupScreen({ navigation }: any) {
  const { logout } = useAuth();
  const [settings, setSettings] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorSection, setEditorSection] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      Alert.alert('Error', 'Failed to log out');
    }
  };

  /**
   * [IN-LINE PRIDE]: Critical Session Resilience
   * Implements a proactive 'Session Expiry' check. If the admin profile 
   * fails to load due to unauthorized access, the system automatically 
   * clears the local session and redirects to login, preventing 'Zebra State' 
   * where the UI is accessible but the data is unavailable.
   */
  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getSettings();
      setSettings(res ?? null);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load admin settings');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getProfile();
      setProfile(res ?? null);
    } catch (e: any) {
      const message = e?.message ?? 'Failed to load admin profile';
      if (message.toLowerCase().includes('user not found') || message.toLowerCase().includes('unauthorized')) {
        await logout();
        Alert.alert('Session expired', 'Please sign in again to access admin setup.');
        return;
      }
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate('AdminDashboard');
  };

  /**
   * [IN-LINE PRIDE]: Polymorphic Configuration Modals
   * Instead of multiple specialized screens, we utilize a single, 
   * state-driven editor that adapts its schema based on the 'section' being 
   * tuned. This reduces code surface area while providing a unified 
   * UX pattern for system administrators.
   */
  const openEditor = async (title: string, section: string) => {
    if (section === 'profile') {
      if (!profile) await loadProfile();
      setFormValues(buildSectionValues('profile', profile ?? {}));
    } else {
      if (!settings) await loadSettings();
      setFormValues(buildSectionValues(section, settings?.[section] ?? {}));
    }
    setEditorTitle(title);
    setEditorSection(section);
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!editorSection) return;
    const payload = buildSectionPayload(editorSection, formValues);

    setLoading(true);
    try {
      if (editorSection === 'profile') {
        const res = await adminApi.updateProfile(payload);
        setProfile(res ?? payload);
      } else {
        const res = await adminApi.updateSettings(editorSection, payload);
        setSettings(res ?? settings);
      }
      setEditorOpen(false);
      setEditorSection(null);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminShell navigation={navigation} activeKey="setup">
      <LoadingOverlay visible={loading} message="Saving admin settings..." />
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header Section */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backRow} onPress={handleBack} activeOpacity={0.85}>
              <MaterialIcons name="arrow-back" size={22} color={Theme.colors.text} />
            </TouchableOpacity>

            <Text style={styles.title}>SETUP</Text>
            <Text style={styles.subtitle}>SYSTEM CONFIGURATION</Text>
          </View>

          {/* Main Content */}
          <View style={styles.main}>
            {/* Configuration Section */}
            <View style={styles.section}>
              <View style={styles.dividerGroup}>
                <SetupItem
                  title="Alert Thresholds"
                  description="Configure sensitivity for automated alerts"
                  onPress={() => void openEditor('Alert Thresholds', 'alertThresholds')}
                />
                <SetupItem
                  title="Risk Configuration"
                  description="Manage risk assessment parameters"
                  onPress={() => void openEditor('Risk Configuration', 'riskConfig')}
                />
                <SetupItem
                  title="Plan Configuration"
                  description="Subscription and tier settings"
                  onPress={() => void openEditor('Plan Configuration', 'planConfig')}
                />
                <SetupItem
                  title="Verification Settings"
                  description="Identity and background check rules"
                  onPress={() => void openEditor('Verification Settings', 'verificationSettings')}
                  hideDivider
                />
              </View>
            </View>

            {/* System Section */}
            <View style={styles.section}>
              <Text style={styles.systemKicker}>SYSTEM</Text>
              <View style={styles.dividerGroup}>
                <SetupItem title="Admin Profile" onPress={() => void openEditor('Admin Profile', 'profile')} />
                <SetupItem title="Notifications" onPress={() => void openEditor('Notifications', 'notifications')} hideDivider />
              </View>
            </View>

            {/* Danger Zone */}
            <View style={styles.dangerSection}>
              <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.85} onPress={handleLogout}>
                <MaterialIcons name="logout" size={20} color={Theme.colors.text} />
                <Text style={styles.logoutText}>LOGOUT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>

      <Modal
        visible={editorOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setEditorOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editorTitle}</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalForm}>
              {renderEditorBody(editorSection, formValues, setFormValues)}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setEditorOpen(false)}>
                <Text style={styles.modalBtnTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnPrimary} onPress={() => void handleSave()}>
                <Text style={styles.modalBtnTextPrimary}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AdminShell>
  );
}

function buildSectionValues(section: string, source: Record<string, any>) {
  switch (section) {
    case 'alertThresholds':
      return {
        fraudBlockThreshold: String(source?.fraudBlockThreshold ?? ''),
        highRiskScore: String(source?.highRiskScore ?? ''),
      };
    case 'riskConfig':
      return {
        deviceSwitchFrequency: String(source?.deviceSwitchFrequency ?? ''),
        gpsSpeedMax: String(source?.gpsSpeedMax ?? ''),
        h3ZoneConsistencyMin: String(source?.h3ZoneConsistencyMin ?? ''),
        claimsLast30dMax: String(source?.claimsLast30dMax ?? ''),
      };
    case 'planConfig':
      return {
        autoRenewDefault: Boolean(source?.autoRenewDefault),
        gracePeriodDays: String(source?.gracePeriodDays ?? ''),
      };
    case 'verificationSettings':
      return {
        kycReviewSlaHours: String(source?.kycReviewSlaHours ?? ''),
        allowManualOverride: Boolean(source?.allowManualOverride),
      };
    case 'notifications':
      return {
        adminEmailAlerts: Boolean(source?.adminEmailAlerts),
        webhookUrl: source?.webhookUrl ?? '',
      };
    case 'profile':
      return {
        displayName: source?.displayName ?? '',
        phone: source?.phone ?? '',
        email: source?.email ?? '',
      };
    default:
      return {};
  }
}

function buildSectionPayload(section: string, values: Record<string, any>) {
  const toNumber = (value: string, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  switch (section) {
    case 'alertThresholds':
      return {
        fraudBlockThreshold: toNumber(values.fraudBlockThreshold, 0),
        highRiskScore: toNumber(values.highRiskScore, 0),
      };
    case 'riskConfig':
      return {
        deviceSwitchFrequency: toNumber(values.deviceSwitchFrequency, 0),
        gpsSpeedMax: toNumber(values.gpsSpeedMax, 0),
        h3ZoneConsistencyMin: toNumber(values.h3ZoneConsistencyMin, 0),
        claimsLast30dMax: toNumber(values.claimsLast30dMax, 0),
      };
    case 'planConfig':
      return {
        autoRenewDefault: Boolean(values.autoRenewDefault),
        gracePeriodDays: toNumber(values.gracePeriodDays, 0),
      };
    case 'verificationSettings':
      return {
        kycReviewSlaHours: toNumber(values.kycReviewSlaHours, 0),
        allowManualOverride: Boolean(values.allowManualOverride),
      };
    case 'notifications':
      return {
        adminEmailAlerts: Boolean(values.adminEmailAlerts),
        webhookUrl: values.webhookUrl?.trim() ? values.webhookUrl.trim() : null,
      };
    case 'profile':
      return {
        displayName: values.displayName?.trim() ?? '',
        phone: values.phone?.trim() ?? '',
      };
    default:
      return {};
  }
}

function renderEditorBody(
  section: string | null,
  values: Record<string, any>,
  setValues: React.Dispatch<React.SetStateAction<Record<string, any>>>,
) {
  if (!section) return null;
  const update = (key: string, value: any) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  switch (section) {
    case 'alertThresholds':
      return (
        <>
          <Field label="Fraud Block Threshold">
            <TextInput
              value={values.fraudBlockThreshold}
              onChangeText={(value) => update('fraudBlockThreshold', value)}
              keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
              style={styles.modalInputText}
              placeholder="0.7"
              placeholderTextColor={Theme.colors.textSecondary}
            />
          </Field>
          <Field label="High Risk Score">
            <TextInput
              value={values.highRiskScore}
              onChangeText={(value) => update('highRiskScore', value)}
              keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
              style={styles.modalInputText}
              placeholder="70"
              placeholderTextColor={Theme.colors.textSecondary}
            />
          </Field>
        </>
      );
    case 'riskConfig':
      return (
        <>
          <Field label="Device Switch Frequency">
            <TextInput
              value={values.deviceSwitchFrequency}
              onChangeText={(value) => update('deviceSwitchFrequency', value)}
              keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
              style={styles.modalInputText}
              placeholder="3"
              placeholderTextColor={Theme.colors.textSecondary}
            />
          </Field>
          <Field label="GPS Speed Max">
            <TextInput
              value={values.gpsSpeedMax}
              onChangeText={(value) => update('gpsSpeedMax', value)}
              keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
              style={styles.modalInputText}
              placeholder="150"
              placeholderTextColor={Theme.colors.textSecondary}
            />
          </Field>
          <Field label="H3 Zone Consistency Min">
            <TextInput
              value={values.h3ZoneConsistencyMin}
              onChangeText={(value) => update('h3ZoneConsistencyMin', value)}
              keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
              style={styles.modalInputText}
              placeholder="0.3"
              placeholderTextColor={Theme.colors.textSecondary}
            />
          </Field>
          <Field label="Claims Last 30d Max">
            <TextInput
              value={values.claimsLast30dMax}
              onChangeText={(value) => update('claimsLast30dMax', value)}
              keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
              style={styles.modalInputText}
              placeholder="10"
              placeholderTextColor={Theme.colors.textSecondary}
            />
          </Field>
        </>
      );
    case 'planConfig':
      return (
        <>
          <ToggleField
            label="Auto Renew Default"
            value={Boolean(values.autoRenewDefault)}
            onValueChange={(value) => update('autoRenewDefault', value)}
          />
          <Field label="Grace Period Days">
            <TextInput
              value={values.gracePeriodDays}
              onChangeText={(value) => update('gracePeriodDays', value)}
              keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
              style={styles.modalInputText}
              placeholder="2"
              placeholderTextColor={Theme.colors.textSecondary}
            />
          </Field>
        </>
      );
    case 'verificationSettings':
      return (
        <>
          <Field label="KYC Review SLA (hours)">
            <TextInput
              value={values.kycReviewSlaHours}
              onChangeText={(value) => update('kycReviewSlaHours', value)}
              keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
              style={styles.modalInputText}
              placeholder="48"
              placeholderTextColor={Theme.colors.textSecondary}
            />
          </Field>
          <ToggleField
            label="Allow Manual Override"
            value={Boolean(values.allowManualOverride)}
            onValueChange={(value) => update('allowManualOverride', value)}
          />
        </>
      );
    case 'notifications':
      return (
        <>
          <ToggleField
            label="Admin Email Alerts"
            value={Boolean(values.adminEmailAlerts)}
            onValueChange={(value) => update('adminEmailAlerts', value)}
          />
          <Field label="Webhook URL">
            <TextInput
              value={values.webhookUrl}
              onChangeText={(value) => update('webhookUrl', value)}
              keyboardType={Platform.OS === 'ios' ? 'url' : 'default'}
              style={styles.modalInputText}
              placeholder="https://example.com/webhook"
              placeholderTextColor={Theme.colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Field>
        </>
      );
    case 'profile':
      return (
        <>
          <Field label="Display Name">
            <TextInput
              value={values.displayName}
              onChangeText={(value) => update('displayName', value)}
              style={styles.modalInputText}
              placeholder="Admin name"
              placeholderTextColor={Theme.colors.textSecondary}
            />
          </Field>
          <Field label="Phone">
            <TextInput
              value={values.phone}
              onChangeText={(value) => update('phone', value)}
              keyboardType={Platform.OS === 'ios' ? 'phone-pad' : 'phone-pad'}
              style={styles.modalInputText}
              placeholder="+91 00000 00000"
              placeholderTextColor={Theme.colors.textSecondary}
            />
          </Field>
          <Field label="Email" readOnly>
            <Text style={styles.modalReadonly}>{values.email || '—'}</Text>
          </Field>
        </>
      );
    default:
      return null;
  }
}

function Field({ label, children, readOnly }: { label: string; children: React.ReactNode; readOnly?: boolean }) {
  return (
    <View style={styles.modalField}>
      <Text style={styles.modalLabel}>{label}</Text>
      <View style={[styles.modalInputWrap, readOnly ? styles.modalInputReadonly : null]}>{children}</View>
    </View>
  );
}

function ToggleField({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.modalToggleRow}>
      <Text style={styles.modalLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: '#d1d5db', true: Theme.colors.primary }} />
    </View>
  );
}

function SetupItem({
  title,
  description,
  onPress,
  hideDivider,
}: {
  title: string;
  description?: string;
  onPress: () => void;
  hideDivider?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.itemRow} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.itemInner, hideDivider ? null : styles.itemDivider]}>
        <View style={styles.itemTextCol}>
          <Text style={styles.itemTitle}>{title}</Text>
          {description ? <Text style={styles.itemDesc}>{description}</Text> : null}
        </View>
        <MaterialIcons name="chevron-right" size={22} color={Theme.colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.colors.background },
  root: { flex: 1, backgroundColor: Theme.colors.background },
  scrollContent: { paddingBottom: 140 },

  header: {
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.xxl,
    paddingBottom: Theme.spacing.lg,
    gap: 6,
  },
  backRow: {
    height: 28,
    width: 28,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: Theme.spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: Theme.colors.text,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2.5,
    color: Theme.colors.textSecondary,
  },

  main: {
    paddingHorizontal: Theme.spacing.lg,
    gap: Theme.spacing.xl,
  },

  section: {},
  dividerGroup: {
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },

  itemRow: { backgroundColor: Theme.colors.background },
  itemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
  },
  itemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  itemTextCol: { flex: 1, paddingRight: 16 },
  itemTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  itemDesc: {
    marginTop: 4,
    fontSize: 14,
    color: Theme.colors.textSecondary,
  },

  systemKicker: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 3,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.sm,
  },

  dangerSection: { paddingTop: Theme.spacing.sm, paddingBottom: Theme.spacing.xl },
  logoutBtn: {
    width: '100%',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.lg,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Theme.colors.background,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    color: Theme.colors.text,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#fff',
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.md,
  },
  modalForm: {
    gap: Theme.spacing.md,
  },
  modalField: {
    gap: 6,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
    letterSpacing: 0.4,
  },
  modalInputWrap: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    backgroundColor: Theme.colors.surface,
  },
  modalInputReadonly: {
    backgroundColor: Theme.colors.background,
  },
  modalInputText: {
    fontSize: 14,
    color: Theme.colors.text,
  },
  modalReadonly: {
    fontSize: 14,
    color: Theme.colors.text,
  },
  modalToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.md,
  },
  modalBtnPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.borderRadius.md,
  },
  modalBtnSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.md,
  },
  modalBtnTextPrimary: {
    color: '#fff',
    fontWeight: '700',
  },
  modalBtnTextSecondary: {
    color: Theme.colors.text,
    fontWeight: '700',
  },

  // Bottom navbar is shared via `AdminBottomNavbar`.
});

