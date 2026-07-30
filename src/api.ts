import type { Stats, Recommendation, PlatformStats, UpcomingContest } from './types'

async function handle<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`)
  return body as T
}

// Routes are platform-first: /api/<platform>/<handle>[/sync]
const PLATFORM_PATH = { cf: 'codeforces', cc: 'codechef' } as const

export const getStats = (username: string) =>
  fetch(`/api/leetcode/${encodeURIComponent(username)}`).then((r) => handle<Stats>(r))

export const syncProfile = (username: string) =>
  fetch(`/api/leetcode/${encodeURIComponent(username)}/sync`, { method: 'POST' }).then((r) => handle<Stats>(r))

export const getPlatform = (platform: 'cf' | 'cc', h: string) =>
  fetch(`/api/${PLATFORM_PATH[platform]}/${encodeURIComponent(h)}`).then((r) => handle<PlatformStats>(r))

export const syncPlatform = (platform: 'cf' | 'cc', h: string) =>
  fetch(`/api/${PLATFORM_PATH[platform]}/${encodeURIComponent(h)}/sync`, { method: 'POST' }).then((r) =>
    handle<PlatformStats>(r),
  )

export const getRecommendations = () =>
  fetch('/api/recommendations').then((r) => handle<Recommendation[]>(r))

export const getUpcoming = () => fetch('/api/contests/upcoming').then((r) => handle<UpcomingContest[]>(r))
