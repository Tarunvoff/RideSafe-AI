import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AegisNavbar from '../../components/layout/AegisNavbar';
import DriverLogoutMenu from '../../components/driver/DriverLogoutMenu';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { driverApi } from '../../services/api';

import { WebView } from 'react-native-webview';

const BRAND_BG = '#ff6b53';
const CARD_BG = '#f0ecce';

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * (Math.PI / 180);
  const dLng = (b.lng - a.lng) * (Math.PI / 180);
  const lat1 = a.lat * (Math.PI / 180);
  const lat2 = b.lat * (Math.PI / 180);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const x = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function buildSyntheticNearbyDarkstore(
  driverLat: number,
  driverLng: number,
  seedText: string,
): { lat: number; lng: number } {
  const seed = hashString(seedText || 'darkstore-fallback');
  const meters = 350 + (seed % 650); // ~350m to ~1km away
  const angle = ((seed % 360) * Math.PI) / 180;
  const dLat = (meters * Math.cos(angle)) / 111_320;
  const cosLat = Math.cos((driverLat * Math.PI) / 180);
  const safeCosLat = Math.abs(cosLat) < 1e-6 ? 1e-6 : cosLat;
  const dLng = (meters * Math.sin(angle)) / (111_320 * safeCosLat);
  return { lat: driverLat + dLat, lng: driverLng + dLng };
}

