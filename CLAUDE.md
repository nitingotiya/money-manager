# Money Manager: notes for making changes

Personal finance app for web and Android. React 19 + TypeScript + Vite; data in Supabase (Postgres with Row Level Security) or, with no keys, in localStorage ("demo mode"). Android is a Capacitor wrapper around the same build.

## Layout

- `src/App.tsx`: routes (HashRouter), sidebar on desktop, bottom bar on phones, providers.
- `src/lib/types.ts`: one interface per table plus the `TABLES` list. **Start here when adding data.**
- `src/lib/backend.ts`: generic list/insert/update/remove for Supabase and localStorage. Screens never call Supabase directly.
- `src/lib/data.tsx`: `useData()` loads every table for the signed-in user and exposes `add/update/remove`.
- `src/lib/loans.ts`: EMI schedule, early/on-time/late status, lump-sum splitting. `calc.ts`: month totals and bills.
- `src/lib/updates.tsx` + `version.ts`: update checks (service worker on web, GitHub Releases on Android) and "What's new".
- `src/pages/*`: one file per screen. `src/components/ui.tsx`: Modal, Field, Seg, Progress, ConfirmButton, etc.
- `src/index.css`: all styles; colours are CSS variables with light and dark values. Chart colours are `--c-*`.
- `supabase/migrations/`: numbered SQL changes. `supabase/schema.sql` = all of them combined.

## Adding a feature that stores new data

1. Add the interface to `types.ts` and the table name to `TABLES`.
2. Add a migration `supabase/migrations/000N_name.sql` (create table with `user_id uuid not null default auth.uid() references auth.users on delete cascade`, enable RLS, add the "own rows" policy, and record it in `schema_migrations`). Append it to `schema.sql`.
3. Use `useData()` in the screen: `d.add('table', row)`, `d.update(...)`, `d.remove(...)`.
4. New optional columns on existing tables must have defaults, and the code must treat a missing value as the default (old rows and the localStorage backend won't have it).

## Rules

- Never rename or drop a column a released version reads; add a new one instead.
- Don't use `alert/confirm/prompt`; use `ConfirmButton` or a `Modal`.
- Money is a plain number in the user's currency; format with `money()` from `lib/format.ts`. Dates are `YYYY-MM-DD` strings.
- Keep screens usable at 390px wide; check the bottom bar doesn't cover content.
- Run `npm run typecheck` and `npm run build` before committing.

## Releasing

`npm run release:patch|minor|major -- "note for What's new" ...` then `git push --follow-tags`.
GitHub Actions deploys the website (`deploy-web.yml`) and builds the signed APK + AAB (`android-release.yml`).
Android `versionCode` comes from package.json (major*10000 + minor*100 + patch). See `UPDATING.md`.
