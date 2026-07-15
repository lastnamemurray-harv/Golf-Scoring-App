# Deployment Checklist

## 1. Supabase

- [ ] Create a free Supabase project.
- [ ] Open SQL Editor and run `supabase/schema.sql`.
- [ ] Run `supabase/seed.sql`.
- [ ] Open Authentication > Sign In / Providers.
- [ ] Enable **Allow anonymous sign-ins**.
- [ ] Copy the Project URL.
- [ ] Copy the Publishable key beginning with `sb_publishable_`.

## 2. Test locally

```bash
cp .env.example .env.local
# Edit .env.local and paste the Supabase values
npm install
npm run dev
```

Open the local URL shown in the terminal. Start a test round, change metric settings, and import one scorecard photo.

## 3. GitHub

Create an empty GitHub repository, then run from this folder:

```bash
git init
git add .
git commit -m "Initial golf scorecard PWA"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

## 4. Cloudflare Pages

- [ ] Open Workers & Pages.
- [ ] Create application.
- [ ] Select Pages and import the GitHub repository.
- [ ] Framework preset: **Vite**.
- [ ] Build command: `npm run build`.
- [ ] Output directory: `dist`.
- [ ] Add environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `NODE_VERSION` = `22`
- [ ] Deploy.

## 5. Final Supabase URL setting

In Supabase Authentication > URL Configuration:

- Set **Site URL** to the production Cloudflare Pages URL.
- Add the production URL to allowed redirect URLs if Supabase requests it.

## 6. Install on phone

- iPhone: Safari > Share > Add to Home Screen.
- Android: Chrome > menu > Install app.

## First on-course test

Before relying on it for a full round:

1. Turn airplane mode on after loading the app.
2. Enter data for two holes.
3. Close and reopen the app.
4. Confirm the active round resumes with saved values.
5. Turn connectivity back on and confirm the status changes from **Saved offline** to a cloud state on the next save.

## Updating an existing deployment to version 0.3

1. In Supabase, open SQL Editor and run `supabase/migration_v2_round_features.sql`.
2. Upload the replacement project files to the same GitHub repository, preserving the folder structure.
3. Commit the changes to `main`.
4. Cloudflare will build and deploy automatically.
5. Open the app and refresh it. Installed home-screen versions may need to be closed and reopened once for the new service worker to activate.


## Updating an existing deployment to version 0.6

1. Run `supabase/migration_v4_player_handicap_tees.sql` in the Supabase SQL Editor.
2. Upload the replacement files to the root of the existing GitHub repository.
3. Commit to `main`; Cloudflare will deploy automatically.
4. Completely close and reopen the installed PWA so the new service worker activates.
5. Start a test round with two players using different tees and handicaps, then confirm Gross/Net scorecard views.