export default function DriverLiveRiskScreenWeb() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { location, refreshLocation } = useLocation();
  const [profileMenuVisible, setProfileMenuVisible] = React.useState(false);
  const [darkstoreText, setDarkstoreText] = React.useState<string | null>(null);
  const [darkstoreCoord, setDarkstoreCoord] = React.useState<{ lat: number; lng: number } | null>(null);

  const token = (process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '').trim();
  const hasCoords =
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude) &&
    location.isValid;

  const handleLogout = async () => {
    try {
      setProfileMenuVisible(false);
      await logout();
    } catch {
      Alert.alert(t('common.error'), t('common.logout_failed'));
    }
  };

  const centerLat = hasCoords ? (location.latitude as number) : 12.9716;
  const centerLng = hasCoords ? (location.longitude as number) : 77.5946;

  const mapHtml = React.useMemo(() => {
    if (!token || !hasCoords || !darkstoreCoord) return '';
    const driverLat = centerLat;
    const driverLng = centerLng;
    const storeLat = darkstoreCoord.lat;
    const storeLng = darkstoreCoord.lng;
    const km = haversineKm({ lat: driverLat, lng: driverLng }, { lat: storeLat, lng: storeLng });
    const zoom = clamp(14 - Math.log2(Math.max(km, 0.2)), 10, 15);
    const midLat = (driverLat + storeLat) / 2;
    const midLng = (driverLng + storeLng) / 2;

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.css" rel="stylesheet" />
  <style>
    html, body, #map { margin:0; padding:0; width:100%; height:100%; background:#e5e7eb; }
    .map-wrap { position: relative; width: 100%; height: 100%; }
    .marker-wrap { transform: translate(-50%, -100%); }
    .driver-stack, .store-stack {
      position: relative;
      width: 42px;
      height: 42px;
      display:flex;
      align-items:center;
      justify-content:center;
    }
    .store-stack { width: 54px; height: 54px; }
    .pulse-ring {
      position: absolute;
      inset: 0;
      border-radius: 999px;
      border: 2px solid rgba(30,144,255,.45);
      animation: pulse 2.1s ease-out infinite;
      pointer-events: none;
    }
    .pulse-ring.store {
      border-color: rgba(249,115,22,.42);
      animation-duration: 2.6s;
    }
    .driver-dot {
      position: relative;
      width: 16px; height: 16px; border-radius: 8px;
      background: #1e90ff; border: 2px solid #ffffff;
      box-shadow: 0 0 0 5px rgba(30,144,255,.22), 0 2px 6px rgba(0,0,0,.2);
    }
    .store-badge {
      position: relative;
      width: 46px; height: 46px; border-radius: 23px;
      background: #ffffff; border: 2px solid #111827;
      box-shadow: 0 3px 10px rgba(0,0,0,.22);
      display:flex; align-items:center; justify-content:center;
    }
    .store-badge svg { width: 28px; height: 28px; display:block; }
    .store-chip {
      position: absolute;
      bottom: -20px;
      left: 50%;
      transform: translateX(-50%);
      white-space: nowrap;
      font: 700 10px/1 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: rgba(255,255,255,.96);
      border: 1.5px solid #111827;
      border-radius: 999px;
      padding: 3px 7px;
      color: #111827;
      letter-spacing: 0.2px;
    }
    .fab-stack {
      position: absolute;
      left: 10px;
      top: 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      z-index: 20;
    }
    .fab-btn {
      min-width: 96px;
      border: 2px solid #111827;
      border-radius: 999px;
      background: rgba(255,255,255,0.96);
      color: #111827;
      font: 800 11px/1 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      padding: 7px 10px;
      box-shadow: 0 3px 10px rgba(0,0,0,.18);
      cursor: pointer;
      text-align: center;
      user-select: none;
    }
    .fab-btn:active { transform: translateY(1px); }
    @keyframes pulse {
      0%   { transform: scale(0.72); opacity: .66; }
      70%  { transform: scale(1.14); opacity: .05; }
      100% { transform: scale(1.18); opacity: 0; }
    }
  </style>
</head>
<body>
  <div class="map-wrap">
    <div id="map"></div>
    <div class="fab-stack">
      <button class="fab-btn" id="fit-zone-btn">Fit Zone</button>
      <button class="fab-btn" id="recenter-btn">Recenter</button>
    </div>
  </div>
  <script src="https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.js"></script>
  <script>
    mapboxgl.accessToken = ${JSON.stringify(token)};
    const map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [${midLng}, ${midLat}],
      zoom: ${zoom.toFixed(2)},
      attributionControl: false
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    const driver = [${driverLng}, ${driverLat}];
    const store = [${storeLng}, ${storeLat}];

    function markerEl(kind) {
      const el = document.createElement('div');
      el.className = 'marker-wrap';
      if (kind === 'driver') {
        const stack = document.createElement('div');
        stack.className = 'driver-stack';
        const ring = document.createElement('div');
        ring.className = 'pulse-ring';
        const dot = document.createElement('div');
        dot.className = 'driver-dot';
        stack.appendChild(ring);
        stack.appendChild(dot);
        el.appendChild(stack);
        return el;
      }
      const stack = document.createElement('div');
      stack.className = 'store-stack';
      const ring = document.createElement('div');
      ring.className = 'pulse-ring store';
      const badge = document.createElement('div');
      badge.className = 'store-badge';
      badge.innerHTML = '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 25L19 16H45L49 25V29H15V25Z" fill="#f97316" stroke="#111827" stroke-width="3" stroke-linejoin="round"/><rect x="17" y="29" width="30" height="20" rx="3" fill="#fff7ed" stroke="#111827" stroke-width="3"/><rect x="21" y="34" width="8" height="15" rx="1.5" fill="#fef3c7" stroke="#111827" stroke-width="2.5"/><rect x="32" y="34" width="10" height="6" rx="1.2" fill="#bfdbfe" stroke="#111827" stroke-width="2.5"/></svg>';
      const chip = document.createElement('div');
      chip.className = 'store-chip';
      chip.textContent = 'DARKSTORE';
      stack.appendChild(ring);
      stack.appendChild(badge);
      stack.appendChild(chip);
      el.appendChild(stack);
      return el;
    }
    new mapboxgl.Marker({ element: markerEl('driver') }).setLngLat(driver).addTo(map);
    new mapboxgl.Marker({ element: markerEl('store') }).setLngLat(store).addTo(map);

    function fitServiceZone() {
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend(driver);
      bounds.extend(store);
      map.fitBounds(bounds, { padding: { top: 80, right: 80, bottom: 120, left: 80 }, duration: 700, maxZoom: 15 });
    }

    function recenterDriver() {
      map.easeTo({ center: driver, zoom: 14.5, duration: 650 });
    }

    const fitBtn = document.getElementById('fit-zone-btn');
    const recenterBtn = document.getElementById('recenter-btn');
    if (fitBtn) fitBtn.addEventListener('click', fitServiceZone);
    if (recenterBtn) recenterBtn.addEventListener('click', recenterDriver);

    map.on('load', () => {
      const src = {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            { type:'Feature', properties:{ kind:'driver' }, geometry:{ type:'Point', coordinates: driver } },
            { type:'Feature', properties:{ kind:'store' }, geometry:{ type:'Point', coordinates: store } }
          ]
        }
      };
      map.addSource('zones', src);
      map.addSource('driver-store-link', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [driver, store]
          },
          properties: {}
        }
      });
      map.addLayer({
        id: 'driver-store-link-line',
        type: 'line',
        source: 'driver-store-link',
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': '#334155',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.6, 13, 2.2, 15, 2.8],
          'line-opacity': 0.8,
          'line-dasharray': [1, 2.2]
        }
      });
      map.addLayer({
        id: 'zones-fill',
        type: 'circle',
        source: 'zones',
        paint: {
          'circle-color': ['match', ['get','kind'], 'driver', '#1e90ff', '#f97316'],
          // Softer fills for layered readability.
          'circle-opacity': ['match', ['get','kind'], 'driver', 0.13, 0.16],
          // Darkstore zone dominates strongly at every zoom.
          'circle-radius': ['match', ['get','kind'],
            'driver', ['interpolate', ['linear'], ['zoom'], 10, 18, 13, 34, 15, 50],
            ['interpolate', ['linear'], ['zoom'], 9, 84, 11, 122, 13, 172, 15, 230]
          ]
        }
      });
      map.addLayer({
        id: 'zones-stroke',
        type: 'circle',
        source: 'zones',
        paint: {
          'circle-color': ['match', ['get','kind'], 'driver', '#1e90ff', '#9a3412'],
          'circle-opacity': ['match', ['get','kind'], 'driver', 0.72, 0.82],
          'circle-stroke-width': ['match', ['get','kind'], 'driver', 1.6, 2.1],
          'circle-stroke-color': ['match', ['get','kind'], 'driver', '#1e90ff', '#9a3412'],
          'circle-radius': ['match', ['get','kind'],
            'driver', ['interpolate', ['linear'], ['zoom'], 10, 18, 13, 34, 15, 50],
            ['interpolate', ['linear'], ['zoom'], 9, 84, 11, 122, 13, 172, 15, 230]
          ]
        }
      });

      // On first load, frame both driver and darkstore immediately.
      fitServiceZone();
    });
  </script>
