# Money Manager

A personal finance app for phone, tablet and desktop. Each person signs up with their own account and sees only their own data.

## What it does

| Section | What you can do |
|---|---|
| Home | This month's income, spending and balance, overdue alerts, upcoming bills, budget warnings, recent transactions |
| Transactions | Add expenses and income with category, date, note and payment mode (UPI, Cash, Card, Bank). Filter by month, type, category or text. Import and export CSV |
| Lending & EMIs | Track cash you lent (or borrowed) and items bought on EMI with your card for a friend. Each EMI is marked paid early, on time, late, part paid or overdue. Per-person totals and a WhatsApp reminder message |
| Budgets | Monthly limit per category, with warnings at 80% and 100% |
| Reports | Spending by category, last 6 months income vs expense, savings rate, daily average, spending by payment method |
| Savings goals | Target amount and date; the app works out how much to save each month |
| Bills | Monthly bills and EMIs you pay. "Mark paid" also records the expense |
| Settings | Name, currency, light/dark theme, categories, full JSON backup, password change |

## How the EMI tracking works

When you add an EMI entry you enter the item, the card, the monthly EMI, how many months, and the first due date. The app builds the schedule (due dates move month by month, and a 31st due date falls back to the last day of shorter months).

When your friend pays, open the entry, tap **Record** on that month and set the date they actually paid:

- Paid before the due date: **Paid early** (shows how many days early)
- Paid on the due date: **Paid on time**
- Paid after: **Paid late** (shows how many days late)
- Due date passed with nothing paid: **Overdue**
- Less than the full EMI paid: **Part paid**

If you entered the wrong date, tap **Edit** on that month to change or delete the payment.

**Paid upfront.** If your friend paid part of the price at the time of purchase (a down payment), enter it under "Paid upfront by them" with its date. The EMI per month is then worked out on the balance only, and the upfront amount counts as already received.

**Lump sums.** When someone pays more than one EMI at once, choose **Lump sum over EMIs** in the payment window. The app fills the oldest unpaid EMIs first and shows the split before you save. Anything left over goes against the next EMI as a part payment.

**Person view.** Tap a name under **People** on the Lending page, or the name at the top of any entry, to see everything with that person: totals, how much of each entry is paid, overdue or not due yet, their EMI record (early, on time, late, overdue), what was due against what was paid each month, how the balance has changed, and every payment in one list.

## Run it on your computer

You need Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the address it prints (usually http://localhost:5173). Without Supabase keys the app runs in **demo mode**: no login, and data is saved only in that browser.

## Turn on accounts and cloud sync (Supabase)

Supabase provides the login system and the Postgres database. It has a free tier.

1. Create a project at https://supabase.com.
2. In the project, open **SQL Editor**, paste the contents of `supabase/schema.sql` and click **Run**. This creates the tables and the security rules that keep each user's data private.
3. Open **Project Settings → API** and copy the **Project URL** and the **anon public** key.
4. Copy `.env.example` to `.env` and paste both values in.
5. Restart `npm run dev`. You'll now see Sign in / Create account.
6. In **Authentication → URL Configuration**, set **Site URL** to your live website address once it's deployed, and add it under **Redirect URLs**. Sign-up confirmation and password reset emails link there.

The anon key is designed to be public. Your data is protected by the Row Level Security rules in `schema.sql`, which only let a signed-in user read or change rows with their own user id. Never put the **service_role** key in this app.

## Put it online, install it, and keep it updated

Everything about hosting, the Android app, and releasing new versions is in **[UPDATING.md](UPDATING.md)**. In short: push the code to GitHub, and GitHub Actions publishes the website and builds a signed Android APK for every release. Installed copies of the app tell people when an update is ready.

## Project layout

```
src/
  App.tsx              routes, sidebar (desktop) and bottom bar (phone)
  changelog.json       "What's new" entries (added by the release script)
  lib/
    backend.ts         Supabase and local-storage data backends
    auth.tsx           sign in / sign up / demo mode
    data.tsx           loads and saves all data, seeds default categories
    loans.ts           EMI schedule, early/on-time/late logic, lump-sum split
    calc.ts            monthly totals, budgets, bill due dates
    updates.tsx        update checks and "What's new"
    types.ts           data types for every table
  pages/               one file per screen
  components/          modal, form fields, icons, transaction form, update bar
android/               the Android app (Capacitor); version comes from package.json
supabase/schema.sql    full database for a new project
supabase/migrations/   numbered database changes for existing projects
scripts/release.mjs    npm run release:patch|minor|major
.github/workflows/     automatic website deploy and Android builds
CLAUDE.md              how the code is organised, for making changes with Claude
UPDATING.md            hosting, Android install, and the release process
```

## Ideas for the next version

- Push or email reminders a day before an EMI or bill is due (Supabase Edge Functions plus a scheduled job)
- Multiple accounts and wallets with transfers between them
- Shared lending entries, so your friend can see the schedule and confirm payments
- Split bills with a group
- Reading bank SMS on Android to add transactions automatically (needs the Capacitor app and SMS permission)

## Things to know before launching publicly

- Add a privacy policy and terms page. You're storing people's financial records.
- Keep Supabase's email confirmation turned on so accounts can't be created with someone else's email.
- The app records money; it doesn't move money. If you ever add payments (UPI collect, auto-debit), that brings RBI payment rules into play, and you should get legal advice first.
