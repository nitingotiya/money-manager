-- Migration 0003 (app version 1.1.0): record which migrations have been applied,
-- so you can always check what a database is missing:  select * from schema_migrations order by id;
create table if not exists schema_migrations (
  id text primary key,
  applied_at timestamptz not null default now()
);
alter table schema_migrations enable row level security; -- no policies: not readable by app users

insert into schema_migrations (id) values
  ('0001_initial'), ('0002_loan_down_payment'), ('0003_schema_version')
on conflict (id) do nothing;
