create table if not exists users (
  id serial primary key,
  username text unique not null,
  real_name text,
  avatar_url text,
  country text,
  ranking bigint,
  reputation int,
  contest_badge text,
  badges_count int not null default 0,
  contest_rating real,
  contest_global_rank bigint,
  contest_top_pct real,
  contest_attended int,
  synced_at timestamptz not null default now()
);

create table if not exists snapshots (
  id serial primary key,
  user_id int not null references users(id) on delete cascade,
  taken_on date not null,
  easy_solved int not null default 0,
  easy_total int not null default 0,
  medium_solved int not null default 0,
  medium_total int not null default 0,
  hard_solved int not null default 0,
  hard_total int not null default 0,
  total_solved int not null default 0,
  total_questions int not null default 0,
  ac_submissions int not null default 0,
  total_submissions int not null default 0,
  beats_easy real,
  beats_medium real,
  beats_hard real,
  unique (user_id, taken_on)
);

create table if not exists contests (
  id serial primary key,
  user_id int not null references users(id) on delete cascade,
  title text not null,
  started_at timestamptz,
  rank int,
  rating real not null,
  problems_solved int,
  total_problems int,
  unique (user_id, title)
);

create table if not exists calendar (
  user_id int not null references users(id) on delete cascade,
  day date not null,
  count int not null,
  primary key (user_id, day)
);

create table if not exists tag_stats (
  user_id int not null references users(id) on delete cascade,
  tag_name text not null,
  tag_slug text,
  level text not null,
  problems_solved int not null default 0,
  primary key (user_id, tag_name)
);

create table if not exists lang_stats (
  user_id int not null references users(id) on delete cascade,
  language text not null,
  problems_solved int not null default 0,
  primary key (user_id, language)
);

-- Multi-platform support: a users row is one (platform, handle) pair.
alter table users add column if not exists platform text not null default 'leetcode';
alter table users add column if not exists max_rating real;
alter table users add column if not exists rank_title text;
alter table users add column if not exists stars int;
alter table users add column if not exists country_rank bigint;
alter table users add column if not exists solved_count int;

do $$ begin
  if exists (select 1 from pg_constraint where conname = 'users_username_key') then
    alter table users drop constraint users_username_key;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'users_platform_username_key') then
    alter table users add constraint users_platform_username_key unique (platform, username);
  end if;
end $$;
