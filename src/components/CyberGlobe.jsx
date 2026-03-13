import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';
import Svg, { Circle, Ellipse } from 'react-native-svg';
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
    <View style={styles.wrapper}>
      <Animated.View style={[styles.orbitLayer, { transform: [{ rotate }] }]}>
        <Svg width={size} height={size}>
          <Circle cx={center} cy={center} r={radius} stroke={COLORS.cyan} strokeWidth={1.5} fill="rgba(30,58,138,0.16)" />

          <Ellipse cx={center} cy={center} rx={radius} ry={radius * 0.68} stroke={COLORS.blue} strokeWidth={1} fill="none" opacity={0.6} />
          <Ellipse cx={center} cy={center} rx={radius} ry={radius * 0.35} stroke={COLORS.blue} strokeWidth={1} fill="none" opacity={0.5} />

          <Ellipse cx={center} cy={center} rx={radius * 0.55} ry={radius} stroke={COLORS.cyan} strokeWidth={1} fill="none" opacity={0.6} />
          <Ellipse cx={center} cy={center} rx={radius * 0.2} ry={radius} stroke={COLORS.cyan} strokeWidth={1} fill="none" opacity={0.45} />
        </Svg>
      </Animated.View>

      <View style={styles.pointOverlay}>
        {historyPoints.map((point, index) => (
          <View
            key={`${point.x}-${point.y}-${index}`}
            style={[
              styles.historyPoint,
              {
                left: point.x - 2,
                top: point.y - 2,
              },
            ]}
          />
        ))}

        {projectedPoint ? (
          <View
            style={[
              styles.activePoint,
              {
                borderColor: orbitColor,
                left: projectedPoint.x - 6,
                top: projectedPoint.y - 6,
              },
            ]}
          />
        ) : null}
      </View>

      <View style={styles.labelWrap}>
        <Text style={styles.labelTitle}>Geo Attestation Globe</Text>
        <Text style={styles.labelSub}>
          {projectedPoint ? 'Live coordinate projected' : 'Waiting for GPS coordinate'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
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
    borderWidth: 2,
    backgroundColor: COLORS.white,
  },
  historyPoint: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.cyan,
    opacity: 0.65,
  },
  labelWrap: {
    marginTop: 8,
    alignItems: 'center',
  },
  labelTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textWhite,
    letterSpacing: 0.3,
  },
  labelSub: {
    marginTop: 2,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
});
