# Direborn Esport Division — All-in-one web app

Team app for Direborn's Dota 2 division: schedule, scrim results, tournament results and upcoming tournaments. It works on desktop and phone, and can be saved to the iPhone home screen from Safari so it opens like a native app.

**Stack:** React 19 + TypeScript + Vite, deployed as a static site on Cloudflare Pages.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into dist/
npm run preview  # serve the production build
```

## Deploy to Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → choose this repo.
2. Build settings:
   - Framework preset: **Vite** (or None)
   - Build command: `npm run build`
   - Build output directory: `dist`
3. Save and deploy. Every push to `main` redeploys automatically.

`public/_redirects` sends every path to `index.html` so future pages work on refresh.

## Add to the iPhone home screen

Open the site in Safari → Share → **Add to Home Screen**. The app uses the Direborn logo as its icon and opens full screen without the Safari bar.

## Project layout

```
src/
  styles/tokens.css        Brand palette, fonts, radii (from the logo)
  styles/app.css           All layout and component styles
  data/types.ts            Data shapes (events, results, tournaments)
  data/sample.ts           Placeholder data, replace when storage is added
  lib/format.ts            Date, time and countdown helpers (WIB)
  components/layout/       Header, sidebar, phone tab bar
  components/home/         Next match, month calendar, results, upcoming
  pages/Home.tsx           Home page
public/
  logo.png, favicon.png, icons/, manifest.webmanifest
```

## Palette

| Role | Hex |
|---|---|
| Dire red (primary) | `#D81F28` |
| Blood maroon | `#90262C` |
| Aegis gold | `#C29F42` |
| Gold text on white | `#8A6418` |
| Page background | `#F4F1EC` |
| Text | `#1A1416` |
| Muted text | `#6E635E` |

## Next steps

- Schedule page (add/edit events)
- Store real data (Cloudflare D1) so the whole team shares one calendar
- Scrims, Tournaments and Roster pages
