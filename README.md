# Direborn Esport Division — All-in-one web app

Team app for Direborn's Dota 2 division: schedule, scrim results, tournament results and upcoming tournaments. It works on desktop and phone, and can be saved to the iPhone home screen from Safari so it opens like a native app.

**Stack:** React 19 + TypeScript + Vite for the app, a Cloudflare Worker for the API, and Cloudflare D1 (SQLite) for the shared schedule.

## Run locally

```bash
npm install
npm run dev      # app on http://localhost:5173 (calls /api on :8787)
npm run dev:api  # Worker + local D1 database on http://localhost:8787
npm run build    # production build into dist/
```

Run `npm run build` once before `npm run dev:api`; the Worker serves `dist/` too. Without the API running, the app falls back to sample data.

## Deploy to Cloudflare (Workers static assets)

The Worker is set up in the Cloudflare dashboard (Workers & Pages → connected to this repo):

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: `/`

`wrangler.jsonc` sets up:

- `worker/index.ts` handles `/api/*`; everything else is the React app from `dist/` (unknown paths serve `index.html`).
- A D1 database bound as `DB` (name `direborn`). Wrangler creates it on the first deploy and reuses it after. The `events` table is created automatically on first use.

Every push to `main` redeploys automatically.

### Team code (recommended)

By default anyone with the link can add or delete events. To require a code: Cloudflare dashboard → the Worker → **Settings → Variables and Secrets → Add** → type **Secret**, name `TEAM_KEY`, value of your choice. The app asks for the code the first time someone saves an event and remembers it on that device.

## API

| Method | Path | Body / notes |
|---|---|---|
| GET | `/api/events` | Optional `?from=YYYY-MM-DD&to=YYYY-MM-DD` |
| POST | `/api/events` | `{ type, date, time, title, detail, opponent?, status?, notes? }`; `type` is `tournament`, `scrim`, `practice` or `other`; `time` is `HH:MM` or `TBD` |
| DELETE | `/api/events/:id` | |

POST and DELETE need `X-Team-Key` when `TEAM_KEY` is set.

## Add to the iPhone home screen

Open the site in Safari → Share → **Add to Home Screen**. The app uses the Direborn logo as its icon and opens full screen without the Safari bar.

## Project layout

```
src/
  styles/tokens.css        Brand palette, fonts, radii (from the logo)
  styles/app.css           All layout and component styles
  data/types.ts            Data shapes (events, results, tournaments)
  data/api.ts              API client (events)
  data/events.tsx          Events context: loads from the API, add/remove, dialog state
  data/sample.ts           Placeholder data (fallback when the API is unreachable)
  components/events/       Add event dialog
  lib/format.ts            Date, time and countdown helpers (WIB)
  lib/schedule.ts          Next match / next tournament from events
  components/layout/       Header, sidebar, phone tab bar
  components/home/         Next match, month calendar, results, upcoming
  components/schedule/     Today card, day/week/month browser, side lists
  pages/Home.tsx           Home page (/)
  pages/Schedule.tsx       Schedule page (/schedule)
  pages/Tournaments.tsx    Tournaments page (/tournaments): running event, past results, popup with highlights and scoreboards
  data/tournaments.ts      Tournament list, EPL S19 standings, upcoming, helpers
  components/tournaments/  Tournament popup and match scoreboard
worker/
  index.ts                 API Worker (D1) + static assets
public/
  data/direborn-games.json Official games from OpenDota (team 10150434): scoreboards, items, drafts
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

- Edit existing events
- Results: record scrim and tournament scores
- Nightly sync: new official games from OpenDota, SEA qualifiers from Liquipedia API
- Scrims and Roster pages
- Team stats page
