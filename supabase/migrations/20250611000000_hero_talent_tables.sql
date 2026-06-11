-- Hero Talent system tables (mirrors game HeroTalent* Lua configs)
-- AttributesIndexConfig already exists — do not recreate.

create table if not exists "HeroTalentConfig" (
  id integer primary key,
  talent_layers jsonb not null default '[]'::jsonb,
  skill_layers jsonb not null default '[]'::jsonb
);

create table if not exists "HeroTalentLayersConfig" (
  id integer primary key,
  attribute_id jsonb not null default '[]'::jsonb,
  max_level integer not null default 5,
  unlock jsonb not null default '[]'::jsonb
);

create table if not exists "HeroTalentAttributeConfig" (
  id integer primary key,
  attribute_level_id jsonb not null default '[]'::jsonb
);

create table if not exists "HeroTalentAttributeLevelConfig" (
  id integer primary key,
  consume jsonb not null default '[]'::jsonb,
  attribute jsonb not null default '[]'::jsonb
);

create table if not exists "HeroTalentSkillConfig" (
  id integer primary key,
  consume jsonb,
  hero_consume jsonb,
  general_item integer,
  showskill jsonb,
  skill jsonb
);

alter table "HeroTalentConfig" enable row level security;
alter table "HeroTalentLayersConfig" enable row level security;
alter table "HeroTalentAttributeConfig" enable row level security;
alter table "HeroTalentAttributeLevelConfig" enable row level security;
alter table "HeroTalentSkillConfig" enable row level security;

create policy "Public read HeroTalentConfig"
  on "HeroTalentConfig" for select using (true);

create policy "Public read HeroTalentLayersConfig"
  on "HeroTalentLayersConfig" for select using (true);

create policy "Public read HeroTalentAttributeConfig"
  on "HeroTalentAttributeConfig" for select using (true);

create policy "Public read HeroTalentAttributeLevelConfig"
  on "HeroTalentAttributeLevelConfig" for select using (true);

create policy "Public read HeroTalentSkillConfig"
  on "HeroTalentSkillConfig" for select using (true);
