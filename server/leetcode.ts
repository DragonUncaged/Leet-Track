const ENDPOINT = 'https://leetcode.com/graphql/'

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Referer: 'https://leetcode.com',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
    },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`LeetCode responded ${res.status}`)
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] }
  if (json.errors?.length) throw new Error(json.errors[0].message)
  if (!json.data) throw new Error('Empty response from LeetCode')
  return json.data
}

export interface DifficultyCount {
  difficulty: 'All' | 'Easy' | 'Medium' | 'Hard'
  count: number
  submissions?: number
}

interface ProfileData {
  allQuestionsCount: DifficultyCount[]
  matchedUser: {
    username: string
    profile: {
      realName: string | null
      userAvatar: string | null
      countryName: string | null
      ranking: number | null
      reputation: number | null
    }
    submitStats: {
      acSubmissionNum: DifficultyCount[]
      totalSubmissionNum: DifficultyCount[]
    }
    problemsSolvedBeatsStats: { difficulty: string; percentage: number | null }[]
    userCalendar: {
      activeYears: number[]
      streak: number
      totalActiveDays: number
      submissionCalendar: string
    }
    tagProblemCounts: {
      advanced: TagCount[]
      intermediate: TagCount[]
      fundamental: TagCount[]
    }
    languageProblemCount: { languageName: string; problemsSolved: number }[]
    badges: { id: string }[]
  } | null
}

export interface TagCount {
  tagName: string
  tagSlug: string
  problemsSolved: number
}

interface ContestData {
  userContestRanking: {
    attendedContestsCount: number
    rating: number
    globalRanking: number
    totalParticipants: number
    topPercentage: number
    badge: { name: string } | null
  } | null
  userContestRankingHistory:
    | {
        attended: boolean
        rating: number
        ranking: number
        problemsSolved: number
        totalProblems: number
        contest: { title: string; startTime: number }
      }[]
    | null
}

export async function fetchProfile(username: string) {
  const data = await gql<ProfileData>(
    `query profile($username: String!) {
      allQuestionsCount { difficulty count }
      matchedUser(username: $username) {
        username
        profile { realName userAvatar countryName ranking reputation }
        submitStats {
          acSubmissionNum { difficulty count submissions }
          totalSubmissionNum { difficulty count submissions }
        }
        problemsSolvedBeatsStats { difficulty percentage }
        userCalendar { activeYears streak totalActiveDays submissionCalendar }
        tagProblemCounts {
          advanced { tagName tagSlug problemsSolved }
          intermediate { tagName tagSlug problemsSolved }
          fundamental { tagName tagSlug problemsSolved }
        }
        languageProblemCount { languageName problemsSolved }
        badges { id }
      }
    }`,
    { username },
  )
  if (!data.matchedUser) throw new Error(`LeetCode user "${username}" not found`)
  return data
}

export async function fetchCalendarYear(username: string, year: number): Promise<Record<string, number>> {
  const data = await gql<{ matchedUser: { userCalendar: { submissionCalendar: string } } | null }>(
    `query cal($username: String!, $year: Int) {
      matchedUser(username: $username) {
        userCalendar(year: $year) { submissionCalendar }
      }
    }`,
    { username, year },
  )
  return JSON.parse(data.matchedUser?.userCalendar.submissionCalendar || '{}')
}

export async function fetchContests(username: string) {
  return gql<ContestData>(
    `query contests($username: String!) {
      userContestRanking(username: $username) {
        attendedContestsCount rating globalRanking totalParticipants topPercentage
        badge { name }
      }
      userContestRankingHistory(username: $username) {
        attended rating ranking problemsSolved totalProblems
        contest { title startTime }
      }
    }`,
    { username },
  )
}
