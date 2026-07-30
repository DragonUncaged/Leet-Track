import { pool } from './db.ts'

export interface CalendarDay {
  date: string
  count: number
}

export interface Stats {
  user: {
    username: string
    realName: string | null
    avatar: string | null
    country: string | null
    ranking: number | null
    reputation: number | null
    badge: string | null
    badgesCount: number
    syncedAt: string
  }
  totals: {
    solved: number
    totalQuestions: number
    easy: { solved: number; total: number }
    medium: { solved: number; total: number }
    hard: { solved: number; total: number }
    acceptance: number | null
    submissionsPastYear: number
  }
  streak: { current: number; longest: number; activeDays: number }
  weekly: { thisWeek: number; lastWeek: number }
  calendar: CalendarDay[]
  contest: {
    rating: number
    peak: number
    delta: number | null
    attended: number
    topPercentage: number | null
    lastContest: { title: string; rank: number | null } | null
    history: { title: string; rating: number; rank: number | null; date: string | null }[]
  } | null
  languages: { name: string; solved: number }[]
  tags: { name: string; slug: string | null; solved: number }[]
}

export const iso = (d: Date) => d.toISOString().slice(0, 10)

export function computeStreaks(days: CalendarDay[]) {
  const active = [...new Set(days.filter((d) => d.count > 0).map((d) => d.date))].sort()
  const DAY = 86_400_000
  let longest = 0
  let run = 0
  let prev = 0
  for (const d of active) {
    const t = new Date(`${d}T00:00:00Z`).getTime()
    run = t - prev === DAY ? run + 1 : 1
    longest = Math.max(longest, run)
    prev = t
  }
  // Current streak counts back from today; a quiet today doesn't break it.
  const activeSet = new Set(active)
  let current = 0
  const back = new Date()
  if (!activeSet.has(iso(back))) back.setDate(back.getDate() - 1)
  while (activeSet.has(iso(back))) {
    current++
    back.setDate(back.getDate() - 1)
  }
  return { current, longest, activeDays: active.length }
}

export async function getStats(username: string): Promise<Stats | null> {
  const userRes = await pool.query(
    "select * from users where platform = 'leetcode' and lower(username) = lower($1)",
    [username],
  )
  if (!userRes.rows.length) return null
  const u = userRes.rows[0]

  const [snapRes, calRes, contestRes, langRes, tagRes] = await Promise.all([
    pool.query(
      'select * from snapshots where user_id = $1 order by taken_on desc limit 1',
      [u.id],
    ),
    pool.query(
      `select to_char(day, 'YYYY-MM-DD') as date, count from calendar
       where user_id = $1 order by day`,
      [u.id],
    ),
    pool.query(
      `select title, rating, rank, to_char(started_at, 'YYYY-MM-DD') as date
       from contests where user_id = $1 order by started_at`,
      [u.id],
    ),
    pool.query(
      'select language, problems_solved from lang_stats where user_id = $1 order by problems_solved desc',
      [u.id],
    ),
    pool.query(
      'select tag_name, tag_slug, problems_solved from tag_stats where user_id = $1 order by problems_solved desc',
      [u.id],
    ),
  ])

  const s = snapRes.rows[0] ?? {}
  const fullCalendar: CalendarDay[] = calRes.rows
  const streak = computeStreaks(fullCalendar)
  const yearAgo = iso(new Date(Date.now() - 366 * 86_400_000))
  const calendar = fullCalendar.filter((d) => d.date > yearAgo)

  const now = new Date()
  const daysAgo = (n: number) => {
    const d = new Date(now)
    d.setDate(d.getDate() - n)
    return iso(d)
  }
  const weekStart = daysAgo(6)
  const prevStart = daysAgo(13)
  let thisWeek = 0
  let lastWeek = 0
  for (const d of calendar) {
    if (d.date >= weekStart) thisWeek += d.count
    else if (d.date >= prevStart) lastWeek += d.count
  }

  const history = contestRes.rows as { title: string; rating: number; rank: number | null; date: string | null }[]
  let contest: Stats['contest'] = null
  if (u.contest_rating != null && history.length) {
    const last = history[history.length - 1]
    const prev = history.length > 1 ? history[history.length - 2] : null
    contest = {
      rating: Math.round(u.contest_rating),
      peak: Math.round(Math.max(...history.map((h) => h.rating))),
      delta: prev ? Math.round(last.rating - prev.rating) : null,
      attended: u.contest_attended ?? history.length,
      topPercentage: u.contest_top_pct,
      lastContest: { title: last.title, rank: last.rank },
      history: history.map((h) => ({ ...h, rating: Math.round(h.rating) })),
    }
  }

  return {
    user: {
      username: u.username,
      realName: u.real_name,
      avatar: u.avatar_url,
      country: u.country,
      ranking: u.ranking != null ? Number(u.ranking) : null,
      reputation: u.reputation,
      badge: u.contest_badge,
      badgesCount: u.badges_count,
      syncedAt: u.synced_at,
    },
    totals: {
      solved: s.total_solved ?? 0,
      totalQuestions: s.total_questions ?? 0,
      easy: { solved: s.easy_solved ?? 0, total: s.easy_total ?? 0 },
      medium: { solved: s.medium_solved ?? 0, total: s.medium_total ?? 0 },
      hard: { solved: s.hard_solved ?? 0, total: s.hard_total ?? 0 },
      acceptance:
        s.total_submissions > 0
          ? Math.round((s.ac_submissions / s.total_submissions) * 1000) / 10
          : null,
      submissionsPastYear: calendar.reduce((sum, d) => sum + d.count, 0),
    },
    streak,
    weekly: { thisWeek, lastWeek },
    calendar,
    contest,
    languages: langRes.rows.map((r) => ({ name: r.language, solved: r.problems_solved })),
    tags: tagRes.rows.map((r) => ({ name: r.tag_name, slug: r.tag_slug, solved: r.problems_solved })),
  }
}
