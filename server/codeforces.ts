import { pool } from "./db.ts";

const API = "https://codeforces.com/api";

async function cf<T>(path: string): Promise<T> {
  const res = await fetch(`${API}/${path}`, {
    headers: { "User-Agent": "leettrack/0.1 (personal dashboard)" },
  });
  const json = (await res.json()) as {
    status: string;
    comment?: string;
    result?: T;
  };
  if (json.status !== "OK" || !json.result) {
    throw new Error(json.comment ?? `Codeforces responded ${res.status}`);
  }
  return json.result;
}

interface CFUser {
  handle: string;
  rating?: number;
  maxRating?: number;
  rank?: string;
  maxRank?: string;
  titlePhoto?: string;
  country?: string;
}

interface CFRatingChange {
  contestId: number;
  contestName: string;
  rank: number;
  oldRating: number;
  newRating: number;
  ratingUpdateTimeSeconds: number;
}

interface CFSubmission {
  verdict?: string;
  creationTimeSeconds: number;
  programmingLanguage: string;
  problem: { contestId?: number; index: string; name: string; rating?: number };
}

export interface CFStats {
  user: {
    handle: string;
    rating: number | null;
    maxRating: number | null;
    rank: string | null;
    maxRank: string | null;
    avatar: string | null;
    country: string | null;
    syncedAt: string;
  };
  solved: number;
  acceptance: number | null;
  streak: { current: number; longest: number; activeDays: number };
  calendar: { date: string; count: number }[];
  languages: { name: string; solved: number }[];
  contest: {
    rating: number;
    peak: number;
    delta: number | null;
    attended: number;
    lastContest: { title: string; rank: number | null } | null;
    history: {
      title: string;
      rating: number;
      rank: number | null;
      date: string | null;
    }[];
  } | null;
}

export async function syncCodeforces(handle: string): Promise<void> {
  const [users, ratings, submissions] = await Promise.all([
    cf<CFUser[]>(`user.info?handles=${encodeURIComponent(handle)}`),
    cf<CFRatingChange[]>(`user.rating?handle=${encodeURIComponent(handle)}`),
    cf<CFSubmission[]>(
      `user.status?handle=${encodeURIComponent(handle)}&from=1&count=10000`,
    ),
  ]);
  const u = users[0];
  if (!u) throw new Error(`Codeforces user "${handle}" not found`);

  const solvedByProblem = new Map<string, { lang: string; rating?: number }>(); // first AC per problem
  const perDay = new Map<string, number>();
  let okSubs = 0;
  for (const s of submissions) {
    const day = new Date(s.creationTimeSeconds * 1000)
      .toISOString()
      .slice(0, 10);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
    if (s.verdict === "OK") {
      okSubs++;
      const key = `${s.problem.contestId ?? "x"}-${s.problem.index}-${s.problem.name}`;
      if (!solvedByProblem.has(key)) {
        solvedByProblem.set(key, {
          lang: s.programmingLanguage,
          rating: s.problem.rating,
        });
      }
    }
  }
  const langCounts = new Map<string, number>();
  const buckets = { low: 0, mid: 0, high: 0 };
  for (const { lang, rating } of solvedByProblem.values()) {
    langCounts.set(lang, (langCounts.get(lang) ?? 0) + 1);
    if (rating != null) {
      if (rating < 1400) buckets.low++;
      else if (rating <= 1900) buckets.mid++;
      else buckets.high++;
    }
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    const userRes = await client.query(
      `insert into users (platform, username, avatar_url, country, contest_rating, max_rating,
                          rank_title, solved_count, contest_attended, synced_at)
       values ('codeforces',$1,$2,$3,$4,$5,$6,$7,$8, now())
       on conflict (platform, username) do update set
         avatar_url = excluded.avatar_url, country = excluded.country,
         contest_rating = excluded.contest_rating, max_rating = excluded.max_rating,
         rank_title = excluded.rank_title, solved_count = excluded.solved_count,
         contest_attended = excluded.contest_attended, synced_at = now()
       returning id`,
      [
        u.handle,
        u.titlePhoto ?? null,
        u.country ?? null,
        u.rating ?? null,
        u.maxRating ?? null,
        u.rank ?? null,
        solvedByProblem.size,
        ratings.length,
      ],
    );
    const userId: number = userRes.rows[0].id;

    if (perDay.size) {
      const days = [...perDay.keys()];
      const counts = [...perDay.values()];
      await client.query(
        `insert into calendar (user_id, day, count)
         select $1, d, c from unnest($2::date[], $3::int[]) as t(d, c)
         on conflict (user_id, day) do update set count = excluded.count`,
        [userId, days, counts],
      );
    }

    await client.query("delete from lang_stats where user_id = $1", [userId]);
    for (const [lang, count] of langCounts) {
      await client.query(
        "insert into lang_stats (user_id, language, problems_solved) values ($1,$2,$3)",
        [userId, lang, count],
      );
    }

    for (const r of ratings) {
      await client.query(
        `insert into contests (user_id, title, started_at, rank, rating)
         values ($1,$2, to_timestamp($3), $4,$5)
         on conflict (user_id, title) do update set rank = excluded.rank, rating = excluded.rating`,
        [userId, r.contestName, r.ratingUpdateTimeSeconds, r.rank, r.newRating],
      );
    }

    // acceptance + rating buckets stored on the latest snapshot row, reusing the column trio
    await client.query(
      `insert into snapshots (user_id, taken_on, total_solved, ac_submissions, total_submissions,
                              easy_solved, medium_solved, hard_solved)
       values ($1, current_date, $2, $3, $4, $5, $6, $7)
       on conflict (user_id, taken_on) do update set
         total_solved = excluded.total_solved,
         ac_submissions = excluded.ac_submissions,
         total_submissions = excluded.total_submissions,
         easy_solved = excluded.easy_solved,
         medium_solved = excluded.medium_solved,
         hard_solved = excluded.hard_solved`,
      [
        userId,
        solvedByProblem.size,
        okSubs,
        submissions.length,
        buckets.low,
        buckets.mid,
        buckets.high,
      ],
    );

    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}
