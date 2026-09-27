# Keeping Money Manager up to date

This app is set up so you can keep changing it and every user gets the new version:

| Where people use it | How they get updates |
|---|---|
| Website, or installed from Chrome ("Install app") | Automatic. The new version downloads in the background, and a bar says **"A new version of the app is ready — Update now"**. |
| Android app (APK) | The app checks for a newer version when it opens and shows **"Version X is available — Download"**. Tapping it downloads the new APK, which installs over the old one and keeps all data. |
| Google Play (later) | Play updates the app by itself. Upload the `.aab` file that each release produces. |

After any update, people see a short **"What's new"** list once.

The whole flow runs on GitHub (free): you push a change, GitHub builds the website and the Android app, and users get the update.

---

## One-time setup (about 30 minutes)

### 1. Put the code on GitHub

1. Create a free account at github.com.
2. Click **New repository**. Name it `money-manager`, make it **Public** (free GitHub Pages hosting needs a public repository), and don't add any files.
3. Install Git (git-scm.com) and Node.js 20+ (nodejs.org) on your computer.
4. In the unzipped project folder, run (replace `YOUR-NAME`):
   ```bash
   git remote add origin https://github.com/YOUR-NAME/money-manager.git
   git push -u origin main --follow-tags
   ```
   The project already has its history and the `v1.1.0` tag.

Making the repository public shows the code, not anyone's data. The Supabase key the app uses is meant to be public; your users' data is protected by the database rules.

### 2. Turn on the website

In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Then open the **Actions** tab, pick **Deploy website**, and click **Run workflow**. After a minute or two the app is live at:

`https://YOUR-NAME.github.io/money-manager/`

### 3. Add your secrets

**Settings → Secrets and variables → Actions → New repository secret.** Add:

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | everything inside `keystore-base64.txt` from the signing-key zip |
| `ANDROID_KEYSTORE_PASSWORD` | the password in `READ-ME-FIRST.txt` |
| `ANDROID_KEY_ALIAS` | `money-manager` |
| `ANDROID_KEY_PASSWORD` | the same password |
| `VITE_SUPABASE_URL` | from Supabase (optional: leave out for demo mode) |
| `VITE_SUPABASE_ANON_KEY` | from Supabase (optional) |

The signing key is what lets Android install an update over the existing app. Keep the key zip backed up somewhere safe. If it's lost, installed apps can't be updated; people would have to uninstall and reinstall.

### 4. Build the first Android app

**Actions → Android release → Run workflow**. For the very first APK you can also just push a release (next section). When it finishes, the release page has `money-manager.apk`.

### 5. Supabase (if you use accounts)

Run `supabase/schema.sql` once in the Supabase SQL Editor. In **Authentication → URL Configuration**, set **Site URL** to your GitHub Pages address.

---

## Every time you change something

1. **Make the change.** Edit the code yourself, or ask Claude: "In my Money Manager app, add …". Open the project folder and describe what you want. `CLAUDE.md` in the project tells Claude how the app is built.
2. **Try it** on your computer:
   ```bash
   npm run dev
   ```
3. **Save it:**
   ```bash
   git add -A
   git commit -m "Add wallets"
   ```
4. **Release it** with a line or two for "What's new":
   ```bash
   npm run release:minor -- "You can now keep separate wallets for cash and bank"
   git push --follow-tags
   ```
   Use `release:patch` for small fixes, `release:minor` for new features, `release:major` for big changes.

That's it. In about 5–10 minutes:

- The website updates, and open copies of the app show **Update now**.
- A new GitHub release appears with the signed APK, and Android apps offer the download the next time they open.

You can follow progress in the **Actions** tab. A red ✖ means something failed; click it to see why.

### If the change needs a database change

Add a new numbered file in `supabase/migrations/` (see the README there) and run it in the Supabase SQL Editor **before** pushing the release. Only add columns and tables; don't rename or remove ones that the current version uses, because some people will still be on the older version for a while.

---

## Installing and updating on Android

**First install:** on the phone, open `https://github.com/YOUR-NAME/money-manager/releases/latest`, tap `money-manager.apk`, and open the download. Android asks once to **allow installs from this source** (Chrome or Files). Allow it, go back, and tap **Install**.

**Updates:** tap **Download** on the update bar in the app, then open the downloaded file and tap **Update**. Data is kept.

Play Protect may warn that the app is from an unknown developer, because it isn't from the Play Store. Tap **More details → Install anyway**. Publishing on Google Play removes this warning.

## Publishing on Google Play (when you're ready)

1. Create a Google Play Console developer account (one-time fee; check the current price on the sign-up page).
2. Create an app and follow the checklist (store listing, privacy policy, content rating, data safety).
3. Upload `money-manager.aab` from the latest GitHub release.
4. For later versions, upload the new `.aab` from each release. Play installs it for everyone automatically.

The app ID `com.nitin.moneymanager` (in `capacitor.config.ts` and `android/app/build.gradle`) is permanent once the app is on Play. Change it before the first upload if you want a different one.

## Building the Android app on your own computer (optional)

You don't need this if GitHub Actions builds it, but it helps for testing on a phone connected by USB.

1. Install Android Studio.
2. Copy `money-manager-release.jks` and `keystore.properties` from the key zip into the `android` folder.
3. Run:
   ```bash
   npm run android:sync
   npm run android:open
   ```
4. In Android Studio, press ▶ to run it on a connected phone, or use **Build → Build APK(s)**.
