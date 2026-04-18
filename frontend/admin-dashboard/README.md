# RideSafe Admin Dashboard

Operational admin UI for fraud, KYC, and live fleet tracking workflows.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create an environment file from the example:

```bash
cp .env.example .env
```

3. Set your Mapbox public token in `.env`:

```bash
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_public_token_here
```

4. Start dev server:

```bash
npm run dev
```

## Custom AMP Marker Map

- Component: `src/components/DriverScooterMap.tsx`
- Marker asset location: `public/image_1.png`
- Fallback behavior: If `image_1.png` is missing, the map now draws a generated AMP marker so live motion still works.
- Rotation logic: Marker heading is computed per segment and applied through `icon-rotate` via geojson feature properties.

If the map panel shows a token warning, verify that `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` is present and valid for the selected Mapbox style.

## Build

```bash
npm run build
```
