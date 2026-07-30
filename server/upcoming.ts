export interface UpcomingContest {
  platform: 'leetcode' | 'codeforces' | 'codechef'
  name: string
  url: string
  startsAt: string
  durationMins: number | null
}

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

async function leetcodeUpcoming(): Promise<UpcomingContest[]> {
  const res = await fetch('https://leetcode.com/graphql/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com', 'User-Agent': UA },
    body: JSON.stringify({
      query: '{ upcomingContests { title titleSlug startTime duration } }',
    }),
  })
  const json = (await res.json()) as {
    data?: { upcomingContests: { title: string; titleSlug: string; startTime: number; duration: number }[] }
  }
  return (json.data?.upcomingContests ?? []).map((c) => ({
    platform: 'leetcode' as const,
    name: c.title,
    url: `https://leetcode.com/contest/${c.titleSlug}/`,
    startsAt: new Date(c.startTime * 1000).toISOString(),
    durationMins: Math.round(c.duration / 60),
  }))
}

async function codeforcesUpcoming(): Promise<UpcomingContest[]> {
  const res = await fetch('https://codeforces.com/api/contest.list?gym=false', {
    headers: { 'User-Agent': UA },
  })
  const json = (await res.json()) as {
    status: string
    result?: { id: number; name: string; phase: string; startTimeSeconds?: number; durationSeconds: number }[]
  }
  return (json.result ?? [])
    .filter((c) => c.phase === 'BEFORE' && c.startTimeSeconds)
    .map((c) => ({
      platform: 'codeforces' as const,
      name: c.name,
      url: `https://codeforces.com/contests/${c.id}`,
      startsAt: new Date(c.startTimeSeconds! * 1000).toISOString(),
      durationMins: Math.round(c.durationSeconds / 60),
    }))
}

async function codechefUpcoming(): Promise<UpcomingContest[]> {
  const res = await fetch(
    'https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc&offset=0&mode=all',
    { headers: { 'User-Agent': UA } },
  )
  const json = (await res.json()) as {
    future_contests?: {
      contest_code: string
      contest_name: string
      contest_start_date_iso: string
      contest_duration: string
    }[]
  }
  return (json.future_contests ?? []).map((c) => ({
    platform: 'codechef' as const,
    name: c.contest_name,
    url: `https://www.codechef.com/${c.contest_code}`,
    startsAt: new Date(c.contest_start_date_iso).toISOString(),
    durationMins: Number(c.contest_duration) || null,
  }))
}

let cache: { at: number; data: UpcomingContest[] } | null = null
const TTL = 10 * 60 * 1000

export async function getUpcoming(): Promise<UpcomingContest[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.data
  const results = await Promise.allSettled([leetcodeUpcoming(), codeforcesUpcoming(), codechefUpcoming()])
  const merged = results
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .filter((c) => new Date(c.startsAt).getTime() > Date.now())
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 12)
  cache = { at: Date.now(), data: merged }
  return merged
}
