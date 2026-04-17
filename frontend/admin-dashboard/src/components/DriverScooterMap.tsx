import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const DRIVER_SVG_MARKER_PATH = '/assets/scooter-topdown.svg';

const initialCoordinate: [number, number] = [80.2707, 13.0827];
const initialZoom = 14.5;

const route: Array<[number, number]> = [
  [80.2707, 13.0827],
  [80.2718, 13.0831],
  [80.2731, 13.0836],
  [80.2745, 13.0842],
  [80.2758, 13.0849],
  [80.2769, 13.0855],
  [80.2782, 13.0861],
  [80.2793, 13.0867],
  [80.2801, 13.0871],
  [80.2812, 13.0876],
  [80.2824, 13.0882],
  [80.2835, 13.0888],
  [80.2844, 13.0892],
  [80.2855, 13.0897],
  [80.2864, 13.0902],
  [80.2873, 13.0906],
  [80.2861, 13.0901],
  [80.2849, 13.0896],
  [80.2837, 13.0891],
  [80.2825, 13.0886],
  [80.2813, 13.0880],
  [80.2802, 13.0875],
  [80.2790, 13.0869],
  [80.2779, 13.0864],
  [80.2768, 13.0858],
  [80.2757, 13.0852],
  [80.2745, 13.0846],
  [80.2733, 13.0840],
  [80.2720, 13.0834],
  [80.2707, 13.0827],
];

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
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) {
    return false;
  }

  const text = await response.text();
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

export default function DriverScooterMap() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const movementTimerRef = useRef<number | null>(null);
  const routeIndexRef = useRef(0);

  const [mapError, setMapError] = useState('');
  const [markerSourceLabel, setMarkerSourceLabel] = useState('marker: waiting for SVG');

  const token = useMemo(() => import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined, []);

  useEffect(() => {
    if (!token) {
      setMapError('Set VITE_MAPBOX_ACCESS_TOKEN in frontend/admin-dashboard/.env to load the live map.');
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
          .setLngLat(route[0])
          .setRotation(toBearing(route[0], route[1]))
          .addTo(map);

        const syncMarkerScale = () => updateMarkerVisualScale(map, markerVisual);
        syncMarkerScale();
        map.on('zoom', syncMarkerScale);
        map.on('pitch', syncMarkerScale);

        setMarkerSourceLabel(
          svgReady ? `marker: inline ${DRIVER_SVG_MARKER_PATH}` : 'marker: fallback AMP badge'
        );

        const tick = () => {
          routeIndexRef.current = (routeIndexRef.current + 1) % route.length;
          const current = route[routeIndexRef.current];
          const next = route[(routeIndexRef.current + 1) % route.length];
          const bearing = toBearing(current, next);

          marker.setLngLat(current);
          marker.setRotation(bearing);
          map.easeTo({ center: current, zoom: initialZoom, duration: 1100, easing: (t) => t });

          movementTimerRef.current = window.setTimeout(tick, 1300);
        };

        movementTimerRef.current = window.setTimeout(tick, 1300);
        setMapError('');

        map.once('remove', () => {
          map.off('zoom', syncMarkerScale);
          map.off('pitch', syncMarkerScale);
          marker.remove();
        });
      } catch {
        setMapError('Marker setup failed. Ensure /public/assets/scooter-topdown.svg exists and is readable.');
      }
    });

    return () => {
      if (movementTimerRef.current !== null) {
        clearTimeout(movementTimerRef.current);
      }
      window.removeEventListener('resize', handleResize);
      map.remove();
    };
  }, [token]);

  return (
    <div className="driver-map-card">
      <div className="driver-map-header">
        <div>
          <p className="driver-map-eyebrow">Live Courier Tracking</p>
          <h3 className="driver-map-title">Road-Aligned Driver Symbol</h3>
        </div>
        <span className="driver-map-status">Realtime</span>
      </div>

      {mapError ? <div className="driver-map-error">{mapError}</div> : null}

      {!token ? (
        <div className="driver-map-empty">
          <p className="driver-map-empty-title">Map token missing</p>
          <p className="driver-map-empty-copy">
            Add VITE_MAPBOX_ACCESS_TOKEN in frontend/admin-dashboard/.env to enable live AMP marker tracking.
          </p>
        </div>
      ) : (
        <div ref={mapContainerRef} className="driver-map-canvas" />
      )}

      <div className="driver-map-footer">
        <span>{markerSourceLabel}</span>
        <span>marker-engine: DOM + SVG</span>
        <span>rotation: marker.setRotation(bearing)</span>
      </div>
    </div>
  );
}
