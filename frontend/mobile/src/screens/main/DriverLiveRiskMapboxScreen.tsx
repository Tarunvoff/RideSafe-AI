import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import WebView from 'react-native-webview';
import MainTopNavbar from '../../components/MainTopNavbar';
import DriverLogoutMenu from '../../components/DriverLogoutMenu';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { Theme } from '../../theme';
import { fraudApi } from '../../services/api';
import LocationErrorCard from '../../components/LocationErrorCard';

// ────── TYPESCRIPT TYPES ──────────────────────────────────────────────────────

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
type FloodChance = 'Low' | 'Medium' | 'High';
type TrafficStatus = 'Stable Flow' | 'Slow Traffic' | 'Halt';

type SelectedCellRisk = {
  h3Index: string;
  riskLevel: RiskLevel;
  riskScore: number; // 0..100
  rainPct: number; // 0..100
  aqi: number; // 0..500
  floodChance: FloodChance;
  disruptionScore: number; // 0..1
  trafficStatus: TrafficStatus;
};

type RiskCell = {
  h3Index: string;
  riskLevel: RiskLevel;
  riskScore: number;
  rainPct: number;
  aqi: number;
  floodChance: FloodChance;
  disruptionScore: number;
  trafficStatus: TrafficStatus;
};

type RiskMap = Record<string, RiskCell>;

interface ZoneStateResponse {
  h3_cell: string;
  state?: string;
  lf_score?: number;
  active_riders?: number;
  rainfall?: number;
  temperature?: number;
  humidity?: number;
  aqi?: number;
  pm25?: number;
  pm10?: number;
  [key: string]: any;
}

interface ZoneNeighborsResponse {
  center: ZoneStateResponse;
  neighbors: ZoneStateResponse[];
}

function formatRiskLevel(level: RiskLevel) {
  if (level === 'HIGH') return 'High Risk';
  if (level === 'MEDIUM') return 'Medium Risk';
  return 'Low Risk';
}

/**
 * Transform backend API response to RiskMap keyed by H3 index.
 * Handles missing/incomplete data gracefully with sensible defaults.
 */
function transformToRiskMap(apiResponse: ZoneNeighborsResponse | null): RiskMap {
  if (!apiResponse) return {};

  const result: RiskMap = {};
  const allZones: ZoneStateResponse[] = [];

  // Collect center and neighbors.
  if (apiResponse.center) allZones.push(apiResponse.center);
  if (apiResponse.neighbors && Array.isArray(apiResponse.neighbors)) {
    allZones.push(...apiResponse.neighbors);
  }

  for (const zone of allZones) {
    if (!zone.h3_cell) continue;

    const lf_score = Math.round((zone.lf_score ?? 0) * 100); // 0–100
    
    // Map lf_score to riskLevel and derive other metrics.
    const riskLevel: RiskLevel =
      lf_score >= 70 ? 'HIGH' : lf_score >= 40 ? 'MEDIUM' : 'LOW';

    // Estimate disruption from lf_score (0–1).
    const disruptionScore = (zone.lf_score ?? 0) * 1.0; // Already 0–1

    result[zone.h3_cell] = {
      h3Index: zone.h3_cell,
      riskLevel,
      riskScore: lf_score, // Use lf_score as risk score (0–100)
      rainPct: Math.round((zone.rainfall ?? 0) * 10), // Convert mm to percentage-like metric
      aqi: Math.round(zone.aqi ?? 50), // Default safe AQI
      floodChance:
        (zone.rainfall ?? 0) > 30
          ? 'High'
          : (zone.rainfall ?? 0) > 10
            ? 'Medium'
            : 'Low',
      disruptionScore: Math.min(1, disruptionScore),
      trafficStatus:
        disruptionScore > 0.65
          ? 'Halt'
          : disruptionScore > 0.3
            ? 'Slow Traffic'
            : 'Stable Flow',
    };
  }

  return result;
}

const H3_RESOLUTIONS = [8, 9, 10] as const;
const VIEW_MODE_MOBILE = 'mobile' as const;
const VIEW_MODE_WEB = 'web' as const;

// ────── HELPER FUNCTION ──────────────────────────────────────────────────

function getLocationErrorType(
  errorMessage: string | null
): 'permission' | 'gps' | 'general' | null {
  if (!errorMessage) return null;

  const errorLower = errorMessage.toLowerCase();

  if (
    errorLower.includes('access denied') ||
    errorLower.includes('permission denied') ||
    errorLower.includes('not granted')
  ) {
    return 'permission';
  }

  if (
    errorLower.includes('gps') ||
    errorLower.includes('signal') ||
    errorLower.includes('timeout') ||
    errorLower.includes('unable to determine')
  ) {
    return 'gps';
  }

  return 'general';
}

