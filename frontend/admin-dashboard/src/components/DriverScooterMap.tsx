/**
 * Elite Geospatial Telemetry Component: Visualizes high-frequency GPS data on a Mapbox canvas.
 * Implements H3 hexagonal binning for real-time risk stratification.
 * 
 * For a deep dive into the system design, refer to ARCHITECTURE/SYSTEM_ARCHITECTURE.md 
 * and ARCHITECTURE/OVERALL_PROJECT_SYSTEM_VIEW.md.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cellToBoundary, latLngToCell } from 'h3-js';
import type { Feature, FeatureCollection, Polygon } from 'geojson';
import { adminApi } from '../services/api';

const DRIVER_SVG_MARKER_PATH = '/assets/scooter-topdown.svg';

const initialCoordinate: [number, number] = [80.2707, 13.0827];
const initialZoom = 14.5;

type LiveGpsPosition = {
  driverId: string;
  lat: number;
  lng: number;
  timestamp: number;
};

type LiveGpsResponse = {
  zone: string;
  provider: string;
  published: number;
  driverIds: string[];
  base?: { lat: number; lng: number };
  positions?: LiveGpsPosition[];
};

type MarkerRecord = {
  marker: mapboxgl.Marker;
  visual: HTMLDivElement;
  kind: 'driver' | 'cluster';
  previousCoord?: [number, number];
};

type DriverMotionSnapshot = {
  lat: number;
  lng: number;
  timestamp: number;
};

type ZoneStatus = 'LOW' | 'MEDIUM' | 'HIGH' | 'HALT';

type HexProps = {
  cellId: string;
  drivers: number;
  haltDrivers: number;
  haltRatio: number;
  riskScore: number;
  riskStatus: ZoneStatus;
  zoneLabel: string;
  fillColor: string;
  fillOpacity: number;
  extrusionHeight: number;
};

type RenderItem = {
  id: string;
  coordinate: [number, number];
  kind: 'driver' | 'cluster';
  count?: number;
  driverId?: string;
};

let scooterSvgMarkupCache: string | null = null;
const H3_SOURCE_ID = 'h3-risk-zones-source';
const H3_SURFACE_LAYER_ID = 'h3-risk-zones-surface';
const H3_EXTRUSION_LAYER_ID = 'h3-risk-zones-extrusion';
const H3_OUTLINE_LAYER_ID = 'h3-risk-zones-outline';
const H3_CRITICAL_LAYER_ID = 'h3-risk-zones-critical';
const H3_LABEL_LAYER_ID = 'h3-risk-zones-label';
const BASE_POLL_INTERVAL_MS = 2200;
const MAX_POLL_INTERVAL_MS = 22000;

type HexZoneSummary = {
  halt: number;
  high: number;
  medium: number;
  low: number;
};

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceInMeters(from: [number, number], to: [number, number]) {
  const [lng1, lat1] = from;
  const [lng2, lat2] = to;
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const a =
    sinLat * sinLat +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function resolveH3Resolution(zoom: number) {
  if (zoom >= 15) return 9;
  if (zoom >= 13) return 8;
  if (zoom >= 10.5) return 7;
  return 6;
}

function resolveZoneStyle(riskStatus: ZoneStatus) {
  if (riskStatus === 'HALT') {
    return {
      fillColor: '#ef4444',
      fillOpacity: 0.56,
      extrusionHeight: 150,
    };
  }
  if (riskStatus === 'HIGH') {
    return {
      fillColor: '#f97316',
      fillOpacity: 0.46,
      extrusionHeight: 118,
    };
  }
  if (riskStatus === 'MEDIUM') {
    return {
      fillColor: '#facc15',
      fillOpacity: 0.35,
      extrusionHeight: 82,
    };
  }
  return {
    fillColor: '#22d3ee',
    fillOpacity: 0.2,
    extrusionHeight: 42,
  };
}

function ensureH3Layers(map: mapboxgl.Map) {
  if (!map.getSource(H3_SOURCE_ID)) {
    map.addSource(H3_SOURCE_ID, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });
  }

  if (!map.getLayer(H3_SURFACE_LAYER_ID)) {
    map.addLayer({
      id: H3_SURFACE_LAYER_ID,
      type: 'fill',
      source: H3_SOURCE_ID,
      paint: {
        'fill-color': ['coalesce', ['get', 'fillColor'], '#22d3ee'],
        'fill-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8,
          [
            'match',
            ['get', 'riskStatus'],
            'HALT',
            0.3,
            'HIGH',
            0.22,
            'MEDIUM',
            0.14,
            0.05,
          ],
          12,
          [
            'match',
            ['get', 'riskStatus'],
            'HALT',
            0.38,
            'HIGH',
            0.3,
            'MEDIUM',
            0.18,
            0.08,
          ],
        ],
      },
    });
  }

  if (!map.getLayer(H3_EXTRUSION_LAYER_ID)) {
    map.addLayer({
      id: H3_EXTRUSION_LAYER_ID,
      type: 'fill-extrusion',
      source: H3_SOURCE_ID,
      minzoom: 11.4,
      paint: {
        'fill-extrusion-color': ['coalesce', ['get', 'fillColor'], '#22d3ee'],
        'fill-extrusion-height': ['coalesce', ['get', 'extrusionHeight'], 36],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          11.4,
          0.14,
          13,
          ['coalesce', ['get', 'fillOpacity'], 0.24],
          16,
          ['+', ['coalesce', ['get', 'fillOpacity'], 0.24], 0.08],
        ],
      },
    });
  }

  if (!map.getLayer(H3_OUTLINE_LAYER_ID)) {
    map.addLayer({
      id: H3_OUTLINE_LAYER_ID,
      type: 'line',
      source: H3_SOURCE_ID,
      paint: {
        'line-color': [
          'case',
          ['==', ['get', 'riskStatus'], 'HALT'],
          '#fee2e2',
          ['==', ['get', 'riskStatus'], 'HIGH'],
          '#ffedd5',
          ['==', ['get', 'riskStatus'], 'MEDIUM'],
          '#fef9c3',
          '#cffafe',
        ],
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8,
          0.45,
          11,
          0.75,
          14,
          1.15,
          16,
          1.8,
        ],
        'line-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8,
          0.34,
          12,
          0.62,
          15,
          0.82,
        ],
      },
    });
  }

  if (!map.getLayer(H3_CRITICAL_LAYER_ID)) {
    map.addLayer({
      id: H3_CRITICAL_LAYER_ID,
      type: 'line',
      source: H3_SOURCE_ID,
      filter: ['in', ['get', 'riskStatus'], ['literal', ['HALT', 'HIGH']]],
      paint: {
        'line-color': [
          'case',
          ['==', ['get', 'riskStatus'], 'HALT'],
          '#fecaca',
          '#fdba74',
        ],
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          9,
          0.8,
          12,
          1.8,
          15,
          2.6,
        ],
        'line-blur': 0.25,
        'line-opacity': 0.92,
      },
    });
  }

  if (!map.getLayer(H3_LABEL_LAYER_ID)) {
    map.addLayer({
      id: H3_LABEL_LAYER_ID,
      type: 'symbol',
      source: H3_SOURCE_ID,
      minzoom: 12.2,
      filter: ['in', ['get', 'riskStatus'], ['literal', ['HALT', 'HIGH']]],
      layout: {
        'text-field': ['get', 'zoneLabel'],
        'text-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          12.2,
          10,
          15,
          12,
        ],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
      },
      paint: {
        'text-color': '#f8fafc',
        'text-halo-color': '#0b1220',
        'text-halo-width': 1.4,
        'text-halo-blur': 0.5,
      },
    });
  }
}

function syncRiskLayerVisibility(map: mapboxgl.Map) {
  const zoom = map.getZoom();

  if (map.getLayer(H3_SURFACE_LAYER_ID)) {
    const surfaceFilter =
      zoom < 10.8
        ? ['in', ['get', 'riskStatus'], ['literal', ['HALT', 'HIGH']]]
        : zoom < 12.2
          ? ['in', ['get', 'riskStatus'], ['literal', ['HALT', 'HIGH', 'MEDIUM']]]
          : true;
    map.setFilter(H3_SURFACE_LAYER_ID, surfaceFilter as any);
  }

  if (map.getLayer(H3_OUTLINE_LAYER_ID)) {
    const outlineFilter =
      zoom < 10.4
        ? ['in', ['get', 'riskStatus'], ['literal', ['HALT', 'HIGH']]]
        : true;
    map.setFilter(H3_OUTLINE_LAYER_ID, outlineFilter as any);
  }
}

function buildHexRiskFeatureCollection(
  positions: LiveGpsPosition[],
  stationaryDrivers: Set<string>,
  zoom: number,
): {
  collection: FeatureCollection<Polygon, HexProps>;
  summary: HexZoneSummary;
} {
  const resolution = resolveH3Resolution(zoom);
  const buckets = new Map<string, { count: number; haltCount: number }>();

  for (const position of positions) {
    const cellId = latLngToCell(position.lat, position.lng, resolution);
    const existing = buckets.get(cellId) ?? { count: 0, haltCount: 0 };
    existing.count += 1;
    if (stationaryDrivers.has(position.driverId)) {
      existing.haltCount += 1;
    }
    buckets.set(cellId, existing);
  }

  const summary = { halt: 0, high: 0, medium: 0, low: 0 };
  const features: Array<Feature<Polygon, HexProps>> = [];

  buckets.forEach((value, cellId) => {
    const haltRatio = value.haltCount / Math.max(value.count, 1);
    const densityScore = Math.min(1, value.count / 5);
    const riskScore = densityScore * 0.62 + haltRatio * 0.38;

    let riskStatus: ZoneStatus = 'LOW';
    if (value.count >= 2 && haltRatio >= 0.65) {
      riskStatus = 'HALT';
    } else if (riskScore >= 0.72 || value.count >= 4) {
      riskStatus = 'HIGH';
    } else if (riskScore >= 0.42 || value.count >= 2) {
      riskStatus = 'MEDIUM';
    }

    if (riskStatus === 'HALT') summary.halt += 1;
    else if (riskStatus === 'HIGH') summary.high += 1;
    else if (riskStatus === 'MEDIUM') summary.medium += 1;
    else summary.low += 1;

    const style = resolveZoneStyle(riskStatus);
    const ring = cellToBoundary(cellId).map((point) => [point[1], point[0]] as [number, number]);
    ring.push(ring[0]);

    features.push({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [ring],
      },
      properties: {
        cellId,
        drivers: value.count,
        haltDrivers: value.haltCount,
        haltRatio,
        riskScore,
        riskStatus,
        zoneLabel: `${riskStatus} • ${value.count}`,
        fillColor: style.fillColor,
        fillOpacity: style.fillOpacity,
        extrusionHeight: style.extrusionHeight,
      },
    });
  });

  return {
    collection: {
      type: 'FeatureCollection',
      features,
    },
    summary,
  };
}

function pickFocusHex(
  collection: FeatureCollection<Polygon, HexProps>,
  previousCellId: string | null,
): Feature<Polygon, HexProps> | null {
  const features = collection.features;
  if (!features.length) {
    return null;
  }

  if (previousCellId) {
    const existing = features.find((item) => item.properties.cellId === previousCellId);
    if (existing) {
      return existing;
    }
  }

  const rank: Record<ZoneStatus, number> = {
    HALT: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  let best = features[0];
  for (const feature of features) {
    const currentRank = rank[feature.properties.riskStatus];
    const bestRank = rank[best.properties.riskStatus];

    if (currentRank > bestRank) {
      best = feature;
      continue;
    }
    if (currentRank === bestRank && feature.properties.riskScore > best.properties.riskScore) {
      best = feature;
    }
  }

  return best;
}

function centroidFromFeature(feature: Feature<Polygon, HexProps>): [number, number] {
  const ring = feature.geometry.coordinates[0] ?? [];
  if (!ring.length) {
    return initialCoordinate;
  }

  const total = ring.reduce(
    (acc, point) => ({ lng: acc.lng + point[0], lat: acc.lat + point[1] }),
    { lng: 0, lat: 0 },
  );

  return [total.lng / ring.length, total.lat / ring.length];
}

function boundsFromCollection(collection: FeatureCollection<Polygon, HexProps>): mapboxgl.LngLatBounds | null {
  const bounds = new mapboxgl.LngLatBounds();
  let hasAnyPoint = false;

  for (const feature of collection.features) {
    const ring = feature.geometry.coordinates[0] ?? [];
    for (const point of ring) {
      hasAnyPoint = true;
      bounds.extend([point[0], point[1]]);
    }
  }

  return hasAnyPoint ? bounds : null;
}

function createFocusPulseElement() {
  const pulse = document.createElement('div');
  pulse.className = 'driver-hex-focus-pulse';

  const ring = document.createElement('span');
  ring.className = 'driver-hex-focus-ring';
  pulse.appendChild(ring);

  const core = document.createElement('span');
  core.className = 'driver-hex-focus-core';
  pulse.appendChild(core);

  return pulse;
}

function toBearing(from: [number, number], to: [number, number]) {
  const [lng1, lat1] = from;
  const [lng2, lat2] = to;
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const y = Math.sin(dLng) * Math.cos(lat2 * (Math.PI / 180));
  const x =
    Math.cos(lat1 * (Math.PI / 180)) * Math.sin(lat2 * (Math.PI / 180)) -
    Math.sin(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.cos(dLng);
  const angle = (Math.atan2(y, x) * 180) / Math.PI;
  return (angle + 360) % 360;
}

function createScooterMarkerElement() {
  const markerWrap = document.createElement('div');
  markerWrap.className = 'driver-dom-marker';

  const markerVisual = document.createElement('div');
  markerVisual.className = 'driver-dom-marker-visual';
  markerWrap.appendChild(markerVisual);

  return { markerWrap, markerVisual };
}

async function hydrateInlineSvg(target: HTMLDivElement, path: string) {
  let text = scooterSvgMarkupCache;
  if (!text) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) {
      return false;
    }
    text = await response.text();
    scooterSvgMarkupCache = text;
  }

  if (!text.includes('<svg')) {
    return false;
  }

  target.innerHTML = text;
  const svg = target.querySelector('svg');
  if (!svg) {
    return false;
  }

  svg.classList.add('driver-dom-marker-svg');
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  return true;
}

function createClusterMarkerElement(count: number) {
  const clusterWrap = document.createElement('div');
  clusterWrap.className = 'driver-cluster-marker';

  const clusterCount = document.createElement('span');
  clusterCount.className = 'driver-cluster-marker-count';
  clusterCount.textContent = String(count);
  clusterWrap.appendChild(clusterCount);

  return { clusterWrap, clusterCount };
}

function setFallbackBadge(root: HTMLDivElement, visual: HTMLDivElement) {
  root.classList.add('driver-dom-marker-fallback');
  visual.textContent = 'AMP';
}

function updateMarkerVisualScale(map: mapboxgl.Map, visual: HTMLDivElement) {
  const zoom = map.getZoom();
  const pitch = map.getPitch();

  const zoomScale = Math.min(1.12, Math.max(0.78, 0.86 + (zoom - initialZoom) * 0.065));
  const pitchScale = Math.min(1, Math.max(0.86, 1 - pitch * 0.0022));
  const markerScale = zoomScale * pitchScale;

  visual.style.transform = `scale(${markerScale.toFixed(3)})`;
}

type DriverScooterMapProps = {
  workerCount?: number;
  variant?: 'card' | 'full';
};

export default function DriverScooterMap({
  workerCount = 0,
  variant = 'card',
}: DriverScooterMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const retryAttemptsRef = useRef(0);
  const markerRegistryRef = useRef<Map<string, MarkerRecord>>(new Map());
  const motionRegistryRef = useRef<Map<string, DriverMotionSnapshot>>(new Map());
  const hasUserInteractedRef = useRef(false);
  const autoFollowCyclesRef = useRef(0);
  const selectedHexIdRef = useRef<string | null>(null);
  const focusPulseMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const [mapError, setMapError] = useState('');
  const [markerSourceLabel, setMarkerSourceLabel] = useState('marker: waiting for SVG');
  const [zoneStatusLabel, setZoneStatusLabel] = useState('zones: waiting for telemetry');
  const [reconnectLabel, setReconnectLabel] = useState('connection: live');
  const [isReconnecting, setIsReconnecting] = useState(false);

  const token = useMemo(() => import.meta.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN as string | undefined, []);

  useEffect(() => {
    if (!token) {
      setMapError('Set EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN in frontend/admin-dashboard/.env to load the live map.');
      return;
    }

    if (!mapContainerRef.current) {
      return;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      center: initialCoordinate,
      zoom: initialZoom,
      pitch: 50,
      bearing: 20,
      antialias: true,
    });

    const handleResize = () => map.resize();
    window.addEventListener('resize', handleResize);

    map.on('error', () => {
      setMapError('Map rendering error detected. Check Mapbox token scope and style permissions.');
    });

    map.on('load', async () => {
      try {
        const resolvedCount = Math.max(1, Math.min(60, Number.isFinite(workerCount) ? workerCount : 1));
        const zone = 'chennai';
        const provider = 'zepto';

        ensureH3Layers(map);
        syncRiskLayerVisibility(map);

        const syncMarkerScale = () => {
          markerRegistryRef.current.forEach((record) => {
            if (record.kind === 'driver') {
              updateMarkerVisualScale(map, record.visual);
            }
          });
        };

        const buildRenderItems = (positions: LiveGpsPosition[]): RenderItem[] => {
          const zoom = map.getZoom();
          const densityHigh = positions.length > 18;
          const shouldCluster = zoom < 11.8 && densityHigh;
          if (!shouldCluster) {
            return positions.map((position) => ({
              id: `drv:${position.driverId}`,
              coordinate: [position.lng, position.lat],
              kind: 'driver',
              driverId: position.driverId,
            }));
          }

          const gridSize = zoom < 10.8 ? 110 : 86;
          const buckets = new Map<string, LiveGpsPosition[]>();

          for (const position of positions) {
            const px = map.project([position.lng, position.lat]);
            const bucketId = `${Math.floor(px.x / gridSize)}:${Math.floor(px.y / gridSize)}`;
            const bucket = buckets.get(bucketId);
            if (bucket) {
              bucket.push(position);
            } else {
              buckets.set(bucketId, [position]);
            }
          }

          const renderItems: RenderItem[] = [];
          buckets.forEach((bucket, bucketId) => {
            if (bucket.length === 1) {
              const item = bucket[0];
              renderItems.push({
                id: `drv:${item.driverId}`,
                coordinate: [item.lng, item.lat],
                kind: 'driver',
                driverId: item.driverId,
              });
              return;
            }

            const centroid = bucket.reduce(
              (acc, cur) => ({ lat: acc.lat + cur.lat, lng: acc.lng + cur.lng }),
              { lat: 0, lng: 0 },
            );

            renderItems.push({
              id: `cluster:${bucketId}`,
              coordinate: [centroid.lng / bucket.length, centroid.lat / bucket.length],
              kind: 'cluster',
              count: bucket.length,
            });
          });

          return renderItems;
        };

        const upsertRenderItem = async (item: RenderItem) => {
          const existing = markerRegistryRef.current.get(item.id);

          if (!existing) {
            if (item.kind === 'cluster') {
              const { clusterWrap } = createClusterMarkerElement(item.count ?? 2);
              const marker = new mapboxgl.Marker({
                element: clusterWrap,
                anchor: 'center',
              })
                .setLngLat(item.coordinate)
                .addTo(map);

              markerRegistryRef.current.set(item.id, {
                marker,
                visual: clusterWrap,
                kind: 'cluster',
                previousCoord: item.coordinate,
              });
              return;
            }

            const { markerWrap, markerVisual } = createScooterMarkerElement();
            const svgReady = await hydrateInlineSvg(markerVisual, DRIVER_SVG_MARKER_PATH);
            if (!svgReady) {
              setFallbackBadge(markerWrap, markerVisual);
            }

            const marker = new mapboxgl.Marker({
              element: markerWrap,
              anchor: 'center',
              rotationAlignment: 'map',
              pitchAlignment: 'map',
            })
              .setLngLat(item.coordinate)
              .addTo(map);

            updateMarkerVisualScale(map, markerVisual);
            markerRegistryRef.current.set(item.id, {
              marker,
              visual: markerVisual,
              kind: 'driver',
              previousCoord: item.coordinate,
            });
            return;
          }

          if (existing.kind !== item.kind) {
            existing.marker.remove();
            markerRegistryRef.current.delete(item.id);
            await upsertRenderItem(item);
            return;
          }

          const from = existing.previousCoord ?? item.coordinate;
          existing.marker.setLngLat(item.coordinate);
          if (item.kind === 'driver') {
            existing.marker.setRotation(toBearing(from, item.coordinate));
          } else {
            const countElement = existing.visual.querySelector('.driver-cluster-marker-count');
            if (countElement && item.count) {
              countElement.textContent = String(item.count);
            }
          }
          existing.previousCoord = item.coordinate;
        };

        const syncTelemetry = async () => {
          const payload = (await adminApi.getLiveGps({
            zone,
            provider,
            count: resolvedCount,
          })) as LiveGpsResponse;

          const positions = payload.positions ?? [];
          const stationaryDrivers = new Set<string>();

          for (const item of positions) {
            const previous = motionRegistryRef.current.get(item.driverId);
            if (previous) {
              const dt = Math.max(1, item.timestamp - previous.timestamp);
              const moved = distanceInMeters([previous.lng, previous.lat], [item.lng, item.lat]);
              const stationaryThreshold = Math.max(8, dt * 1.4);
              if (moved < stationaryThreshold) {
                stationaryDrivers.add(item.driverId);
              }
            }
            motionRegistryRef.current.set(item.driverId, {
              lat: item.lat,
              lng: item.lng,
              timestamp: item.timestamp,
            });
          }

          const { collection, summary } = buildHexRiskFeatureCollection(
            positions,
            stationaryDrivers,
            map.getZoom(),
          );
          const source = map.getSource(H3_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
          source?.setData(collection);
          syncRiskLayerVisibility(map);

          const focusFeature = pickFocusHex(collection, selectedHexIdRef.current);
          if (focusFeature) {
            selectedHexIdRef.current = focusFeature.properties.cellId;
            const center = centroidFromFeature(focusFeature);

            if (!focusPulseMarkerRef.current) {
              focusPulseMarkerRef.current = new mapboxgl.Marker({
                element: createFocusPulseElement(),
                anchor: 'center',
              })
                .setLngLat(center)
                .addTo(map);
            } else {
              focusPulseMarkerRef.current.setLngLat(center);
            }
          } else if (focusPulseMarkerRef.current) {
            focusPulseMarkerRef.current.remove();
            focusPulseMarkerRef.current = null;
            selectedHexIdRef.current = null;
          }

          const renderItems = buildRenderItems(positions);
          const activeIds = new Set(renderItems.map((item) => item.id));

          for (const item of renderItems) {
            await upsertRenderItem(item);
          }

          markerRegistryRef.current.forEach((record, id) => {
            if (!activeIds.has(id)) {
              record.marker.remove();
              markerRegistryRef.current.delete(id);
            }
          });

          if (positions.length > 0) {
            if (!hasUserInteractedRef.current || autoFollowCyclesRef.current < 2) {
              const bounds = boundsFromCollection(collection);
              if (bounds) {
                map.fitBounds(bounds, {
                  padding: { top: 56, right: 56, bottom: 72, left: 56 },
                  duration: 700,
                  maxZoom: 14.8,
                  linear: false,
                });
              }
              autoFollowCyclesRef.current += 1;
            }
          }

          const clusterCount = renderItems.filter((item) => item.kind === 'cluster').length;
          const modeLabel = clusterCount > 0 ? `clustered (${clusterCount})` : 'individual';
          setMarkerSourceLabel(`workers live: ${positions.length}/${resolvedCount} | mode: ${modeLabel}`);
          setZoneStatusLabel(
            `H3 Zones • HALT ${summary.halt} • HIGH ${summary.high} • MED ${summary.medium} • LOW ${summary.low}`,
          );
          retryAttemptsRef.current = 0;
          setIsReconnecting(false);
          setReconnectLabel('connection: live');
          setMapError('');
        };

        map.on('zoom', syncMarkerScale);
        map.on('pitch', syncMarkerScale);
        map.on('zoomend', () => syncRiskLayerVisibility(map));
        map.on('dragstart', () => {
          hasUserInteractedRef.current = true;
        });
        map.on('rotatestart', () => {
          hasUserInteractedRef.current = true;
        });
        map.on('pitchstart', () => {
          hasUserInteractedRef.current = true;
        });
        map.on('click', H3_SURFACE_LAYER_ID, (event) => {
          const clicked = event.features?.[0] as unknown as Feature<Polygon, HexProps> | undefined;
          if (!clicked?.properties?.cellId) {
            return;
          }
          selectedHexIdRef.current = clicked.properties.cellId;
          const center = centroidFromFeature(clicked);
          if (!focusPulseMarkerRef.current) {
            focusPulseMarkerRef.current = new mapboxgl.Marker({
              element: createFocusPulseElement(),
              anchor: 'center',
            })
              .setLngLat(center)
              .addTo(map);
          } else {
            focusPulseMarkerRef.current.setLngLat(center);
          }
        });

        const schedulePoll = (delayMs = BASE_POLL_INTERVAL_MS) => {
          pollTimerRef.current = window.setTimeout(async () => {
            let nextDelayMs = BASE_POLL_INTERVAL_MS;
            try {
              await syncTelemetry();
            } catch {
              retryAttemptsRef.current += 1;
              nextDelayMs = Math.min(
                MAX_POLL_INTERVAL_MS,
                BASE_POLL_INTERVAL_MS * 2 ** Math.min(retryAttemptsRef.current, 4),
              );
              const nextDelaySeconds = Math.max(1, Math.ceil(nextDelayMs / 1000));
              setIsReconnecting(true);
              setReconnectLabel(
                `reconnecting: attempt ${retryAttemptsRef.current} • next retry ${nextDelaySeconds}s`,
              );
              setMapError('Live worker telemetry sync failed. Reconnecting automatically...');
            } finally {
              schedulePoll(nextDelayMs);
            }
          }, delayMs);
        };

        schedulePoll(0);

        map.once('remove', () => {
          map.off('zoom', syncMarkerScale);
          map.off('pitch', syncMarkerScale);
          markerRegistryRef.current.forEach((record) => record.marker.remove());
          markerRegistryRef.current.clear();
          motionRegistryRef.current.clear();
          if (focusPulseMarkerRef.current) {
            focusPulseMarkerRef.current.remove();
            focusPulseMarkerRef.current = null;
          }
          selectedHexIdRef.current = null;
          hasUserInteractedRef.current = false;
          autoFollowCyclesRef.current = 0;
          retryAttemptsRef.current = 0;
        });
      } catch {
        setMapError('Live marker setup failed. Ensure map token, backend telemetry, and scooter SVG asset are available.');
      }
    });

    return () => {
      if (pollTimerRef.current !== null) {
        clearTimeout(pollTimerRef.current);
      }
      markerRegistryRef.current.forEach((record) => record.marker.remove());
      markerRegistryRef.current.clear();
      motionRegistryRef.current.clear();
      if (focusPulseMarkerRef.current) {
        focusPulseMarkerRef.current.remove();
        focusPulseMarkerRef.current = null;
      }
      selectedHexIdRef.current = null;
      hasUserInteractedRef.current = false;
      autoFollowCyclesRef.current = 0;
      retryAttemptsRef.current = 0;
      window.removeEventListener('resize', handleResize);
      map.remove();
    };
  }, [token, workerCount]);

  return (
    <div className={`driver-map-card ${variant === 'full' ? 'driver-map-card-full' : ''}`}>
      <div className="driver-map-header">
        <div>
          <p className="driver-map-eyebrow">Live Courier Tracking</p>
          <h3 className="driver-map-title">
            {variant === 'full' ? 'H3 Live Risk Command Surface' : 'Road-Aligned Driver Symbol'}
          </h3>
        </div>
        <span className="driver-map-status">Realtime</span>
      </div>

      {mapError ? <div className="driver-map-error">{mapError}</div> : null}

      {!token ? (
        <div className="driver-map-empty">
          <p className="driver-map-empty-title">Map token missing</p>
          <p className="driver-map-empty-copy">
            Add EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN in frontend/admin-dashboard/.env to enable live AMP marker tracking.
          </p>
        </div>
      ) : (
        <div className="driver-map-stage">
          <div ref={mapContainerRef} className="driver-map-canvas" />
          <div className="driver-map-overlay-top">
            <span className="driver-map-pill">H3 Fleet Grid</span>
            <span className="driver-map-pill muted">Cognitive Focus Mode</span>
            <span className="driver-map-pill muted">Critical Zones Prioritized</span>
            {isReconnecting ? <span className="driver-map-pill reconnecting">{reconnectLabel}</span> : null}
          </div>
          <div className="driver-map-overlay-bottom">
            <span className="driver-map-pill danger">HALT</span>
            <span className="driver-map-pill warning">HIGH</span>
            <span className="driver-map-pill caution">MED</span>
            <span className="driver-map-pill neutral">LOW</span>
          </div>
        </div>
      )}

      <div className="driver-map-footer">
        <span className="driver-map-pill">{markerSourceLabel}</span>
        <span className="driver-map-pill">{zoneStatusLabel}</span>
        <span className={`driver-map-pill ${isReconnecting ? 'reconnecting' : 'muted'}`}>{reconnectLabel}</span>
        <span className="driver-map-pill muted">marker-engine: DOM + SVG</span>
        <span className="driver-map-pill muted">telemetry: /api/platform/live-gps</span>
      </div>
    </div>
  );
}
