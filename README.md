# leet track

A multi-platform competitive-programming dashboard that tracks your **LeetCode**, **Codeforces**, and **CodeChef** profiles in one place — with a head-to-head **Compare** mode to race any rival.

![All platforms overview](docs/screenshots/all-platforms.png)

## Features

### 🌐 All platforms

- Unified summary strip: total solved, combined rating, global active streak (any platform counts), contests this month.
- One card per platform with its key stats; connect each platform with its **own handle** (usernames can differ per site).
- Rating progression chart overlaying all three platforms, solved-by-platform donut, and upcoming contests merged from all three sites with one-click Google Calendar reminders.

### 🟠 LeetCode tab

Platform-scoped tiles and cards (other platforms fade out), plus a **deep dive**: submission-activity heatmap with all-time streaks, difficulty analysis vs. the full question bank, language breakdown, contest-rating history, and practice recommendations.

![LeetCode tab](docs/screenshots/leetcode.png)

### 🔴 Codeforces · 🟣 CodeChef tabs

Every card scopes to the active platform — its tiles, a single-series rating chart, a highlighted donut segment, and only that platform's upcoming contests.

![Codeforces tab](docs/screenshots/codeforces.png)

![CodeChef tab](docs/screenshots/codechef.png)

### ⚔️ Compare

Enter any public LeetCode username and get a full head-to-head, then link the rival's Codeforces/CodeChef handles for a cross-platform battle:

- **Versus header** with live "metrics won" scoreline.
- **Platform switcher**: Combined / LeetCode / Codeforces / CodeChef.
- Head-to-head diverging bars (solved, ratings, streaks, acceptance, contests, percentile).
- **Topic-strengths radar** built from LeetCode tag stats (top 6 topics by combined solved, normalized per axis).
- Breakdown card per platform: LeetCode difficulty split, Codeforces solved-by-problem-rating buckets (&lt;1400 / 1400–1900 / &gt;1900), CodeChef contests-by-division.
- Dual rating timeline (last 12 months, all-time fallback) with a computed "gap closed" insight.
- Recently-compared rivals for one-click rematches.

![Compare tab](docs/screenshots/compare.png)

## Stack

| Layer    | Tech                                                                     |
| -------- | ------------------------------------------------------------------------ |
| Frontend | Vite · React 18 · TypeScript · MUI v6 (custom dark theme, oklch tokens)  |
| Backend  | Express 4 (TypeScript, `tsx watch`)                                      |
| Database | PostgreSQL (Supabase)                                                    |
| Data     | LeetCode public GraphQL · Codeforces REST API · CodeChef profile parsing |

## Getting started

### Prerequisites

- Node.js 20+
- A PostgreSQL database (a free [Supabase](https://supabase.com) project works)

### Setup

```bash
npm install
```

Create a `.env` in the project root:

```env
DATABASE_URL=postgresql://user:password@host:5432/postgres
PORT=3001
```

Create the tables and start both servers:

```bash
npm run db:migrate
npm run dev        # Express on :3001 + Vite on :5173 (proxied /api)
```

Open http://localhost:5173, connect your handles on the **All platforms** tab, and you're tracking.

## API

Routes are platform-first, so every URL reads as _platform → user → action_
(e.g. `POST /api/leetcode/alice/sync`):

| Method | Route                          | Purpose                                         |
| ------ | ------------------------------ | ----------------------------------------------- |
| GET    | `/api/leetcode/:handle`        | LeetCode stats payload                          |
| POST   | `/api/leetcode/:handle/sync`   | Sync a LeetCode profile, return fresh stats     |
| GET    | `/api/codeforces/:handle`      | Codeforces stats payload                        |
| POST   | `/api/codeforces/:handle/sync` | Sync a Codeforces profile                       |
| GET    | `/api/codechef/:handle`        | CodeChef stats payload                          |
| POST   | `/api/codechef/:handle/sync`   | Sync a CodeChef profile                         |
| GET    | `/api/recommendations`         | Shuffled practice picks                         |
| GET    | `/api/contests/upcoming`       | Upcoming contests, all platforms (10-min cache) |

## How the data works

- **LeetCode** — public GraphQL (no auth needed for public profiles). The default calendar only covers the rolling year, so sync fetches every active year for true all-time streaks.
- **Codeforces** — official REST API (`user.info`, `user.rating`, `user.status`). Problem-rating buckets are computed from each first-AC submission.
- **CodeChef** — no official API; the profile page is parsed directly. Markers are verified but inherently brittle — if CodeChef redesigns, `server/codechef.ts` regexes may need a refresh.
- Everything is stored per `(platform, username)`, so different handles per site are fully supported — for you _and_ for compare rivals.

## Project structure

```
server/          Express API, per-platform sync + read models, schema.sql
src/
  components/    Bento cards (heatmap, difficulty, contest chart, …)
  views/         AllPlatformsView · LeetCodeView (deep dive) · CompareView
  theme.ts       Design tokens + MUI theme
docs/screenshots End-to-end screenshots used in this README
```
