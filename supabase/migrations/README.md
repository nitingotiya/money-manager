# Database migrations

Each file here is one change to the database, numbered in the order they must run.

**New Supabase project:** run `../schema.sql` once. It contains every migration.

**Existing project, after updating the app:** open Supabase → SQL Editor and run only the
migration files you haven't run yet, oldest first. To see which ones a database already has:

```sql
select * from schema_migrations order by id;
```

Every migration is written so running it twice does no harm (`if not exists`).

## Adding a migration

1. Create the next file, e.g. `0004_wallets.sql`, with the change.
2. End it with `insert into schema_migrations (id) values ('0004_wallets') on conflict do nothing;`
3. Append the same SQL to `../schema.sql` so new projects get it too.
4. Only **add** columns and tables, with defaults. Never rename or drop a column that a
   released version still reads: people on the older app version would break until they update.
   Remove old columns only once no one runs a version that needs them.
