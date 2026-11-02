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

Run `npm run build` once before `npm run dev:api`; the Worker serves `dist/` too. The app needs the API running to log in. A fresh local database starts with `admin` / `123`.

## Deploy to Cloudflare (Workers static assets)

The Worker is set up in the Cloudflare dashboard (Workers & Pages → connected to this repo):

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: `/`

`wrangler.jsonc` sets up:

- `worker/index.ts` handles `/api/*`; everything else is the React app from `dist/` (unknown paths serve `index.html`).
- A D1 database bound as `DB` (name `direborn`). Wrangler creates it on the first deploy and reuses it after. The `events` table is created automatically on first use.

Every push to `main` redeploys automatically.

### Cron

`wrangler.jsonc` runs the Worker every 3 hours to refresh imported Liquipedia tournaments that are running or about to start (times, scores, standings, new playoff matches). Max 4 tournaments per run.

## Logins and roles

Everyone has their own account. The first time the database starts, it creates **`admin` / `123`**. Log in with it straight after the first deploy and pick a new password, then add everyone on the **People** page.

- New accounts start with password `123`. The app won't open until the person picks their own (6+ characters, not `123`, not their username).
- The manager can reset a password back to `123`, change roles, and turn accounts off (history is kept).
- 5 wrong passwords lock the account for 10 minutes.
- Passwords are stored as PBKDF2-SHA256 hashes. Sessions are HttpOnly cookies (30 days).

| Role | Home | Can |
|---|---|---|
| Manager (Admin) | Full dashboard + current tournament | Everything, plus the People page |
| Coach | Same as manager | Everything except People |
| Management | Easy summary | Add schedule (all types), edit/delete own entries, import tournaments |
| Owner | Easy summary | View only |
| Creative team | Easy summary + Content planner | Add activities only, edit/delete own activities |
| Player | Your schedule | View; own personal goals |

Scrim results: manager and coach only. Team targets: manager and coach edit, everyone sees. Personal goals: only the player, the manager and the coach see them; manager and coach can comment.

The rules live in `src/lib/permissions.ts` and are used by both the API (enforced) and the app (buttons).

## Tournament import (Liquipedia)

**Add schedule → Tournament → Find on Liquipedia.** Type a name (`EPL season 19`) or paste a Liquipedia link, pick the tournament, tick Direborn's matches, add. Times are converted to WIB.

- Only Direborn's matches are added (`worker/liquipedia.ts` lists the names Direborn appears under).
- Imported matches stay linked: the cron updates times and scores and adds new Direborn matches (e.g. playoffs). Deleting an imported match stops it from coming back.
- Group standings (worked out from finished matches using the page's points rule) and the playoff bracket are shown in the current tournament card and its popup.
- Uses Liquipedia's public MediaWiki API (`action=query`, not `action=parse`), a descriptive User-Agent, and at most one request every 2 s. Set `LP_CONTACT` (Worker variable) to a contact URL or email for the User-Agent. If Liquipedia rate-limits, the app shows a message; try again later.

## API

| Method | Path | Body / notes |
|---|---|---|
| GET | `/api/events` | Optional `?from=YYYY-MM-DD&to=YYYY-MM-DD` |
| POST | `/api/events` | `{ type, date, time, title, detail, opponent?, status?, notes? }`; `type` is `tournament`, `scrim`, `practice` or `other`; `time` is `HH:MM` or `TBD` |
| PATCH | `/api/events/:id` | Any of `{ status, scoreUs, scoreThem, matchIds, notes }`; `null` clears. Used for scrim results |
| DELETE | `/api/events/:id` | |

Every endpoint needs a login (session cookie). Also: `/api/auth/{login,logout,me,password}`, `/api/users` (manager), `/api/goals`, `/api/goals/:id/comments`, `/api/tournaments`, `/api/lp/{search,preview,import,refresh}`.

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
  pages/Scrims.tsx         Scrims page (/scrims): schedule, needs a result, results, record by opponent
  pages/Tournaments.tsx    Tournaments page (/tournaments): running event, past results, popup with highlights and scoreboards
  data/tournaments.ts      Tournament list, EPL S19 standings, upcoming, helpers
  data/official.ts         Official matches as series + schedule events (shown on every page)
  components/tournaments/  Tournament popup, match popup and scoreboard
  components/home/RecentMatches.tsx  Recent matches, newest first, 5 per page (swipe or arrows)
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
- Scrim report: re-run `python3 scripts/import_scrim_report.py <report.xlsx>` after updating the sheet
- Nightly sync: new official games from OpenDota, SEA qualifiers from Liquipedia API
- Roster page
- Team stats page
