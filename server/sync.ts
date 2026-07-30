import { pool } from "./db.ts";
import {
  fetchProfile,
  fetchContests,
  fetchCalendarYear,
  type DifficultyCount,
} from "./leetcode.ts";

const byDiff = (rows: DifficultyCount[], d: string) =>
  rows.find((r) => r.difficulty === d);

export async function syncUser(username: string): Promise<void> {
  const [profile, contests] = await Promise.all([
    fetchProfile(username),
    fetchContests(username),
  ]);
  const mu = profile.matchedUser!;
  const ranking = contests.userContestRanking;

  const toDayMap = (cal: Record<string, number>) => {
    const m: Record<string, number> = {};
    for (const [ts, count] of Object.entries(cal)) {
      const day = new Date(Number(ts) * 1000).toISOString().slice(0, 10);
      m[day] = (m[day] ?? 0) + count;
    }
    return m;
  };
  const fullCalendar = toDayMap(
    JSON.parse(mu.userCalendar.submissionCalendar || "{}"),
  );
  for (const year of mu.userCalendar.activeYears) {
    try {
      Object.assign(
        fullCalendar,
        toDayMap(await fetchCalendarYear(mu.username, year)),
      );
    } catch {
      // a missing year shouldn't fail the whole sync
    }
  }

  const client = await pool.connect();
  try {
    await client.query("begin");

    const userRes = await client.query(
      `insert into users (platform, username, real_name, avatar_url, country, ranking, reputation,
                          contest_badge, badges_count, contest_rating, contest_global_rank,
                          contest_top_pct, contest_attended, synced_at)
       values ('leetcode',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now())
       on conflict (platform, username) do update set
         real_name = excluded.real_name,
         avatar_url = excluded.avatar_url,
         country = excluded.country,
         ranking = excluded.ranking,
         reputation = excluded.reputation,
         contest_badge = excluded.contest_badge,
         badges_count = excluded.badges_count,
         contest_rating = excluded.contest_rating,
         contest_global_rank = excluded.contest_global_rank,
         contest_top_pct = excluded.contest_top_pct,
         contest_attended = excluded.contest_attended,
         synced_at = now()
       returning id`,
      [
        mu.username,
        mu.profile.realName,
        mu.profile.userAvatar,
        mu.profile.countryName,
        mu.profile.ranking,
        mu.profile.reputation,
        ranking?.badge?.name ?? null,
        mu.badges.length,
        ranking?.rating ?? null,
        ranking?.globalRanking ?? null,
        ranking?.topPercentage ?? null,
        ranking?.attendedContestsCount ?? null,
      ],
    );
    const userId: number = userRes.rows[0].id;

    const ac = mu.submitStats.acSubmissionNum;
    const total = mu.submitStats.totalSubmissionNum;
    const all = profile.allQuestionsCount;
    const beats = (d: string) =>
      mu.problemsSolvedBeatsStats.find((b) => b.difficulty === d)?.percentage ??
      null;

    await client.query(
      `insert into snapshots (user_id, taken_on, easy_solved, easy_total, medium_solved, medium_total,
                              hard_solved, hard_total, total_solved, total_questions,
                              ac_submissions, total_submissions, beats_easy, beats_medium, beats_hard)
       values ($1, current_date, $2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       on conflict (user_id, taken_on) do update set
         easy_solved = excluded.easy_solved, easy_total = excluded.easy_total,
         medium_solved = excluded.medium_solved, medium_total = excluded.medium_total,
         hard_solved = excluded.hard_solved, hard_total = excluded.hard_total,
         total_solved = excluded.total_solved, total_questions = excluded.total_questions,
         ac_submissions = excluded.ac_submissions, total_submissions = excluded.total_submissions,
         beats_easy = excluded.beats_easy, beats_medium = excluded.beats_medium,
         beats_hard = excluded.beats_hard`,
      [
        userId,
        byDiff(ac, "Easy")?.count ?? 0,
        byDiff(all, "Easy")?.count ?? 0,
        byDiff(ac, "Medium")?.count ?? 0,
        byDiff(all, "Medium")?.count ?? 0,
        byDiff(ac, "Hard")?.count ?? 0,
        byDiff(all, "Hard")?.count ?? 0,
        byDiff(ac, "All")?.count ?? 0,
        byDiff(all, "All")?.count ?? 0,
        byDiff(ac, "All")?.submissions ?? 0,
        byDiff(total, "All")?.submissions ?? 0,
        beats("Easy"),
        beats("Medium"),
        beats("Hard"),
      ],
    );

    const entries = Object.entries(fullCalendar);
    if (entries.length) {
      const days: string[] = [];
      const counts: number[] = [];
      for (const [day, count] of entries) {
        days.push(day);
        counts.push(count);
      }
      await client.query(
        `insert into calendar (user_id, day, count)
         select $1, d, c from unnest($2::date[], $3::int[]) as t(d, c)
         on conflict (user_id, day) do update set count = excluded.count`,
        [userId, days, counts],
      );
    }

    await client.query("delete from tag_stats where user_id = $1", [userId]);
    const tagRows: [string, string, string, number][] = [];
    for (const level of ["fundamental", "intermediate", "advanced"] as const) {
      for (const t of mu.tagProblemCounts[level]) {
        tagRows.push([t.tagName, t.tagSlug, level, t.problemsSolved]);
      }
    }
    for (const [name, slug, level, solved] of tagRows) {
      await client.query(
        `insert into tag_stats (user_id, tag_name, tag_slug, level, problems_solved)
         values ($1,$2,$3,$4,$5)
         on conflict (user_id, tag_name) do update set problems_solved = excluded.problems_solved`,
        [userId, name, slug, level, solved],
      );
    }

    await client.query("delete from lang_stats where user_id = $1", [userId]);
    for (const l of mu.languageProblemCount) {
      await client.query(
        `insert into lang_stats (user_id, language, problems_solved) values ($1,$2,$3)`,
        [userId, l.languageName, l.problemsSolved],
      );
    }

    const history = (contests.userContestRankingHistory ?? []).filter(
      (h) => h.attended,
    );
    for (const h of history) {
      await client.query(
        `insert into contests (user_id, title, started_at, rank, rating, problems_solved, total_problems)
         values ($1,$2, to_timestamp($3), $4,$5,$6,$7)
         on conflict (user_id, title) do update set
           rank = excluded.rank, rating = excluded.rating,
           problems_solved = excluded.problems_solved, total_problems = excluded.total_problems`,
        [
          userId,
          h.contest.title,
          h.contest.startTime,
          h.ranking,
          h.rating,
          h.problemsSolved,
          h.totalProblems,
        ],
      );
    }

    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}
