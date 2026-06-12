-- Primary Spirit / Companion system tables (mirrors game Spirit* Lua configs)

create table if not exists "SpiritConfig" (
  id integer primary key,
  name text,
  "desc" text,
  init_quality integer,
  score_min integer,
  score_max integer,
  skill_id integer,
  skins integer,
  "isRare" boolean default false
);

create table if not exists "SpiritStarIndexConfig" (
  id integer primary key,
  list jsonb not null default '[]'::jsonb
);

create table if not exists "SpiritStarConfig" (
  id integer primary key,
  star_min integer,
  star_max integer,
  spirit_team_attribute jsonb,
  spirit_team_attribute_percent jsonb,
  spirit_team_attribute_sum jsonb,
  soul_consume jsonb,
  skill_level integer,
  lv_max integer
);

create table if not exists "SpiritAttrConfig" (
  id integer primary key,
  spirit_attribute jsonb not null default '[]'::jsonb,
  spirit_foundation_attribute jsonb not null default '[]'::jsonb
);

create table if not exists "SpiritLevelConfig" (
  id integer primary key,
  exp integer,
  sumexp integer
);

create table if not exists "SpiritStarLevelConfig" (
  id integer primary key,
  exp integer,
  sumexp integer
);

create table if not exists "SpiritRiseQualityInfoConfig" (
  id integer primary key,
  unlock_self jsonb,
  unlock_material jsonb,
  num integer
);

create table if not exists "SpiritStarLossConfig" (
  id integer primary key,
  min integer,
  max integer,
  value integer
);

alter table "SpiritConfig" enable row level security;
alter table "SpiritStarIndexConfig" enable row level security;
alter table "SpiritStarConfig" enable row level security;
alter table "SpiritAttrConfig" enable row level security;
alter table "SpiritLevelConfig" enable row level security;
alter table "SpiritStarLevelConfig" enable row level security;
alter table "SpiritRiseQualityInfoConfig" enable row level security;
alter table "SpiritStarLossConfig" enable row level security;

create policy "Public read SpiritConfig"
  on "SpiritConfig" for select using (true);

create policy "Public read SpiritStarIndexConfig"
  on "SpiritStarIndexConfig" for select using (true);

create policy "Public read SpiritStarConfig"
  on "SpiritStarConfig" for select using (true);

create policy "Public read SpiritAttrConfig"
  on "SpiritAttrConfig" for select using (true);

create policy "Public read SpiritLevelConfig"
  on "SpiritLevelConfig" for select using (true);

create policy "Public read SpiritStarLevelConfig"
  on "SpiritStarLevelConfig" for select using (true);

create policy "Public read SpiritRiseQualityInfoConfig"
  on "SpiritRiseQualityInfoConfig" for select using (true);

create policy "Public read SpiritStarLossConfig"
  on "SpiritStarLossConfig" for select using (true);
