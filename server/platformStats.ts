import { pool } from './db.ts'
import { computeStreaks, iso, type CalendarDay } from './stats.ts'

export interface PlatformStats {
  platform: 'codeforces' | 'codechef'
  user: {
    handle: string
    realName: string | null
    avatar: string | null
    country: string | null
    rankTitle: string | null
    stars: number | null
    syncedAt: string
  }
  rating: number | null
  maxRating: number | null
  globalRank: number | null
  countryRank: number | null
  solved: number
  acceptance: number | null
  streak: { current: number; longest: number; activeDays: number }
  calendar: CalendarDay[]
  languages: { name: string; solved: number }[]
  // codeforces: solved by problem rating; codechef: contests attended by division
  breakdown: { label: string; count: number }[]
  contest: {
    rating: number
    peak: number
    delta: number | null
    attended: number
    lastContest: { title: string; rank: number | null } | null
    history: { title: string; rating: number; rank: number | null; date: string | null }[]
  } | null
}

export async function getPlatformStats(
  platform: 'codeforces' | 'codechef',
  handle: string,
): Promise<PlatformStats | null> {
  const userRes = await pool.query(
    'select * from users where platform = $1 and lower(username) = lower($2)',
    [platform, handle],
  )
  if (!userRes.rows.length) return null
  const u = userRes.rows[0]

  const [calRes, contestRes, langRes, snapRes] = await Promise.all([
    pool.query(
      `select to_char(day, 'YYYY-MM-DD') as date, count from calendar where user_id = $1 order by day`,
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
    pool.query('select * from snapshots where user_id = $1 order by taken_on desc limit 1', [u.id]),
  ])

  const fullCalendar: CalendarDay[] = calRes.rows
  const streak = computeStreaks(fullCalendar)
  const yearAgo = iso(new Date(Date.now() - 366 * 86_400_000))
  const calendar = fullCalendar.filter((d) => d.date > yearAgo)

  const history = contestRes.rows as { title: string; rating: number; rank: number | null; date: string | null }[]
  let contest: PlatformStats['contest'] = null
  if (history.length) {
    const last = history[history.length - 1]
    const prev = history.length > 1 ? history[history.length - 2] : null
    contest = {
      rating: Math.round(u.contest_rating ?? last.rating),
      peak: Math.round(Math.max(...history.map((h) => h.rating))),
      delta: prev ? Math.round(last.rating - prev.rating) : null,
      attended: u.contest_attended ?? history.length,
      lastContest: { title: last.title, rank: last.rank },
      history: history.map((h) => ({ ...h, rating: Math.round(h.rating) })),
    }
  }

  const s = snapRes.rows[0]

  let breakdown: PlatformStats['breakdown']
  if (platform === 'codeforces') {
    breakdown = [
      { label: '< 1400', count: s?.easy_solved ?? 0 },
      { label: '1400–1900', count: s?.medium_solved ?? 0 },
      { label: '> 1900', count: s?.hard_solved ?? 0 },
    ]
  } else {
    const byDiv = new Map<string, number>()
    for (const h of history) {
      const m = h.title.match(/div(?:ision)?[.\s]*([1-4])/i)
      if (m) byDiv.set(m[1], (byDiv.get(m[1]) ?? 0) + 1)
    }
    breakdown = ['4', '3', '2', '1'].map((d) => ({ label: `Div ${d}`, count: byDiv.get(d) ?? 0 }))
  }

  return {
    platform,
    user: {
      handle: u.username,
      realName: u.real_name,
      avatar: u.avatar_url,
      country: u.country,
      rankTitle: u.rank_title,
      stars: u.stars,
      syncedAt: u.synced_at,
    },
    rating: u.contest_rating != null ? Math.round(u.contest_rating) : null,
    maxRating: u.max_rating != null ? Math.round(u.max_rating) : null,
    globalRank: u.contest_global_rank != null ? Number(u.contest_global_rank) : null,
    countryRank: u.country_rank != null ? Number(u.country_rank) : null,
    solved: u.solved_count ?? 0,
    acceptance:
      s && s.total_submissions > 0
        ? Math.round((s.ac_submissions / s.total_submissions) * 1000) / 10
        : null,
    streak,
    calendar,
    languages: langRes.rows.map((r) => ({ name: r.language, solved: r.problems_solved })),
    breakdown,
    contest,
  }
}
