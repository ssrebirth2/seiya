-- Item system extensions: exchange conditions, cross-config tables, usage index

create table if not exists "ExchangeConditionConfig" (
  id integer primary key,
  unlock jsonb
);

create table if not exists "ExchangeListConfig" (
  id integer primary key,
  item_list jsonb not null default '[]'::jsonb
);

create table if not exists "HeroStarUpConfig" (
  id integer primary key,
  consume jsonb,
  general_item integer
);

create table if not exists "HeroStageConsumeConfig" (
  id integer primary key,
  role_stage_consume jsonb
);

create table if not exists "HeroQualityConsumeConfig" (
  id integer primary key,
  role_quality_consume jsonb
);

create table if not exists "ArtifactCompositeConfig" (
  id integer primary key,
  consume jsonb
);

create table if not exists "ArtifactRebornConfig" (
  id integer primary key,
  consume_prop jsonb,
  exp_return_prop jsonb
);

create table if not exists "ItemUsageIndex" (
  id text primary key,
  item_id integer not null,
  source_table text not null,
  source_id text not null,
  role text not null,
  qty integer,
  meta jsonb
);

create index if not exists item_usage_index_item_id_idx on "ItemUsageIndex" (item_id);

alter table "ExchangeConditionConfig" enable row level security;
alter table "ExchangeListConfig" enable row level security;
alter table "HeroStarUpConfig" enable row level security;
alter table "HeroStageConsumeConfig" enable row level security;
alter table "HeroQualityConsumeConfig" enable row level security;
alter table "ArtifactCompositeConfig" enable row level security;
alter table "ArtifactRebornConfig" enable row level security;
alter table "ItemUsageIndex" enable row level security;

create policy "Public read ExchangeConditionConfig"
  on "ExchangeConditionConfig" for select using (true);

create policy "Public read ExchangeListConfig"
  on "ExchangeListConfig" for select using (true);

create policy "Public read HeroStarUpConfig"
  on "HeroStarUpConfig" for select using (true);

create policy "Public read HeroStageConsumeConfig"
  on "HeroStageConsumeConfig" for select using (true);

create policy "Public read HeroQualityConsumeConfig"
  on "HeroQualityConsumeConfig" for select using (true);

create policy "Public read ArtifactCompositeConfig"
  on "ArtifactCompositeConfig" for select using (true);

create policy "Public read ArtifactRebornConfig"
  on "ArtifactRebornConfig" for select using (true);

create policy "Public read ItemUsageIndex"
  on "ItemUsageIndex" for select using (true);
