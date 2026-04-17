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
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_public_token_here
# Optional but recommended for production clarity
VITE_MAPBOX_STYLE_URL=mapbox://styles/mapbox/dark-v11
# Backend base URL (optional in local dev due Vite proxy)
VITE_API_URL=http://127.0.0.1:3001/api
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

## Vercel Notes

- `VITE_*` variables are injected at build time. Changing them in Vercel requires a new deployment.
- Local `server.proxy` for `/api` only works in `npm run dev`. In production, set `VITE_API_URL` to your backend base URL.
- If `VITE_API_URL` is not set on Vercel, the app calls `/api` on the Vercel domain, which usually fails unless you configured rewrites/serverless endpoints.
- Avoid Mapbox `navigation-*` styles in production unless your token has incidents tiles access.

## Build

```bash
npm run build
```
