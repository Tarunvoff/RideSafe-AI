import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, Animated } from 'react-native';
import Svg, { Circle, Ellipse, Line, G, Defs, RadialGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';

const RotatingEarthGlobe = ({
  size = 280,
  latitude,
  longitude,
  history = [],
  riskScore = 0,
}) => {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const [graticuleLines, setGraticuleLines] = useState([]);

  const canvasSize = 300;
  const center = canvasSize / 2;
  const radius = 100;

  useEffect(() => {
    // Generate graticule lines
    const lines = [];
    const step = 45;

    // Latitude lines
    for (let lat = -90; lat <= 90; lat += step) {
      const lngPoints = [];
      for (let lng = -180; lng <= 180; lng += 15) {
        const radLat = (lat * Math.PI) / 180;
        const radLng = (lng * Math.PI) / 180;
        
        const x = center + radius * Math.cos(radLat) * Math.sin(radLng);
        const y = center - radius * Math.sin(radLat);
        
        lngPoints.push(`${x},${y}`);
      }
      if (lngPoints.length > 0) {
        lines.push({
          id: `lat-${lat}`,
          points: lngPoints.join(' '),
          type: 'lat',
        });
      }
    }

    // Longitude lines
    for (let lng = -180; lng <= 180; lng += step) {
      const latPoints = [];
      for (let lat = -90; lat <= 90; lat += 15) {
        const radLat = (lat * Math.PI) / 180;
        const radLng = (lng * Math.PI) / 180;
        
        const x = center + radius * Math.cos(radLat) * Math.sin(radLng);
        const y = center - radius * Math.sin(radLat);
        
        latPoints.push(`${x},${y}`);
      }
      if (latPoints.length > 0) {
        lines.push({
          id: `lng-${lng}`,
          points: latPoints.join(' '),
          type: 'lng',
        });
      }
    }

    setGraticuleLines(lines);
  }, []);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 360,
        duration: 30000,
        useNativeDriver: true,
      })
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [spinAnim]);

  const generateHaltoneDots = () => {
    const dots = [];
    const step = 12;

    // Generate grid of dots across globe
    for (let lng = -170; lng <= 170; lng += step) {
      for (let lat = -85; lat <= 85; lat += step) {
        // Simple land mass approximation (filters water)
        const landProb = Math.abs(Math.sin(lng * 0.01) * Math.cos(lat * 0.01));
        if (landProb > 0.3) {
          const radLat = (lat * Math.PI) / 180;
          const radLng = (lng * Math.PI) / 180;

          const x = center + radius * Math.cos(radLat) * Math.sin(radLng);
          const y = center - radius * Math.sin(radLat);

          // Only show dots within circle
          const dist = Math.sqrt(Math.pow(x - center, 2) + Math.pow(y - center, 2));
          if (dist < radius) {
            dots.push({
              x,
              y,
              r: 0.8,
              opacity: 0.6 + landProb * 0.4,
            });
          }
        }
      }
    }

    return dots;
  };

  const haltoneDots = generateHaltoneDots();

  const orbitColor = riskScore >= 65 ? COLORS.red : riskScore >= 40 ? COLORS.orange : COLORS.cyan;

  return (
    <LinearGradient
      colors={['rgba(15, 23, 42, 0.9)', 'rgba(30, 58, 138, 0.7)', 'rgba(20, 40, 100, 0.8)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Globe Visualization */}
      <View style={styles.globeWrapper}>
        <Animated.View
          style={[
            styles.rotatingContainer,
            {
              transform: [
                {
                  rotate: spinAnim.interpolate({
                    inputRange: [0, 360],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        >
          <Svg width={300} height={300} viewBox={`0 0 300 300`}>
            <Defs>
              <RadialGradient id="globeGrad" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#1a3a52" stopOpacity="0.4" />
                <Stop offset="100%" stopColor="#000000" stopOpacity="0.8" />
              </RadialGradient>
            </Defs>

            {/* Black background */}
            <Circle cx={center} cy={center} r={canvasSize / 2} fill="#000000" />

            {/* Ocean circle */}
            <Circle
              cx={center}
              cy={center}
              r={radius + 2}
              fill="url(#globeGrad)"
              stroke="#ffffff"
              strokeWidth="2"
              opacity="0.9"
            />

            {/* Graticule lines */}
            <G opacity="0.25">
              {graticuleLines.map((line) => (
                <Ellipse
                  key={line.id}
                  cx={center}
                  cy={center}
                  rx={radius * (line.type === 'lat' ? 1 : 0.7)}
                  ry={radius * (line.type === 'lat' ? 0.7 : 1)}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="0.5"
                  opacity="0.4"
                />
              ))}
            </G>

            {/* Main orbital lines */}
            <Ellipse
              cx={center}
              cy={center}
              rx={radius}
              ry={radius * 0.6}
              fill="none"
              stroke="#ffffff"
              strokeWidth="1"
              opacity="0.5"
            />

            <Ellipse
              cx={center}
              cy={center}
              rx={radius * 0.8}
              ry={radius * 0.8}
              fill="none"
              stroke="#87ceeb"
              strokeWidth="0.8"
              opacity="0.4"
            />

            {/* Halftone dots for land masses */}
            <G opacity="0.7">
              {haltoneDots.map((dot, idx) => (
                <Circle
                  key={`dot-${idx}`}
                  cx={dot.x}
                  cy={dot.y}
                  r={dot.r}
                  fill="#999999"
                  opacity={dot.opacity}
                />
              ))}
            </G>

            {/* Outer boundary circle */}
            <Circle
              cx={center}
              cy={center}
              r={radius + 1}
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.5"
              opacity="0.9"
            />

            {/* Center point marker */}
            <Circle cx={center} cy={center} r="1.5" fill="#87ceeb" opacity="0.8" />
          </Svg>
        </Animated.View>
      </View>

      {/* Labels */}
      <View style={styles.labelSection}>
        <Text style={styles.labelMain}>Geo Attestation Globe</Text>
        <Text style={styles.labelSub}>Live coordinate projected</Text>
        {riskScore > 0 && (
          <Text
            style={[
              styles.riskLabel,
              {
                color:
                  riskScore >= 65 ? COLORS.red : riskScore >= 40 ? COLORS.orange : COLORS.cyan,
              },
            ]}
          >
            Risk Score: {riskScore}%
          </Text>
        )}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 18,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 430,
  },
  globeWrapper: {
    width: 300,
    height: 300,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rotatingContainer: {
    width: 300,
    height: 300,
  },
  labelSection: {
    marginTop: 14,
    alignItems: 'center',
    zIndex: 10,
  },
  labelMain: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  labelSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '500',
    marginBottom: 5,
  },
  riskLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginTop: 3,
  },
});

export default RotatingEarthGlobe;
