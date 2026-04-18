import React, { useState } from 'react';
import { Modal, View, Text, Switch, StyleSheet } from 'react-native';
import Button from '../ui/Button';

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
          <Switch value={isGranted} onValueChange={setIsGranted} />
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
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  body: { fontSize: 14, color: '#64748b', marginBottom: 32, lineHeight: 22 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, padding: 16, backgroundColor: '#f1f5f9', borderRadius: 8 },
  toggleLabel: { fontSize: 16, fontWeight: '600' }
});
