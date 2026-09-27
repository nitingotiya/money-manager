-- Migration 0002 (app version 1.1.0): amount paid upfront on EMI purchases.
alter table loans add column if not exists down_payment numeric(14, 2) not null default 0;
alter table loans add column if not exists down_payment_date date;
