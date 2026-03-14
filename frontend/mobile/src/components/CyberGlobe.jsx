import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';
import Svg, { Circle, Ellipse, Defs, RadialGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS } from '../constants/colors';

function toPoint(latitude, longitude, radius, center) {
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return null;
  }

  const lat = (latitude * Math.PI) / 180;
  const lng = (longitude * Math.PI) / 180;

  const x = center + radius * Math.cos(lat) * Math.sin(lng);
  const y = center - radius * Math.sin(lat);

  return { x, y };
}

export default function CyberGlobe({
  size = 220,
  latitude,
  longitude,
  history = [],
  riskScore = 0,
}) {
  const spin = useRef(new Animated.Value(0)).current;
  const center = size / 2;
  const radius = size * 0.36;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 14000,
        useNativeDriver: true,
      })
    );

    animation.start();
    return () => animation.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const projectedPoint = toPoint(latitude, longitude, radius, center);
  const historyPoints = useMemo(() => {
    return history
      .slice(-6)
      .map((item) => toPoint(item?.lat, item?.lng, radius, center))
      .filter(Boolean);
  }, [history, radius, center]);

  const orbitColor = riskScore >= 65 ? COLORS.red : riskScore >= 40 ? COLORS.orange : COLORS.cyan;

  return (
    <LinearGradient
      colors={['rgba(30, 58, 138, 0.8)', 'rgba(20, 40, 100, 0.6)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Glow Background Effect */}
      <View style={[styles.glowBg, { backgroundColor: orbitColor, opacity: 0.08 }]} />
      
      {/* Main Globe Wrapper */}
      <View style={styles.wrapper}>
        <Animated.View style={[styles.orbitLayer, { transform: [{ rotate }] }]}>
          <Svg width={size} height={size}>
            <Defs>
              <RadialGradient id="globeGradient" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={COLORS.cyan} stopOpacity="0.3" />
                <Stop offset="100%" stopColor={COLORS.blue} stopOpacity="0.1" />
              </RadialGradient>
            </Defs>

            {/* Main Circle with Gradient */}
            <Circle 
              cx={center} 
              cy={center} 
              r={radius} 
              stroke={COLORS.cyan} 
              strokeWidth={2} 
              fill="url(#globeGradient)" 
            />

            {/* Orbital Rings */}
            <Ellipse 
              cx={center} 
              cy={center} 
              rx={radius} 
              ry={radius * 0.68} 
              stroke={COLORS.blue} 
              strokeWidth={1.2} 
              fill="none" 
              opacity={0.7} 
            />
            <Ellipse 
              cx={center} 
              cy={center} 
              rx={radius} 
              ry={radius * 0.35} 
              stroke={COLORS.blue} 
              strokeWidth={1} 
              fill="none" 
              opacity={0.6} 
            />

            {/* Cross Ellipses */}
            <Ellipse 
              cx={center} 
              cy={center} 
              rx={radius * 0.55} 
              ry={radius} 
              stroke={COLORS.cyan} 
              strokeWidth={1.2} 
              fill="none" 
              opacity={0.7} 
            />
            <Ellipse 
              cx={center} 
              cy={center} 
              rx={radius * 0.2} 
              ry={radius} 
              stroke={COLORS.cyan} 
              strokeWidth={1} 
              fill="none" 
              opacity={0.5} 
            />
          </Svg>
        </Animated.View>

        <View style={styles.pointOverlay}>
          {/* History Points */}
          {historyPoints.map((point, index) => (
            <Animated.View
              key={`${point.x}-${point.y}-${index}`}
              style={[
                styles.historyPoint,
                {
                  left: point.x - 2,
                  top: point.y - 2,
                  opacity: 0.6 + (index / historyPoints.length) * 0.4,
                },
              ]}
            />
          ))}

          {/* Active Location Point */}
          {projectedPoint ? (
            <Animated.View
              style={[
                styles.activePoint,
                {
                  borderColor: orbitColor,
                  left: projectedPoint.x - 6,
                  top: projectedPoint.y - 6,
                  shadowColor: orbitColor,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 6,
                  elevation: 8,
                },
              ]}
            />
          ) : null}
        </View>
      </View>

      {/* Labels */}
      <View style={styles.labelWrap}>
        <Text style={styles.labelTitle}>Geo Attestation Globe</Text>
        <Text style={styles.labelSub}>
          {projectedPoint ? 'Live coordinate projected' : 'Waiting for GPS coordinate'}
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  glowBg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    zIndex: 10,
  },
  orbitLayer: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointOverlay: {
    position: 'absolute',
    width: 220,
    height: 220,
  },
  activePoint: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: RADIUS.full,
    borderWidth: 2.5,
    backgroundColor: COLORS.white,
  },
  historyPoint: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.cyan,
  },
  labelWrap: {
    marginTop: 12,
    alignItems: 'center',
    zIndex: 10,
  },
  labelTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textWhite,
    letterSpacing: 0.3,
  },
  labelSub: {
    marginTop: 3,
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
});
