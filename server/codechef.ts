import { pool } from "./db.ts";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

interface CCRatingEntry {
  code: string;
  rating: string;
  rank: string;
  name: string;
  end_date: string;
}

export async function syncCodechef(handle: string): Promise<void> {
  const res = await fetch(
    `https://www.codechef.com/users/${encodeURIComponent(handle)}`,
    {
      headers: { "User-Agent": UA },
      redirect: "follow",
    },
  );
  if (!res.ok) throw new Error(`CodeChef responded ${res.status}`);
  const html = await res.text();
  // An unknown handle redirects to the teams page or home
  if (!html.includes("rating-number"))
    throw new Error(`CodeChef user "${handle}" not found`);

  const num = (re: RegExp) => {
    const m = html.match(re);
    return m ? Number(m[1].replace(/,/g, "")) : null;
  };
  const rating = num(/rating-number">\s*([\d,]+)/);
  const highest = num(/Highest Rating\s*([\d,]+)/);
  const solved = num(/Total Problems Solved:\s*([\d,]+)/);
  const starsBlock =
    html.match(/class="rating-star">([\s\S]*?)<\/span>\s*<\/div>/)?.[1] ?? "";
  const stars = (starsBlock.match(/&#9733;|★/g) ?? []).length || null;
  const country =
    html.match(/class="user-country-name"[^>]*>([^<]+)</)?.[1]?.trim() ?? null;
  const realName =
    html.match(/<h1 class="h2-style">\s*([^<]+?)\s*</)?.[1] ?? null;

  const ranksBlock = html.match(/rating-ranks[\s\S]{0,600}/)?.[0] ?? "";
  const rankNums = [
    ...ranksBlock.matchAll(/<strong>\s*([\d,]+|Inactive)\s*<\/strong>/g),
  ].map((m) => (m[1] === "Inactive" ? null : Number(m[1].replace(/,/g, ""))));
  const globalRank = rankNums[0] ?? null;
  const countryRank = rankNums[1] ?? null;

  let history: CCRatingEntry[] = [];
  const ratingJson = html.match(/var all_rating = (\[[\s\S]*?\]);/)?.[1];
  if (ratingJson) {
    try {
      history = JSON.parse(ratingJson);
    } catch {
      // rating graph is optional
    }
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    const userRes = await client.query(
      `insert into users (platform, username, real_name, country, contest_rating, max_rating,
                          stars, contest_global_rank, country_rank, solved_count,
                          contest_attended, synced_at)
       values ('codechef',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())
       on conflict (platform, username) do update set
         real_name = excluded.real_name, country = excluded.country,
         contest_rating = excluded.contest_rating, max_rating = excluded.max_rating,
         stars = excluded.stars, contest_global_rank = excluded.contest_global_rank,
         country_rank = excluded.country_rank, solved_count = excluded.solved_count,
         contest_attended = excluded.contest_attended, synced_at = now()
       returning id`,
      [
        handle,
        realName,
        country,
        rating,
        highest,
        stars,
        globalRank,
        countryRank,
        solved,
        history.length,
      ],
    );
    const userId: number = userRes.rows[0].id;

    for (const h of history) {
      await client.query(
        `insert into contests (user_id, title, started_at, rank, rating)
         values ($1,$2,$3,$4,$5)
         on conflict (user_id, title) do update set rank = excluded.rank, rating = excluded.rating`,
        [
          userId,
          h.name,
          h.end_date ? new Date(h.end_date.replace(" ", "T") + "Z") : null,
          Number(h.rank) || null,
          Number(h.rating) || null,
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