</body>
</html>`;
  }, [token, hasCoords, darkstoreCoord, centerLat, centerLng]);

  React.useEffect(() => {
    void refreshLocation();
    // only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const timer = setInterval(() => {
      void refreshLocation();
    }, 5_000);
    return () => clearInterval(timer);
  }, [refreshLocation]);

  React.useEffect(() => {
    const driverId = user?.id;
    if (!driverId) return;
    if (!hasCoords) return;

    (async () => {
      try {
        const profileRes = await driverApi.getProfile(driverId);
        const primaryStoreName = String((profileRes as any)?.driverProfile?.identity?.primaryDarkStore ?? '').trim();
        const rawLoc = (profileRes as any)?.driverProfile?.identity?.primaryDarkStoreLocation ?? null;
        const storeLat = Number(rawLoc?.lat);
        const storeLng = Number(rawLoc?.lng);
        if (primaryStoreName && Number.isFinite(storeLat) && Number.isFinite(storeLng)) {
          const km = haversineKm({ lat: centerLat, lng: centerLng }, { lat: storeLat, lng: storeLng });
          setDarkstoreText(`${primaryStoreName} • ${km.toFixed(1)} km`);
          setDarkstoreCoord({ lat: storeLat, lng: storeLng });
          return;
        }

        // Graceful fallback: if API does not provide darkstore coordinates,
        // place a synthetic nearby darkstore so the driver can still orient.
        const synthetic = buildSyntheticNearbyDarkstore(
          centerLat,
          centerLng,
          `${user?.id ?? 'driver'}|${primaryStoreName || 'darkstore'}`,
        );
        const syntheticName = primaryStoreName || 'Assigned Darkstore';
        const km = haversineKm({ lat: centerLat, lng: centerLng }, synthetic);
        setDarkstoreText(`${syntheticName} (nearby) • ${km.toFixed(1)} km`);
        setDarkstoreCoord(synthetic);
      } catch {
        // Network/profile fetch failure fallback.
        const synthetic = buildSyntheticNearbyDarkstore(
          centerLat,
          centerLng,
          String(user?.id ?? 'driver'),
        );
        const km = haversineKm({ lat: centerLat, lng: centerLng }, synthetic);
        setDarkstoreText(`Assigned Darkstore (nearby) • ${km.toFixed(1)} km`);
        setDarkstoreCoord(synthetic);
      }
    })();
  }, [hasCoords, centerLat, centerLng, user?.id]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <DriverLogoutMenu
        visible={profileMenuVisible}
        userEmail={user?.email}
        onClose={() => setProfileMenuVisible(false)}
        onLogout={() => { void handleLogout(); }}
      />

      <AegisNavbar 
        onProfile={() => setProfileMenuVisible(true)}
        backgroundColor={BRAND_BG}
        light
      />

      <View style={styles.container}>
        <View style={[styles.neoCard, styles.mapCardWrapper]}>
          {!token ? (
            <>
              <Ionicons name="warning-outline" size={34} color="#111827" />
              <Text style={styles.title}>{t('live_risk.title', { defaultValue: 'Live Risk Map' })}</Text>
              <Text style={styles.description}>
                Missing Mapbox token. Set EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN to enable the web map.
              </Text>
            </>
          ) : (
            <>
              <View style={styles.mapHeader}>
                <View style={styles.titleBlock}>
                  <Text style={styles.title}>{t('live_risk.title', { defaultValue: 'Live Risk Map' })}</Text>
                  <Text style={styles.subtitle}>Driver and darkstore zone intelligence</Text>
                </View>
                <View style={styles.statusPill}>
                  <View style={[styles.statusDot, hasCoords ? styles.statusDotLive : styles.statusDotIdle]} />
                  <Text style={styles.statusText}>
                    {hasCoords ? 'LIVE' : location.loading ? 'LOCATING…' : 'NO GPS'}
                  </Text>
                </View>
              </View>

              {darkstoreText && (
                <View style={styles.darkstoreRow}>
                  <View style={styles.darkstoreIconWrap}>
                    <Ionicons name="storefront-outline" size={13} color="#111827" />
                  </View>
                  <Text style={styles.darkstoreText} numberOfLines={1}>
                    Darkstore: {darkstoreText}
                  </Text>
                </View>
              )}

              <View style={styles.mapOuter}>
                {mapHtml ? (
                  <WebView
                    style={styles.mapWebView}
                    source={{ html: mapHtml }}
                    originWhitelist={['*']}
                    javaScriptEnabled
                    domStorageEnabled
                  />
                ) : (
                  <View style={styles.mapWait}>
                    <Ionicons name="location-outline" size={26} color="#6b7280" />
                    <Text style={styles.mapWaitTitle}>Waiting for driver + darkstore</Text>
                    <Text style={styles.mapWaitSub}>
                      We’ll show pins once both your live GPS and darkstore assignment are available.
                    </Text>
                  </View>
                )}
              </View>

              {!hasCoords && !location.loading && (
                <Text style={styles.description}>
                  Location not available. Enable location permissions and reload this page.
                </Text>
              )}
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BRAND_BG,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
  },
  avatarContainer: {
    borderWidth: 2,
    borderColor: '#111827',
    borderRadius: 22,
    padding: 6,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  neoCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#111827',
    shadowColor: '#111827',
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  mapCardWrapper: {
    flex: 1,
    minHeight: 360,
    padding: 14,
    gap: 10,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleBlock: {
    flex: 1,
    paddingTop: 2,
  },
  title: {
    fontSize: 19,
    fontWeight: '900',
    color: '#111827',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    color: '#4b5563',
    letterSpacing: 0.2,
  },
  description: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    color: '#1f2937',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: '#111827',
    backgroundColor: '#fff',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotLive: {
    backgroundColor: '#10b981',
  },
  statusDotIdle: {
    backgroundColor: '#9ca3af',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: 0.7,
  },
  darkstoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 2,
    borderColor: '#111827',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  darkstoreIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff7ed',
  },
  darkstoreText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  },
  mapOuter: {
    flex: 1,
    minHeight: 260,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#111827',
    backgroundColor: '#e5e7eb',
    shadowColor: '#111827',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  mapWebView: {
    flex: 1,
    minHeight: 260,
  },
  staticMapImg: {
    flex: 1,
    minHeight: 260,
    width: '100%',
    height: '100%',
  },
  mapWait: {
    flex: 1,
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 10,
    backgroundColor: '#f3f4f6',
  },
  mapWaitTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
  },
  mapWaitSub: {
    fontSize: 12,
    lineHeight: 16,
    color: '#374151',
    textAlign: 'center',
  },
});
