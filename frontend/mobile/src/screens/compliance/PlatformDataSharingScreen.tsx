import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Button from '../../components/ui/Button';

export default function PlatformDataSharingScreen({ navigation }: any) {
  const [partner, setPartner] = useState<'ZOMATO' | 'SWIGGY' | 'DUNZO'>('ZOMATO');

  const handleAgree = async () => {
    // API call to /compliance/consent/dpdp with type: 'PLATFORM', partner
    try {
        await fetch('http://localhost:3001/compliance/consent/dpdp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'PLATFORM', partner })
        });
    } catch (e) {
        // Handle error quietly or show alert
    }
    
    // Once agreed and saved, move to DriverDashboard
    navigation.replace('DriverDashboard');
  };

  return (
    <View style={styles.container}>
       <Text style={styles.title}>Partner Data Sharing</Text>
       <Text style={styles.body}>
         To qualify for the Social Security Code 90/120-day eligibility threshold, 
         do you consent to Aegis securely fetching your delivery history from your gig platform? 
         This verifies your active days seamlessly.
       </Text>

       <View style={styles.partnerRow}>
         {['ZOMATO', 'SWIGGY', 'DUNZO'].map(p => (
           <TouchableOpacity 
             key={p} 
             style={[styles.chip, partner === p && styles.chipActive]}
             onPress={() => setPartner(p as any)}
           >
             <Text style={[styles.chipText, partner === p && styles.chipTextActive]}>{p}</Text>
           </TouchableOpacity>
         ))}
       </View>

       <Button title="I Agree to Data Sharing" onPress={handleAgree} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  body: { fontSize: 14, color: '#64748b', marginBottom: 32 },
  partnerRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  chip: { padding: 12, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8 },
  chipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  chipText: { fontWeight: '600', color: '#64748b' },
  chipTextActive: { color: '#fff' }
});