export default function DriverLiveRiskMapboxScreen({ navigation }: any) {
  const { logout, user } = useAuth();
  const webRef = useRef<WebView>(null);
  const webFullRef = useRef<WebView>(null);

  const { location, refreshLocation } = useLocation();
  const hasValidLocation = location.isValid && location.latitude != null && location.longitude != null;
  const driverLat = location.latitude ?? 0;
  const driverLon = location.longitude ?? 0;
  const lastPing = location.fetchedAt
    ? location.fetchedAt.toLocaleTimeString('en-IN', { 
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })
    : '—';
  
  // ────── REAL RISK DATA STATE ──────────────────────────────────────────────

  const [riskMap, setRiskMap] = useState<RiskMap>({});
  const [isLoadingRisk, setIsLoadingRisk] = useState(false);
  const [riskError, setRiskError] = useState<string | null>(null);
  
  // ────── VIEW MODE STATE ──────────────────────────────────────────────────
  const [h3Resolution, setH3Resolution] = useState<(typeof H3_RESOLUTIONS)[number]>(9);
  const [driverH3, setDriverH3] = useState<string>('—');
  const [selectedCell, setSelectedCell] = useState<SelectedCellRisk | null>(null);
  const [viewMode, setViewMode] = useState<typeof VIEW_MODE_MOBILE | typeof VIEW_MODE_WEB>(VIEW_MODE_MOBILE);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);

  // ────── FETCH LIVE RISK DATA ──────────────────────────────────────────────

  useEffect(() => {
    if (!Number.isFinite(driverLat) || !Number.isFinite(driverLon)) {
      setRiskMap({});
      return;
    }

    const fetchRiskData = async () => {
      setIsLoadingRisk(true);
      setRiskError(null);

      try {
        const response = await fraudApi.getZoneNeighbors(
          driverLat,
          driverLon,
          1 // radius = 1 ring of neighbors
        );

        const transformed = transformToRiskMap(response as unknown as ZoneNeighborsResponse);
        setRiskMap(transformed);
      } catch (error: any) {
        console.error('[RiskMap] Failed to fetch risk data:', error);
        const errorMessage = error?.message ?? 'Failed to load risk data';
        setRiskError(errorMessage);
        setRiskMap({});
      } finally {
        setIsLoadingRisk(false);
      }
    };

    fetchRiskData();
  }, [driverLat, driverLon]);

  // ────── INJECT RISK MAP INTO WEBVIEW ──────────────────────────────────────

  // Whenever riskMap changes, send it to WebView so mock is replaced with real data.
  useEffect(() => {
    if (Object.keys(riskMap).length === 0) return;

    const injectedJS = `
      console.log('[Injected] Received risk data:', Object.keys(window.__RISK_MAP__).length, 'cells');
      window.__RISK_MAP__ = ${JSON.stringify(riskMap)};
      window.__RISK_LOADED__ = true;
      console.log('[Injected] Updated window.__RISK_MAP__ with', Object.keys(window.__RISK_MAP__).length, 'cells');
      if (window.refreshRiskLayer && typeof window.refreshRiskLayer === 'function') {
        console.log('[Injected] Calling refreshRiskLayer()');
        window.refreshRiskLayer();
      } else {
        console.warn('[Injected] refreshRiskLayer not found!');
      }
      true;
    `;

    const targetRef = viewMode === 'web' ? webFullRef.current : webRef.current;
    if (!targetRef) return;

    console.log('[RiskMap] Injecting', Object.keys(riskMap).length, 'cells into WebView');
    targetRef.injectJavaScript(injectedJS);
  }, [riskMap, viewMode]);

  // ────── PERIODIC RISK DATA REFRESH (every 30 seconds) ──────────────────────

  useEffect(() => {
    if (!Number.isFinite(driverLat) || !Number.isFinite(driverLon)) return;

    // Fetch immediately, then every 30 seconds for dynamic color updates
    const fetchInterval = setInterval(async () => {
      try {
        const response = await fraudApi.getZoneNeighbors(
          driverLat,
          driverLon,
          1 // radius = 1 ring of neighbors
        );

        const transformed = transformToRiskMap(response as unknown as ZoneNeighborsResponse);
        setRiskMap(transformed);
      } catch (error: any) {
        console.error('[RiskMap Refresh] Failed to fetch risk data:', error);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(fetchInterval);
  }, [driverLat, driverLon]);
  
  const formatCoords = (lat: number, lon: number) => {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lonDir = lon >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
  };

  const handleRecenter = () => {
    void refreshLocation();
    sendToWebView({ type: 'RECENTER' });
  };

  const handleLogout = async () => {
    try {
      setProfileMenuVisible(false);
      await logout();
    } catch {
      setProfileMenuVisible(false);
    }
  };

  const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN as string | undefined;

  const sendToWebView = (payload: Record<string, unknown>) => {
    const msg = JSON.stringify(payload);
    const targetRef = viewMode === 'web' ? webFullRef.current : webRef.current;
    if (!targetRef) return;
    targetRef.injectJavaScript(
      `window.__RN_HANDLE__(${msg}); true;`
    );
  };

  const html = useMemo(() => {
    // Mapbox + H3 are loaded in the web layer so we can render true hex polygons and
    // interactive Mapbox GL features without adding native Mapbox dependencies.
    const token = mapboxToken ? mapboxToken : '';
    const driver = { lat: driverLat, lon: driverLon, isMock: !hasValidLocation };
    const res = h3Resolution;

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
    />
    <title>Live Risk</title>
    <link
      href="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css"
      rel="stylesheet"
    />
    <style>
      html, body { margin: 0; padding: 0; background: #ffffff; height: 100%; }
      #map { position: relative; width: 100%; height: 100%; }
      .wrap {
        position: absolute;
        top: 12px;
        left: 12px;
        right: 12px;
        display: flex;
        justify-content: space-between;
        pointer-events: none;
        gap: 10px;
      }
      .badge {
        pointer-events: none;
        background: rgba(255,255,255,0.92);
        border: 1px solid rgba(229,231,235,0.9);
        border-radius: 999px;
        padding: 8px 12px;
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .badge strong { font-size: 12px; color: #0f172a; }
      .badge span { font-size: 12px; color: #16a34a; font-weight: 800; }
      .legend {
        margin-top: 8px;
        pointer-events: none;
        position: absolute;
        bottom: 14px;
        left: 14px;
        background: rgba(255,255,255,0.92);
        border: 1px solid rgba(229,231,235,0.9);
        border-radius: 16px;
        padding: 12px;
      }
      .legendRow { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
      .legendDot { width: 10px; height: 10px; border-radius: 3px; background: rgba(22,163,74,0.25); border: 1px solid rgba(22,163,74,0.5); }
      .legendText { font-size: 12px; font-weight: 700; color: #6b7280; }
    </style>
    <script src="https://unpkg.com/h3-js@4.0.0/dist/h3-js.umd.min.js"></script>
    <script src="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js"></script>
  </head>
  <body>
    <div id="map"></div>
    <div class="wrap">
      <div class="badge" id="h3Badge">
        <span>H3</span>
        <strong id="h3IdText">—</strong>
      </div>
      <div class="badge" style="background: rgba(22,163,74,0.95); border-color: rgba(22,163,74,0.95);">
        <span style="color: #ffffff;">Live Feed</span>
      </div>
    </div>

    <div class="legend">
      <div class="legendRow">
        <div class="legendDot" style="background: rgba(34,197,94,0.35); border-color: rgba(22,163,74,0.65);"></div>
        <div class="legendText">Low Risk (Safe)</div>
      </div>
      <div class="legendRow">
        <div class="legendDot" style="background: rgba(234,179,8,0.45); border-color: rgba(202,138,4,0.85);"></div>
        <div class="legendText">Medium Risk</div>
      </div>
      <div class="legendRow">
        <div class="legendDot" style="background: rgba(239,68,68,0.45); border-color: rgba(220,38,38,0.95);"></div>
        <div class="legendText">High Risk (Alert!)</div>
      </div>
    </div>

    <script>
      const MAPBOX_TOKEN = ${JSON.stringify(token)};
      mapboxgl.accessToken = MAPBOX_TOKEN;

      const driver = ${JSON.stringify(driver)};
      let resolution = ${JSON.stringify(res)};
      const gridK = 1; // neighbors around driver cell

      let map;
      let driverH3 = null;
      let selectedH3 = null;
      let cells = [];
      let currentFC = null;
      let driverMarker = null;

      // Placeholder for backend binding:
      // RN can inject a real riskMap keyed by H3 index later.
      // NOTE: We use window.__RISK_MAP__ directly so updates are reflected!
      console.log('[MapInit] Initial riskMap cells:', Object.keys(window.__RISK_MAP__ || {}).length);

      function post(type, data) {
        if (!window.ReactNativeWebView) return;
        window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...data }));
      }

      function getRiskForH3(h3Index) {
        // ✅ Real data ONLY — access window.__RISK_MAP__ directly so updates are reflected
        const riskMap = window.__RISK_MAP__ || {};
        const riskData = riskMap[h3Index] || {
          h3Index,
          riskLevel: 'LOW',
          riskScore: 0,
          rainPct: 0,
          aqi: 50,
          floodChance: 'Low',
          disruptionScore: 0,
          trafficStatus: 'Stable Flow'
        };
        
        if (h3Index === driverH3 && Object.keys(riskMap).length > 0) {
          console.log('[getRiskForH3] Driver cell data:', { h3Index, riskLevel: riskData.riskLevel, riskScore: riskData.riskScore, hasData: !!riskMap[h3Index] });
        }
        
        return riskData;
      }

      function riskColor(level) {
        // GREEN for LOW, YELLOW for MEDIUM, RED for HIGH
        if (level === 'HIGH') return { fill: 'rgba(239,68,68,0.45)', stroke: 'rgba(220,38,38,0.95)' }; // Red
        if (level === 'MEDIUM') return { fill: 'rgba(234,179,8,0.45)', stroke: 'rgba(202,138,4,0.85)' }; // Yellow
        return { fill: 'rgba(34,197,94,0.35)', stroke: 'rgba(22,163,74,0.65)' }; // Green
      }

      function updateDriverMarker() {
        // Update marker color based on driver's current cell risk level
        if (!driverMarker || !driverH3) {
          console.log('[updateDriverMarker] Marker or driverH3 not ready', { driverMarker: !!driverMarker, driverH3 });
          return;
        }
        
        const driverRisk = getRiskForH3(driverH3);
        console.log('[updateDriverMarker] Driver cell:', driverH3, 'Risk:', driverRisk.riskLevel, 'Score:', driverRisk.riskScore);
        
        let markerColor = '#16a34a'; // Default green for LOW
        
        if (driver.isMock) {
          markerColor = '#f59e0b'; // Orange for mock
        } else if (driverRisk.riskLevel === 'HIGH') {
          markerColor = '#dc2626'; // Red
          console.log('[updateDriverMarker] Setting marker to RED');
        } else if (driverRisk.riskLevel === 'MEDIUM') {
          markerColor = '#ca8a04'; // Yellow
          console.log('[updateDriverMarker] Setting marker to YELLOW');
        } else {
          console.log('[updateDriverMarker] Setting marker to GREEN');
        }
        
        // Create new marker with updated color
        try {
          driverMarker.remove();
          driverMarker = new mapboxgl.Marker({ color: markerColor })
            .setLngLat([driver.lon, driver.lat])
            .addTo(map);
          console.log('[updateDriverMarker] Marker updated to color:', markerColor);
        } catch (err) {
          console.error('[updateDriverMarker] Error updating marker:', err);
        }
      }

      function computeDriverH3() {
        // h3-js API differs by version; use best-effort fallbacks.
        if (h3.latLngToCell) return h3.latLngToCell(driver.lat, driver.lon, resolution);
        if (h3.geoToH3) return h3.geoToH3(driver.lat, driver.lon, resolution);
        if (h3.geoToH3String) return h3.geoToH3String(driver.lat, driver.lon, resolution);
        throw new Error('No geoToH3 function found in h3-js');
      }

      function cellBoundaryGeoJSON(h3Index) {
        // Returns GeoJSON polygon ring in [lng,lat].
        // h3-js boundary returns [{lat,lng}, ...] or [[lat,lng], ...] depending on version.
        let boundary = null;
        if (h3.cellToBoundary) boundary = h3.cellToBoundary(h3Index, true);
        else if (h3.h3ToGeoBoundary) boundary = h3.h3ToGeoBoundary(h3Index, true);
        else throw new Error('No cellToBoundary found in h3-js');

        // Normalize to array of [lat,lng]
        const ptsLatLng = boundary.map(p => {
          if (Array.isArray(p)) {
            return { lat: p[0], lng: p[1] };
          }
          return { lat: p.lat ?? p[0], lng: p.lng ?? p[1] };
        });

        const ring = ptsLatLng.map(pt => [pt.lng, pt.lat]);
        // close polygon
        if (ring.length > 0) ring.push(ring[0]);
        return ring;
      }

      function buildGeoJSON() {
        driverH3 = computeDriverH3();
        const disk = h3.kRing ? h3.kRing(driverH3, gridK) : h3.gridDisk(driverH3, gridK);
        cells = Array.from(disk);

        // Ensure selected defaults to driver cell.
        if (!selectedH3) selectedH3 = driverH3;

        const features = cells.map((h3Index) => {
          const risk = getRiskForH3(h3Index);
          const isDriver = (h3Index === driverH3) ? 1 : 0;
          const isSelected = (h3Index === selectedH3) ? 1 : 0;
          const ring = cellBoundaryGeoJSON(h3Index);

          return {
            type: 'Feature',
            properties: {
              h3Index,
              riskLevel: risk.riskLevel,
              riskScore: risk.riskScore,
              rainPct: risk.rainPct,
              aqi: risk.aqi,
              floodChance: risk.floodChance,
              disruptionScore: risk.disruptionScore,
              trafficStatus: risk.trafficStatus,
              isDriver,
              isSelected
            },
            geometry: { type: 'Polygon', coordinates: [ring] }
          };
        });

        currentFC = { type: 'FeatureCollection', features };
        return currentFC;
      }

      function syncContextFromGeoJSON(fc) {
        const driverFeature = fc.features.find(f => f.properties.isDriver === 1);
        const selectedFeature = fc.features.find(f => f.properties.h3Index === selectedH3);
        const driverId = driverFeature ? driverFeature.properties.h3Index : driverH3;
        document.getElementById('h3IdText').textContent = selectedH3 || '—';
        post('SYNC_CONTEXT', { driverH3: driverId, selected: selectedFeature ? selectedFeature.properties.h3Index : selectedH3 });
      }

      function setSelected(nextH3) {
        selectedH3 = nextH3;
        const fc = currentFC;
        if (!fc) return;
        fc.features = fc.features.map(f => {
          return { ...f, properties: { ...f.properties, isSelected: f.properties.h3Index === selectedH3 ? 1 : 0 } };
        });
        map.getSource('h3cells').setData(fc);
        const feat = fc.features.find(f => f.properties.h3Index === selectedH3);
        if (feat) {
          document.getElementById('h3IdText').textContent = selectedH3;
          post('SELECT_CELL', { cell: feat.properties });
        }
      }

      function handleCellClick(e) {
        const feat = e.features && e.features[0];
        if (!feat) return;
        const idx = feat.properties.h3Index;
        setSelected(idx);
      }

      function initMap() {
        map = new mapboxgl.Map({
          container: 'map',
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [driver.lon, driver.lat],
          zoom: 12.5,
          attributionControl: false,
          scrollZoom: true,
          dragPan: true
        });

        map.addControl(new mapboxgl.NavigationControl({ showCompass: false, showZoom: true }), 'top-right');
        map.on('load', () => {
          // Emphasize driver location with a marker (will be updated by updateDriverMarker based on risk).
          driverMarker = new mapboxgl.Marker({ color: driver.isMock ? '#f59e0b' : '#16a34a' })
            .setLngLat([driver.lon, driver.lat])
            .addTo(map);
          
          const fc = buildGeoJSON();
          map.addSource('h3cells', { type: 'geojson', data: fc });
        
          // Update marker color based on driver's risk level
          updateDriverMarker();

          // Base fill for all cells: GREEN (LOW), YELLOW (MEDIUM), RED (HIGH)
          map.addLayer({
            id: 'h3fill',
            type: 'fill',
            source: 'h3cells',
            paint: {
              'fill-color': [
                'case',
                ['==', ['get', 'riskLevel'], 'HIGH'], 'rgba(239,68,68,0.45)',  // RED
                ['==', ['get', 'riskLevel'], 'MEDIUM'], 'rgba(234,179,8,0.45)', // YELLOW
                'rgba(34,197,94,0.35)' // GREEN for LOW
              ],
              'fill-opacity': 1,
              'fill-outline-color': [
                'case',
                ['==', ['get', 'riskLevel'], 'HIGH'], 'rgba(220,38,38,0.95)',
                ['==', ['get', 'riskLevel'], 'MEDIUM'], 'rgba(202,138,4,0.85)',
                'rgba(22,163,74,0.65)'
              ]
            }
          });

          // Selected cell stronger fill.
          map.addLayer({
            id: 'h3selectedfill',
            type: 'fill',
            source: 'h3cells',
            filter: ['==', ['get', 'isSelected'], 1],
            paint: {
              'fill-color': 'rgba(22,163,74,0.55)',
              'fill-opacity': 1
            }
          });

          // Driver outline always emphasized.
          map.addLayer({
            id: 'h3driveroutline',
            type: 'line',
            source: 'h3cells',
            filter: ['==', ['get', 'isDriver'], 1],
            paint: {
              'line-color': 'rgba(22,163,74,0.95)',
              'line-width': 3
            }
          });

          // Selected outline on top.
          map.addLayer({
            id: 'h3selectedoutline',
            type: 'line',
            source: 'h3cells',
            filter: ['==', ['get', 'isSelected'], 1],
            paint: {
              'line-color': 'rgba(16,185,129,0.95)',
              'line-width': 5
            }
          });

          // Tap/click handling.
          map.off('click', 'h3fill', handleCellClick);
          map.off('click', 'h3selectedfill', handleCellClick);
          map.on('click', 'h3fill', handleCellClick);
          map.on('click', 'h3selectedfill', handleCellClick);

          map.on('mousemove', 'h3fill', function () {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', 'h3fill', function () {
            map.getCanvas().style.cursor = '';
          });

          syncContextFromGeoJSON(fc);
          // Default emit selection too.
          const selectedFeat = fc.features.find(f => f.properties.h3Index === selectedH3);
          if (selectedFeat) post('SELECT_CELL', { cell: selectedFeat.properties });
        });
      }

      function rebuildGrid(nextResolution) {
        resolution = nextResolution;
        selectedH3 = null;
        // Remove and re-add source/layers to keep the logic simple and reliable.
        if (!map) return;
        if (!map.isStyleLoaded || !map.isStyleLoaded()) return;

        const ids = ['h3fill', 'h3selectedfill', 'h3driveroutline', 'h3selectedoutline'];
        ids.forEach(id => {
          if (map.getLayer(id)) map.removeLayer(id);
        });
        if (map.getSource('h3cells')) map.removeSource('h3cells');
        const fc = buildGeoJSON();
        map.addSource('h3cells', { type: 'geojson', data: fc });

        // Re-add layers after rebuild with updated GREEN/YELLOW/RED colors.
        map.addLayer({
          id: 'h3fill',
          type: 'fill',
          source: 'h3cells',
          paint: {
            'fill-color': [
              'case',
              ['==', ['get', 'riskLevel'], 'HIGH'], 'rgba(239,68,68,0.45)',  // RED
              ['==', ['get', 'riskLevel'], 'MEDIUM'], 'rgba(234,179,8,0.45)', // YELLOW
              'rgba(34,197,94,0.35)' // GREEN for LOW
            ],
            'fill-opacity': 1,
            'fill-outline-color': [
              'case',
              ['==', ['get', 'riskLevel'], 'HIGH'], 'rgba(220,38,38,0.95)',
              ['==', ['get', 'riskLevel'], 'MEDIUM'], 'rgba(202,138,4,0.85)',
              'rgba(22,163,74,0.65)'
            ]
          }
        });

        map.addLayer({
          id: 'h3selectedfill',
          type: 'fill',
          source: 'h3cells',
          filter: ['==', ['get', 'isSelected'], 1],
          paint: {
            'fill-color': 'rgba(22,163,74,0.55)',
            'fill-opacity': 1
          }
        });

        map.addLayer({
          id: 'h3driveroutline',
          type: 'line',
          source: 'h3cells',
          filter: ['==', ['get', 'isDriver'], 1],
          paint: {
            'line-color': 'rgba(22,163,74,0.95)',
            'line-width': 3
          }
        });

        map.addLayer({
          id: 'h3selectedoutline',
          type: 'line',
          source: 'h3cells',
          filter: ['==', ['get', 'isSelected'], 1],
          paint: {
            'line-color': 'rgba(16,185,129,0.95)',
            'line-width': 5
          }
        });

        map.off('click', 'h3fill', handleCellClick);
        map.off('click', 'h3selectedfill', handleCellClick);
        map.on('click', 'h3fill', handleCellClick);
        map.on('click', 'h3selectedfill', handleCellClick);

        syncContextFromGeoJSON(fc);
        const selectedFeat = fc.features.find(f => f.properties.h3Index === selectedH3);
        if (selectedFeat) post('SELECT_CELL', { cell: selectedFeat.properties });
      }

      function setDriver(nextLat, nextLon, nextIsMock) {
        if (!map) return;
        driver.lat = nextLat;
        driver.lon = nextLon;
        driver.isMock = Boolean(nextIsMock);
        map.easeTo({ center: [driver.lon, driver.lat], duration: 400 });
        rebuildGrid(resolution);
        
        // After grid rebuild, update marker with correct risk-based color
        setTimeout(() => {
          updateDriverMarker();
        }, 100);
      }

      function refreshRiskLayer() {
        // Called when new risk data arrives from React Native
        if (!map || !map.isStyleLoaded || !map.isStyleLoaded()) return;
        
        console.log('[refreshRiskLayer] Updating with new risk data');
        
        // Rebuild the GeoJSON with latest riskMap data
        const fc = buildGeoJSON();
        if (map.getSource('h3cells')) {
          map.getSource('h3cells').setData(fc);
          console.log('[refreshRiskLayer] GeoJSON updated with', fc.features.length, 'cells');
        }
        
        // Update marker color based on driver's new risk level
        updateDriverMarker();
        console.log('[refreshRiskLayer] Driver marker updated');
      }
      
      // Auto-refresh driver marker color every 5 seconds to catch backend variance changes
      setInterval(() => {
        if (!map || !driverH3) return;
        updateDriverMarker();
      }, 5000);

      window.__RN_HANDLE__ = function(payload) {
        try {
          if (!payload || !payload.type) return;
          if (payload.type === 'SET_RESOLUTION') {
            rebuildGrid(payload.resolution);
          }
          if (payload.type === 'SET_DRIVER') {
            if (typeof payload.lat === 'number' && typeof payload.lon === 'number') {
              setDriver(payload.lat, payload.lon, payload.isMock);
            }
          }
          if (payload.type === 'RECENTER') {
            if (!map) return;
            map.easeTo({ center: [driver.lon, driver.lat], duration: 400 });
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.log(err);
        }
      };

      if (!MAPBOX_TOKEN) {
        // If token is missing, keep the page functional (details panel will still show mock values).
        // We cannot render Mapbox tiles without a token.
        document.getElementById('h3IdText').textContent = 'Missing Mapbox token';
      } else {
        initMap();
      }
    </script>
  </body>
</html>`;
  }, [driverLat, driverLon, h3Resolution, mapboxToken, hasValidLocation]);

  useEffect(() => {
    if (!Number.isFinite(driverLat) || !Number.isFinite(driverLon)) return;
    sendToWebView({
      type: 'SET_DRIVER',
      lat: driverLat,
      lon: driverLon,
      isMock: !hasValidLocation,
    });
  }, [driverLat, driverLon, hasValidLocation, viewMode]);

  const onWebMessage = (e: any) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'SYNC_CONTEXT') {
        if (typeof msg.driverH3 === 'string') setDriverH3(msg.driverH3);
        return;
      }
      if (msg.type === 'SELECT_CELL') {
        const p = msg.cell as any;
        const cellRisk: SelectedCellRisk = {
          h3Index: String(p.h3Index),
          riskLevel: p.riskLevel as RiskLevel,
          riskScore: Number(p.riskScore),
          rainPct: Number(p.rainPct),
          aqi: Number(p.aqi),
          floodChance: p.floodChance as FloodChance,
          disruptionScore: Number(p.disruptionScore),
          trafficStatus: p.trafficStatus as TrafficStatus,
        };
        setSelectedCell(cellRisk);
        return;
      }
    } catch {
      // ignore
    }
  };

  const driverCellId = driverH3;
  const selectedCellId = selectedCell?.h3Index ?? '—';

  const riskLevelLabel = selectedCell ? formatRiskLevel(selectedCell.riskLevel) : '—';

  // ────── RENDER LOADING STATE ──────────────────────────────────────────────

  if (isLoadingRisk) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <MainTopNavbar onProfilePress={() => setProfileMenuVisible(true)} />
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.loadingText}>Loading live risk data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ────── RENDER EMPTY STATE ──────────────────────────────────────────────

  if (!riskMap || Object.keys(riskMap).length === 0) {
    const errorType = getLocationErrorType(riskError);

    // If there's a location-related error, show professional error card
    if (errorType) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <MainTopNavbar onProfilePress={() => setProfileMenuVisible(true)} />
          <View style={styles.centeredContainer}>
            <LocationErrorCard
              errorType={errorType}
              message={riskError || 'Unknown error'}
              onRetry={() => refreshLocation()}
            />
          </View>
        </SafeAreaView>
      );
    }

    // Generic "no data" state when there's no error (shouldn't happen often)
    return (
      <SafeAreaView style={styles.safeArea}>
        <MainTopNavbar onProfilePress={() => setProfileMenuVisible(true)} />
        <View style={styles.centeredContainer}>
          <Ionicons name="warning-outline" size={48} color="#f59e0b" />
          <Text style={styles.emptyTitle}>No Risk Data Available</Text>
          <Text style={styles.emptySubtitle}>
            Unable to load risk data for your current location.
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            activeOpacity={0.8}
            onPress={() => refreshLocation()}
          >
            <Text style={styles.retryBtnText}>Refresh Location</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ────── RENDER NORMAL VIEW ──────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <MainTopNavbar onProfilePress={() => setProfileMenuVisible(true)} />

      <DriverLogoutMenu
        visible={profileMenuVisible}
        userEmail={user?.email ?? null}
        onClose={() => setProfileMenuVisible(false)}
        onLogout={() => {
          void handleLogout();
        }}
      />

      <View style={styles.modeToggleRow}>
        <TouchableOpacity
          style={[
            styles.modeTab,
            viewMode === VIEW_MODE_MOBILE && styles.modeTabActive,
          ]}
          activeOpacity={0.9}
          onPress={() => setViewMode(VIEW_MODE_MOBILE)}
        >
          <Text
            style={[
              styles.modeTabText,
              viewMode === VIEW_MODE_MOBILE && styles.modeTabTextActive,
            ]}
          >
            Mobile View
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.modeTab,
            viewMode === VIEW_MODE_WEB && styles.modeTabActive,
          ]}
          activeOpacity={0.9}
          onPress={() => setViewMode(VIEW_MODE_WEB)}
        >
          <Text
            style={[
              styles.modeTabText,
              viewMode === VIEW_MODE_WEB && styles.modeTabTextActive,
            ]}
          >
            Web View
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === VIEW_MODE_MOBILE ? (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.statusStrip}>
          <View style={styles.stripCol}>
            <Text style={styles.stripLabel}>Driver ID</Text>
            <Text style={styles.stripValue}>GS-8821</Text>
          </View>

          <View style={styles.stripDivider} />

          <View style={styles.stripEnd}>
            <View style={styles.livePill}>
              <View style={[styles.liveDot, { backgroundColor: '#16a34a' }]} />
              <Text style={styles.livePillText}>{riskLevelLabel}</Text>
            </View>
            <Text style={styles.stripMinor}>Ping: {lastPing}</Text>
          </View>
        </View>

        <View style={styles.mapHero}>
          {hasValidLocation ? (
            <WebView
              key={`mobile-${driverLat}-${driverLon}-${h3Resolution}`}
              ref={webRef}
              originWhitelist={['*']}
              source={{ html }}
              style={styles.mapWeb}
              javaScriptEnabled
              domStorageEnabled
              onMessage={onWebMessage}
              scrollEnabled={false}
              // Important: avoid nested scroll fighting with Mapbox touch gestures.
              nestedScrollEnabled={true}
            />
          ) : (
            <View style={styles.locationBlocked}>
              <Ionicons name="location-outline" size={28} color="#9ca3af" />
              <Text style={styles.locationBlockedTitle}>Location required</Text>
              <Text style={styles.locationBlockedText}>Enable GPS to view live H3 risk zones.</Text>
              <TouchableOpacity style={styles.locationBlockedBtn} onPress={handleRecenter}>
                <Ionicons name="refresh" size={14} color="#111827" />
                <Text style={styles.locationBlockedBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {!mapboxToken && hasValidLocation && (
            <View style={styles.mapOverlayMessage}>
              <Text style={styles.mapOverlayTitle}>Mapbox token missing</Text>
              <Text style={styles.mapOverlaySubtitle}>
                Set EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN in your .env to see the live hex map.
              </Text>
            </View>
          )}

          <View style={styles.mapOverlayTop}>
            <View style={styles.overlayBadge}>
              <Text style={styles.overlayBadgeText}>H3: {selectedCellId}</Text>
            </View>

            <TouchableOpacity
              style={styles.recenterBtn}
              activeOpacity={0.9}
              onPress={handleRecenter}
            >
              <Ionicons name="locate" size={16} color="#ffffff" />
              <Text style={styles.recenterText}>Recenter</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.resolutionRow}>
            {H3_RESOLUTIONS.map((r) => {
              const isActive = r === h3Resolution;
              return (
                <TouchableOpacity
                  key={r}
                  onPress={() => {
                    setH3Resolution(r);
                    // Let the web layer rebuild grid without a full page reload.
                    sendToWebView({ type: 'SET_RESOLUTION', resolution: r });
                  }}
                  activeOpacity={0.9}
                  style={[
                    styles.resolutionChip,
                    isActive && styles.resolutionChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.resolutionChipText,
                      isActive && styles.resolutionChipTextActive,
                    ]}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Cell Details</Text>

          <View style={styles.detailsMetaGrid}>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Current Driver H3</Text>
              <Text style={styles.metaValue} numberOfLines={2}>{driverCellId}</Text>
            </View>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Selected H3</Text>
              <Text style={styles.metaValue} numberOfLines={2}>{selectedCellId}</Text>
            </View>
          </View>

          <View style={styles.riskGrid}>
            <View style={styles.riskCell}>
              <Text style={styles.riskLabel}>Rain</Text>
              <Text style={styles.riskValue}>{selectedCell?.rainPct ?? 0}%</Text>
            </View>
            <View style={styles.riskCell}>
              <Text style={styles.riskLabel}>AQI</Text>
              <Text style={styles.riskValue}>{selectedCell?.aqi ?? 0}</Text>
            </View>
            <View style={styles.riskCell}>
              <Text style={styles.riskLabel}>Flood</Text>
              <Text style={styles.riskValue}>{selectedCell?.floodChance ?? '—'}</Text>
            </View>
            <View style={styles.riskCell}>
              <Text style={styles.riskLabel}>Disruption</Text>
              <Text style={styles.riskValue}>
                {selectedCell ? selectedCell.disruptionScore.toFixed(2) : '—'}
              </Text>
            </View>
          </View>

          <View style={styles.bottomMetaRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.metaLabel}>Traffic / Halt</Text>
              <Text style={styles.metaValue}>{selectedCell?.trafficStatus ?? '—'}</Text>
            </View>
          </View>

          <View style={styles.validationRow}>
            <View style={styles.validationLeft}>
              <Text style={styles.validationTitle}>Validation</Text>
              <View style={[styles.validationChip, hasValidLocation ? styles.validationChipLive : styles.validationChipMock]}>
                <Ionicons name="checkmark-circle" size={14} color={hasValidLocation ? Theme.colors.primary : '#f59e0b'} />
                <Text style={[styles.validationChipText, hasValidLocation ? styles.validationChipTextLive : styles.validationChipTextMock]}>
                  {location.loading ? 'Fetching location' : hasValidLocation ? 'Valid location confirmed' : 'Location unavailable'}
                </Text>
              </View>
              <Text style={styles.validationMeta}>
                {hasValidLocation ? formatCoords(driverLat, driverLon) : '—'}
              </Text>
              <Text style={styles.validationMetaSecondary}>
                {hasValidLocation ? `Fetched at ${lastPing}` : `Location missing • ${lastPing}`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.ctaCluster}>
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.9}
            onPress={handleRecenter}
          >
            <Ionicons name="refresh" size={16} color="#ffffff" />
            <Text style={styles.primaryBtnText}>Recheck Location</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.9}
            onPress={() => {}}
          >
            <Text style={styles.secondaryBtnText}>Details</Text>
          </TouchableOpacity>
        </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      ) : (
        <View style={styles.webOnlyContainer}>
          {hasValidLocation ? (
            <WebView
              key={`web-${driverLat}-${driverLon}-${h3Resolution}`}
              ref={webFullRef}
              originWhitelist={['*']}
              source={{ html }}
              style={styles.webOnlyWebView}
              javaScriptEnabled
              domStorageEnabled
              onMessage={onWebMessage}
              scrollEnabled={false}
            />
          ) : (
            <View style={[styles.locationBlocked, styles.webOnlyBlocked]}>
              <Ionicons name="location-outline" size={28} color="#9ca3af" />
              <Text style={styles.locationBlockedTitle}>Location required</Text>
              <Text style={styles.locationBlockedText}>Enable GPS to view live H3 risk zones.</Text>
              <TouchableOpacity style={styles.locationBlockedBtn} onPress={handleRecenter}>
                <Ionicons name="refresh" size={14} color="#111827" />
                <Text style={styles.locationBlockedBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
          {!mapboxToken && hasValidLocation && (
            <View style={styles.webOnlyOverlay}>
              <Text style={styles.mapOverlayTitle}>Mapbox token missing</Text>
              <Text style={styles.mapOverlaySubtitle}>
                Set EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN in your .env to load the full web map.
              </Text>
            </View>
          )}
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f9fa' },
  modeToggleRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 999,
    padding: 2,
  },
  modeTab: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTabActive: {
    backgroundColor: '#ffffff',
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
  },
  modeTabTextActive: {
    color: '#111827',
  },
  content: {
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
    borderColor: '#e5e7eb',
    gap: 12,
  },
  stripCol: { flex: 1 },
  stripEnd: { flex: 1, alignItems: 'flex-end' },
  stripDivider: { width: 1, height: 24, backgroundColor: '#d1d5db' },
  stripLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#6b7280',
  },
  stripValue: { fontSize: 14, fontWeight: '900', color: '#0f172a', marginTop: 4 },
  stripMinor: { fontSize: 10, fontWeight: '700', color: '#9ca3af', marginTop: 6 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 },
  scoreValue: { fontSize: 14, fontWeight: '900', color: '#16a34a' },
  scoreMinor: { fontSize: 10, fontWeight: '800', color: '#9ca3af' },

  livePill: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  livePillText: { fontSize: 10, fontWeight: '900', color: '#16a34a' },

  mapHero: {
    height: 360,
    minHeight: 300,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    position: 'relative',
  },
  locationBlocked: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    backgroundColor: '#f8fafc',
  },
  webOnlyBlocked: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  locationBlockedTitle: { fontSize: 14, fontWeight: '800', color: '#111827' },
  locationBlockedText: { fontSize: 12, color: '#6b7280', textAlign: 'center' },
  locationBlockedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
  },
  locationBlockedBtnText: { fontSize: 12, fontWeight: '700', color: '#111827' },
  mapWeb: { width: '100%', height: '100%', backgroundColor: '#ffffff' },
  mapOverlayMessage: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: '40%',
    transform: [{ translateY: -24 }],
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(15,23,42,0.92)',
  },
  mapOverlayTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#e5e7eb',
    marginBottom: 4,
    textAlign: 'center',
  },
  mapOverlaySubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9ca3af',
    textAlign: 'center',
  },
  webOnlyContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120,
  },
  webOnlyWebView: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  webOnlyOverlay: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: '45%',
    transform: [{ translateY: -24 }],
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(15,23,42,0.96)',
  },

  mapOverlayTop: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    zIndex: 5,
  },
  overlayBadge: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  overlayBadgeText: { fontSize: 10, fontWeight: '900', color: '#0f172a' },

  recenterBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  recenterText: { color: '#ffffff', fontSize: 10, fontWeight: '900' },

  resolutionRow: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    zIndex: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  resolutionChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  resolutionChipActive: { borderColor: '#16a34a', backgroundColor: 'rgba(220,252,231,0.92)' },
  resolutionChipText: { fontSize: 12, fontWeight: '900', color: '#6b7280' },
  resolutionChipTextActive: { color: '#166534' },

  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    marginTop: 12,
  },
  detailsTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 12 },
  detailsMetaGrid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  metaBox: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 16, padding: 12 },
  metaLabel: { fontSize: 10, fontWeight: '900', color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 },
  metaValue: { fontSize: 12, fontWeight: '900', color: '#0f172a' },

  riskGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  riskCell: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    padding: 12,
  },
  riskLabel: { fontSize: 10, fontWeight: '900', color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 },
  riskValue: { fontSize: 14, fontWeight: '900', color: '#0f172a' },

  bottomMetaRow: { marginBottom: 12 },

  validationRow: { borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 12 },
  validationLeft: { flex: 1 },
  validationTitle: { fontSize: 10, fontWeight: '900', color: '#6b7280', textTransform: 'uppercase', marginBottom: 8 },
  validationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  validationChipLive: { backgroundColor: '#dcfce7' },
  validationChipMock: { backgroundColor: '#fef3c7' },
  validationChipText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  validationChipTextLive: { color: '#166534' },
  validationChipTextMock: { color: '#b45309' },
  validationMeta: { marginTop: 8, fontSize: 12, fontWeight: '700', color: '#6b7280', fontFamily: 'monospace' },
  validationMetaSecondary: { marginTop: 4, fontSize: 11, fontWeight: '600', color: '#9ca3af', fontFamily: 'monospace' },

  ctaCluster: {
    flexDirection: 'row',
    gap: 12,
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

  // ────── LOADING & EMPTY STATE STYLES ──────────────────────────────────────

  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
    textAlign: 'center',
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
});

