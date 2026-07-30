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

export interface UpcomingContest {
  platform: 'leetcode' | 'codeforces' | 'codechef'
  name: string
  url: string
  startsAt: string
  durationMins: number | null
}

export interface Handles {
  lc: string | null
  cf: string | null
  cc: string | null
}

export type Tab = 'All platforms' | 'LeetCode' | 'Codeforces' | 'CodeChef' | 'Compare'

export interface Recommendation {
  title: string
  topics: string
  diff: 'Easy' | 'Medium' | 'Hard'
  reason: string
  slug: string
}
