import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Polygon } from 'react-native-svg';
import MainTopNavbar from '../../components/MainTopNavbar';
import DriverBottomNavbar from '../../components/DriverBottomNavbar';
import { useAuth } from '../../context/AuthContext';
import { fraudApi, telemetryApi } from '../../services/api';
import { getDeviceLocation } from '../../utils/location';

const DEFAULT_COORDS = { lat: 12.9716, lng: 77.5946 };

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

type CellRisk = {
  id: string;
  h3Id: string;
  rainPct: number;
  aqi: number;
  floodChance: 'Low' | 'Medium' | 'High';
  disruptionScore: number; // 0..1
  trafficStatus: 'Stable Flow' | 'Slow Traffic' | 'Halt';
  riskScore: number; // 0..100
  riskLevel: RiskLevel;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

function hexPoints(
  cx: number,
  cy: number,
  r: number,
  // pointy-top hex
  startAngleDeg = -30
) {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = ((startAngleDeg + i * 60) * Math.PI) / 180;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return pts.join(' ');
}

function riskColors(level: RiskLevel) {
  switch (level) {
    case 'HIGH':
      return { fill: '#dc2626', stroke: '#dc2626', label: '#b91c1c' };
    case 'MEDIUM':
      return { fill: '#f59e0b', stroke: '#f59e0b', label: '#b45309' };
    case 'LOW':
    default:
      return { fill: '#16a34a', stroke: '#16a34a', label: '#166534' };
  }
}

export default function DriverLiveRiskScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const { user } = useAuth();

  const [cellData, setCellData] = useState<{ current: CellRisk; neighbors: CellRisk[] } | null>(null);
  const [selectedCellId, setSelectedCellId] = useState<string>('c0');
  const [coords, setCoords] = useState(DEFAULT_COORDS);

  // Fixed map size for stable tap targets across devices.
  const mapW = clamp(width - 48, 320, 380);
  const mapH = 260;
  const hexR = 26;

  const toCellRisk = useCallback((raw: any, id: string): CellRisk => {
    const lf = Number(raw?.Lf ?? raw?.lf_score ?? 0.5);
    const riskScore = Math.round(lf * 100);
    const state = raw?.zone_state ?? raw?.state ?? 'STABLE';
    return {
      id,
      h3Id: raw?.h3_cell ?? '—',
      rainPct: Number(raw?.rainfall ?? raw?.rain_pct ?? 0),
      aqi: Number(raw?.aqi ?? raw?.aqi_index ?? 0),
      floodChance: riskScore >= 70 ? 'High' : riskScore >= 40 ? 'Medium' : 'Low',
      disruptionScore: Number(lf.toFixed(2)),
      trafficStatus: state === 'HALTED' ? 'Halt' : state === 'SLOW' ? 'Slow Traffic' : 'Stable Flow',
      riskScore,
      riskLevel: riskLevelFromScore(riskScore),
    };
  }, []);

  const loadZones = useCallback(async () => {
    try {
      const device = (await getDeviceLocation()) ?? DEFAULT_COORDS;
      setCoords(device);
      await telemetryApi.sendGps({
        driverId: user?.id ?? user?.email ?? 'anonymous',
        lat: device.lat,
        lng: device.lng,
        platform: 'mobile-app',
      });
      const res = await fraudApi.getZoneNeighbors(device.lat, device.lng, 1);
      const center = toCellRisk(res?.center ?? {}, 'c0');
      const neighborsRaw = Array.isArray(res?.neighbors) ? res.neighbors.slice(0, 6) : [];
      const neighbors = neighborsRaw.map((entry: any, idx: number) => toCellRisk(entry, `n${idx + 1}`));
      while (neighbors.length < 6) {
        neighbors.push({ ...center, id: `n${neighbors.length + 1}` });
      }
      setCellData({ current: center, neighbors });
    } catch {
      const fallback = toCellRisk({}, 'c0');
      setCellData({ current: fallback, neighbors: Array.from({ length: 6 }, (_, i) => ({ ...fallback, id: `n${i + 1}` })) });
    }
  }, [toCellRisk, user?.email, user?.id]);

  useEffect(() => {
    void loadZones();
  }, [loadZones]);

  const cells = useMemo(() => cellData ?? {
    current: toCellRisk({}, 'c0'),
    neighbors: Array.from({ length: 6 }, (_, i) => ({ ...toCellRisk({}, 'c0'), id: `n${i + 1}` })),
  }, [cellData, toCellRisk]);

  const selectedCell: CellRisk = useMemo(() => {
    if (selectedCellId === cells.current.id) return cells.current;
    return cells.neighbors.find((n) => n.id === selectedCellId) ?? cells.current;
  }, [cells.current, cells.neighbors, selectedCellId]);

  const risk = useMemo(() => riskColors(selectedCell.riskLevel), [selectedCell.riskLevel]);

  const center = useMemo(() => ({ x: mapW / 2, y: mapH / 2 + 8 }), [mapW]);

  const hexPositions = useMemo(() => {
    // pointy-top axial coords:
    // directions: (1,0),(1,-1),(0,-1),(-1,0),(-1,1),(0,1)
    // Convert axial -> pixel:
    // x = r * sqrt(3) * (q + r/2); y = r * 3/2 * r.
    const r = hexR;
    const SQRT3 = Math.sqrt(3);
    const dx = r * SQRT3;
    const dy = r * 1.5;

    const centerAx = { q: 0, a: 0 };

    const toPx = (q: number, a: number) => ({
      x: center.x + dx * (q + a / 2),
      y: center.y + dy * a,
    });

    const neighborCoords = [
      { id: cells.neighbors[0].id, q: 1, a: 0 },
      { id: cells.neighbors[1].id, q: 1, a: -1 },
      { id: cells.neighbors[2].id, q: 0, a: -1 },
      { id: cells.neighbors[3].id, q: -1, a: 0 },
      { id: cells.neighbors[4].id, q: -1, a: 1 },
      { id: cells.neighbors[5].id, q: 0, a: 1 },
    ];

    return {
      center: {
        id: cells.current.id,
        ...toPx(centerAx.q, centerAx.a),
      },
      neighbors: neighborCoords.map((c) => ({ ...c, ...toPx(c.q, c.a) })),
    };
  }, [cells.current.id, cells.neighbors, center.x, center.y, hexR]);

  const backgroundHexes = useMemo(() => {
    // Generate a subtle background grid for the map.
    const hexes: Array<{ cx: number; cy: number; key: string }> = [];
    const r = hexR;
    const SQRT3 = Math.sqrt(3);
    const dx = r * SQRT3;
    const dy = r * 1.5;
    const baseX = center.x - dx * 1.2;
    const baseY = center.y - dy * 1.2;
    const cols = 4;
    const rows = 4;
    for (let yi = 0; yi < rows; yi++) {
      for (let xi = 0; xi < cols; xi++) {
        const cx = baseX + dx * xi + (dx / 2) * (yi % 2);
        const cy = baseY + dy * yi;
        hexes.push({ cx, cy, key: `bg-${xi}-${yi}` });
      }
    }
    return hexes;
  }, [center.x, center.y, hexR]);

  const driverLat = `${coords.lat.toFixed(4)}° N`;
  const driverLon = `${coords.lng.toFixed(4)}° W`;
  const lastPing = 'just now';

  return (
    <SafeAreaView style={styles.safeArea}>
      <MainTopNavbar />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Strip */}
        <View style={styles.statusStrip}>
          <View style={styles.statusCol}>
            <Text style={styles.stripLabel}>Driver ID</Text>
            <Text style={styles.stripValue}>{user?.id ?? user?.email ?? '—'}</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.statusCol}>
            <Text style={styles.stripLabel}>Risk Score</Text>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreValue}>{selectedCell.riskScore}</Text>
              <Text style={styles.stripMinor}>/100</Text>
            </View>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.statusColEnd}>
            <View style={styles.riskPillRow}>
              <View style={styles.pingDotWrap}>
                <View style={[styles.pingDot, { backgroundColor: risk.fill }]} />
              </View>
              <Text style={[styles.riskPillText, { color: risk.label }]}>
                {selectedCell.riskLevel === 'LOW'
                  ? 'Low Risk'
                  : selectedCell.riskLevel === 'MEDIUM'
                    ? 'Medium Risk'
                    : 'High Risk'}
              </Text>
            </View>
            <Text style={styles.stripMinor}>Ping: 2m ago</Text>
          </View>
        </View>

        {/* Hero Map */}
        <View style={styles.mapHero}>
          <View style={styles.mapGridOverlay} />

          <Svg width={mapW} height={mapH} style={styles.mapSvg}>
            {/* background hex outlines */}
            {backgroundHexes.map((h) => (
              <Polygon
                key={h.key}
                points={hexPoints(h.cx, h.cy, hexR)}
                fill="transparent"
                stroke="#16a34a"
                strokeOpacity={0.12}
                strokeWidth={1}
              />
            ))}

            {/* driver marker */}
            <Circle
              cx={hexPositions.center.x}
              cy={hexPositions.center.y}
              r={6}
              fill="#16a34a"
            />
            <Circle
              cx={hexPositions.center.x}
              cy={hexPositions.center.y}
              r={14}
              fill="#16a34a"
              opacity={0.12}
            />

            {/* cells */}
            {(() => {
              const current = cells.current;
              const currentCol = riskColors(current.riskLevel);
              const centerSelected = selectedCellId === current.id;
              return (
                <Polygon
                  points={hexPoints(
                    hexPositions.center.x,
                    hexPositions.center.y,
                    hexR
                  )}
                  fill={
                    centerSelected
                      ? currentCol.fill
                      : 'rgba(22, 163, 74, 0.20)'
                  }
                  stroke={centerSelected ? currentCol.stroke : currentCol.stroke}
                  strokeWidth={centerSelected ? 3 : 2.5}
                  onPress={() => setSelectedCellId(current.id)}
                />
              );
            })()}
            {hexPositions.neighbors.map((p) => {
              const cell = cells.neighbors.find((n) => n.id === p.id)!;
              const c = riskColors(cell.riskLevel);
              const selected = selectedCellId === cell.id;
              return (
                <Polygon
                  key={cell.id}
                  points={hexPoints(p.x, p.y, hexR)}
                  fill={
                    selected ? c.fill : 'rgba(243,244,246,1)'
                  }
                  stroke={selected ? c.stroke : '#e5e7eb'}
                  strokeWidth={selected ? 3 : 1.5}
                  opacity={selected ? 1 : 0.95}
                  onPress={() => setSelectedCellId(cell.id)}
                />
              );
            })}
          </Svg>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendRow}>
              <View style={styles.legendDot} />
              <Text style={styles.legendText}>Secure Grid</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: '#dc2626' }]} />
              <Text style={styles.legendText}>High Hazard</Text>
            </View>
          </View>

          {/* Top left H3 badge */}
          <View style={styles.h3BadgeRow}>
            <View style={styles.h3Badge}>
              <Ionicons name="location-outline" size={14} color="#16a34a" />
              <Text style={styles.h3BadgeText}>H3: {selectedCell.h3Id}</Text>
            </View>
            <View style={styles.liveFeedBadge}>
              <View style={styles.liveFeedPulse} />
              <Text style={styles.liveFeedText}>Live Feed</Text>
            </View>
          </View>
        </View>

        {/* Cell readout */}
        <View style={styles.readoutGrid}>
          <View style={styles.readoutCard}>
            <Text style={styles.readoutLabel}>Flood</Text>
            <Text style={styles.readoutValue}>
              {selectedCell.floodChance}
            </Text>
          </View>
          <View style={styles.readoutCard}>
            <Text style={styles.readoutLabel}>AQI Index</Text>
            <Text style={styles.readoutValue}>{selectedCell.aqi}</Text>
          </View>
          <View style={styles.readoutCard}>
            <Text style={styles.readoutLabel}>Traffic</Text>
            <Text style={styles.readoutValue}>{selectedCell.trafficStatus}</Text>
          </View>
        </View>

        {/* Selected cell details */}
        <View style={styles.infoCard}>
          <View style={styles.infoTopRow}>
            <Ionicons name="information-circle" size={18} color="#16a34a" />
            <Text style={styles.infoText}>
              Hazards are calculated from live environmental pings and attached to the selected H3 grid cell.
            </Text>
          </View>

          <View style={styles.detailGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Rain</Text>
              <Text style={styles.detailValue}>{selectedCell.rainPct}%</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Disruption</Text>
              <Text style={styles.detailValue}>{selectedCell.disruptionScore.toFixed(2)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Risk Level</Text>
              <Text style={[styles.detailValue, { color: risk.label }]}>
                {selectedCell.riskLevel}
              </Text>
            </View>
          </View>

          <View style={styles.validationRow}>
            <View style={styles.validationLeft}>
              <Text style={styles.validationTitleText}>Validation</Text>
              <View style={styles.validationChip}>
                <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                <Text style={styles.validationChipText}>Valid</Text>
              </View>
              <Text style={styles.validationMeta}>
                {driverLat}, {driverLon} • {lastPing}
              </Text>
            </View>
            <Ionicons name="share-outline" size={20} color="#6b7280" />
          </View>
        </View>

        {/* CTA Cluster */}
        <View style={styles.ctaCluster}>
          <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.9}>
            <Ionicons name="refresh" size={18} color="#ffffff" />
            <Text style={styles.primaryBtnText}>Recheck Location</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.9}>
            <Text style={styles.secondaryBtnText}>Details</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 12 }} />
      </ScrollView>

      <DriverBottomNavbar navigation={navigation} activeKey="risk" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f9fa' },
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },

  statusStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f2f3ff',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(215, 235, 232, 0.6)',
  },
  statusCol: { flex: 1 },
  statusColEnd: { flex: 1, alignItems: 'flex-end' },
  stripDivider: { width: 1, height: 24, backgroundColor: '#d1d5db' },
  stripLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#6b7280',
  },
  stripValue: { fontSize: 14, fontWeight: '900', color: '#0f172a', marginTop: 4 },
  stripMinor: { fontSize: 10, fontWeight: '600', color: '#9ca3af', marginTop: 6 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 },
  scoreValue: { fontSize: 14, fontWeight: '900', color: '#16a34a' },
  riskPillRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  pingDotWrap: {
    width: 10,
    height: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pingDot: { width: 10, height: 10, borderRadius: 5 },
  riskPillText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },

  mapHero: {
    minHeight: 220,
    borderRadius: 20,
    backgroundColor: '#f7f9fa',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    position: 'relative' as const,
    marginBottom: 12,
  },
  mapGridOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f3f4f6',
    opacity: 0.35,
  },
  mapSvg: {
    position: 'absolute' as const,
    left: 0,
    top: 0,
  },

  legend: {
    position: 'absolute' as const,
    left: 16,
    bottom: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(209, 213, 219, 0.4)',
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 3, backgroundColor: '#16a34a', opacity: 0.25, borderWidth: 1, borderColor: '#16a34a' },
  legendText: { fontSize: 10, fontWeight: '700', color: '#6b7280' },

  h3BadgeRow: {
    position: 'absolute' as const,
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  h3Badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(209, 213, 219, 0.4)',
  },
  h3BadgeText: { fontSize: 10, fontWeight: '900', color: '#0f172a' },
  liveFeedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  liveFeedPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  liveFeedText: { fontSize: 10, fontWeight: '900', color: '#ffffff' },

  readoutGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  readoutCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  readoutLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  readoutValue: { fontSize: 14, fontWeight: '900', color: '#0f172a' },

  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
  },
  infoTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#6b7280', lineHeight: 18 },

  detailGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 10,
  },
  detailItem: { flex: 1, alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 14, paddingVertical: 10 },
  detailLabel: { fontSize: 10, fontWeight: '900', color: '#6b7280', textTransform: 'uppercase' },
  detailValue: { fontSize: 14, fontWeight: '900', color: '#0f172a', marginTop: 6 },

  validationRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
    gap: 12,
  },
  validationLeft: { flex: 1 },
  validationTitleText: { fontSize: 10, fontWeight: '900', color: '#6b7280', textTransform: 'uppercase' },
  validationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dcfce7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  validationChipText: { fontSize: 10, fontWeight: '900', color: '#166534' },
  validationMeta: { marginTop: 6, fontSize: 12, color: '#6b7280', fontWeight: '600' },

  ctaCluster: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    marginBottom: 12,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#16a34a',
    borderRadius: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '900', color: '#0f172a' },
});

