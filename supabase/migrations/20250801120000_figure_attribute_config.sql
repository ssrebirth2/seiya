-- FigureAttributeConfig — cloth (9xxx) + role (95xx) figures
-- Live schema uses datamine id+payload (ensure_datamine_table). Prefer RPC when available:
--   select ensure_datamine_table('payload', 'FigureAttributeConfig');

create table if not exists "FigureAttributeConfig" (
  id text primary key,
  payload jsonb not null default '{}'::jsonb
);

alter table "FigureAttributeConfig" enable row level security;

drop policy if exists "Public read FigureAttributeConfig" on "FigureAttributeConfig";
create policy "Public read FigureAttributeConfig"
  on "FigureAttributeConfig" for select using (true);
