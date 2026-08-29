-- Hero stage-up planner ladders (quality gates, stage level caps, quality-up levels).
-- Live schema: datamine id + jsonb payload (same as HeroStageConsumeConfig).
-- Prefer RPC when available: select ensure_datamine_table('payload', 'HeroStageLevelConfig');

create table if not exists "HeroStageLevelConfig" (
  id integer primary key,
  payload jsonb not null default '[]'::jsonb
);

create table if not exists "HeroStageConditionConfig" (
  id integer primary key,
  payload jsonb not null default '[]'::jsonb
);

create table if not exists "HeroQualityStageConfig" (
  id integer primary key,
  payload jsonb not null default '[]'::jsonb
);

create table if not exists "HeroQualityLevelConfig" (
  id integer primary key,
  payload jsonb not null default '[]'::jsonb
);

alter table "HeroStageLevelConfig" enable row level security;
alter table "HeroStageConditionConfig" enable row level security;
alter table "HeroQualityStageConfig" enable row level security;
alter table "HeroQualityLevelConfig" enable row level security;

drop policy if exists "Public read HeroStageLevelConfig" on "HeroStageLevelConfig";
create policy "Public read HeroStageLevelConfig"
  on "HeroStageLevelConfig" for select using (true);

drop policy if exists "Public read HeroStageConditionConfig" on "HeroStageConditionConfig";
create policy "Public read HeroStageConditionConfig"
  on "HeroStageConditionConfig" for select using (true);

drop policy if exists "Public read HeroQualityStageConfig" on "HeroQualityStageConfig";
create policy "Public read HeroQualityStageConfig"
  on "HeroQualityStageConfig" for select using (true);

drop policy if exists "Public read HeroQualityLevelConfig" on "HeroQualityLevelConfig";
create policy "Public read HeroQualityLevelConfig"
  on "HeroQualityLevelConfig" for select using (true);
