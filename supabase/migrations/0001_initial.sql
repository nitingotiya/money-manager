-- Migration 0001 (app version 1.0.0): initial tables and security rules.
-- Row Level Security makes sure every user can only read and change their own rows.

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  type text not null check (type in ('expense', 'income')),
  color text not null default '#adb5bd'
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  type text not null check (type in ('expense', 'income')),
  amount numeric(14, 2) not null check (amount >= 0),
  category_id uuid references categories on delete set null,
  date date not null,
  note text not null default '',
  mode text not null default 'UPI'
);
create index if not exists transactions_user_date on transactions (user_id, date desc);

create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  category_id uuid not null references categories on delete cascade,
  amount numeric(14, 2) not null check (amount >= 0)
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  target numeric(14, 2) not null check (target > 0),
  saved numeric(14, 2) not null default 0,
  deadline date
);

create table if not exists bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  due_day int not null check (due_day between 1 and 31),
  category_id uuid references categories on delete set null,
  last_paid text -- 'YYYY-MM' of the last month marked paid
);

create table if not exists loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  person text not null,
  phone text not null default '',
  direction text not null check (direction in ('lent', 'borrowed')),
  kind text not null check (kind in ('cash', 'emi')),
  title text not null default '',
  principal numeric(14, 2) not null default 0,
  card text not null default '',
  emi_amount numeric(14, 2) not null default 0,
  installments int not null default 0,
  start_date date not null,
  due_date date,
  notes text not null default '',
  closed boolean not null default false
);

create table if not exists loan_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  loan_id uuid not null references loans on delete cascade,
  installment_no int,
  amount numeric(14, 2) not null check (amount > 0),
  paid_on date not null,
  note text not null default ''
);

create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users on delete cascade,
  currency text not null default 'INR',
  display_name text not null default ''
);

-- Row Level Security: one policy per table, "you can only touch your own rows".
do $$
declare t text;
begin
  foreach t in array array['categories','transactions','budgets','goals','bills','loans','loan_payments','settings'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "own rows" on %I', t);
    execute format(
      'create policy "own rows" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;
