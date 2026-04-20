import React, { useState } from 'react';
import { Modal, View, Text, Switch, StyleSheet } from 'react-native';
import Button from '../ui/Button';
import { Theme } from '../../theme';

/**
 * [DPDP STRICT COMPLIANCE]: Isolates GPS tracking from global T&C.
 * Physically blocks app access until telemetry logic is approved.
 */
export default function GPSConsentModal({ visible, onAccept }: { visible: boolean, onAccept: () => void }) {
  const [isGranted, setIsGranted] = useState(false);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet">
      <View style={styles.container}>
        <Text style={styles.title}>Location Data Consent</Text>
        <Text style={styles.body}>
          Under the DPDP Act 2023, Aegis requires your explicit consent to track your live GPS location. 
          This data is used STRICTLY to correlate your position with high-risk weather cells to process 
          autonomous payouts. It is never sold to third parties.
        </Text>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Enable Risk-Based Tracking</Text>
          <Switch
            value={isGranted}
            onValueChange={setIsGranted}
            thumbColor={Theme.colors.background}
            trackColor={{ false: Theme.colors.border, true: Theme.colors.primary }}
          />
        </View>

        <Button 
          title="I Consent to GPS Tracking" 
          disabled={!isGranted} 
          onPress={() => onAccept()} 
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Theme.spacing.lg, justifyContent: 'center', backgroundColor: Theme.colors.background },
  title: { ...Theme.typography.h2, color: Theme.colors.text, marginBottom: Theme.spacing.md },
  body: { ...Theme.typography.caption, color: Theme.colors.textSecondary, marginBottom: Theme.spacing.xl, lineHeight: 22 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.md,
  },
  toggleLabel: { ...Theme.typography.body, fontWeight: '600' as const, color: Theme.colors.text }
});
