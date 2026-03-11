import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Shield, Zap, BarChart2, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { COLORS, SPACING, RADIUS } from '../constants/colors';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: Shield,
    bg: ['#1E3A8A', '#1D4ED8'],
    title: 'Parametric Protection',
    body: "Unlike traditional insurance, Blink pays you automatically when disruptions happen — no claim forms, no waiting, no hassle.",
    stat: '< 2 min', statLabel: 'Payout time',
  },
  {
    icon: BarChart2,
    bg: ['#0F172A', '#1E3A8A'],
    title: 'AI Risk Monitoring',
    body: 'Our system watches weather, AQI, and road conditions 24/7. When risk rises in your delivery zone, you get notified instantly.',
    stat: '24 / 7', statLabel: 'Monitoring',
  },
  {
    icon: Zap,
    bg: ['#1D4ED8', '#2563EB'],
    title: 'Zero Paperwork',
    body: 'Coverage activates as soon as you start your shift. No agents, no paperwork. Just open the app and you\'re covered.',
    stat: '₹0', statLabel: 'Setup cost',
  },
];

export default function OnboardingScreen({ navigation }) {
  const [current, setCurrent] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;

  const goNext = () => {
    if (current < SLIDES.length - 1) {
      Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }).start(() => {
        setCurrent(c => c + 1);
        anim.setValue(0);
      });
    } else {
      navigation.replace('KYC');
    }
  };

  const slide = SLIDES[current] || SLIDES[0];
  const Icon = slide.icon;

  return (
    <LinearGradient colors={slide.bg} style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === current && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.iconWrap}>
          <Icon size={52} color="#FFFFFF" strokeWidth={2} />
        </View>

        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>

        <View style={styles.statBox}>
          <Text style={styles.statVal}>{slide.stat}</Text>
          <Text style={styles.statLbl}>{slide.statLabel}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        {current > 0 ? (
          <TouchableOpacity onPress={() => setCurrent(c => c - 1)} style={styles.backBtn}>
            <ChevronLeft size={18} color="rgba(255,255,255,0.7)" strokeWidth={2.5} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        ) : <View style={{ flex: 1 }} />}

        <TouchableOpacity onPress={goNext} style={styles.nextBtn} activeOpacity={0.9}>
          <Text style={styles.nextText}>{current === SLIDES.length - 1 ? 'Get Protected' : 'Next'}</Text>
          <ChevronRight size={18} color={COLORS.navy} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, paddingHorizontal: SPACING.xl, justifyContent: 'center', alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 8, marginBottom: 48 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { width: 24, borderRadius: 3, backgroundColor: '#FFFFFF' },
  iconWrap: { width: 100, height: 100, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  title: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', marginBottom: 16, lineHeight: 34 },
  body: { fontSize: 14, color: 'rgba(255,255,255,0.72)', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  statBox: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: RADIUS.xl, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  statVal: { fontSize: 28, fontWeight: '900', color: '#FFFFFF' },
  statLbl: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 3 },
  footer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingBottom: 40, gap: 16 },
  backBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  nextBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderRadius: RADIUS.full, paddingVertical: 15, gap: 8 },
  nextText: { fontSize: 15, fontWeight: '800', color: COLORS.navy },
});
