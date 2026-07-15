# RoundWise Golf Performance Tracker

## RoundWise v0.6

This release adds per-player tee and handicap selection, gross/net scorecards, traditional circle-and-square scoring symbols, live cumulative score-to-par, an expanded round summary, and a horizontally scrollable hole-by-hole details matrix.

A mobile-first golf scorecard that works as an installable Progressive Web App on Cloudflare Pages.

## Included

- One-hole-at-a-time mobile scoring UI
- Course reference and verified default-tee data bundled from the spreadsheet
- Scoring-zone points
- Club used off the tee
- Putting, short game, penalties, GIR, method score, and notes
- Per-user metric toggles
- Offline-first round saving in IndexedDB
- Supabase cloud synchronization with Row Level Security
- Anonymous authentication so a golfer can begin without creating a password
- Phone camera scorecard import using Tesseract.js OCR
- Editable review screen before an imported course updates the database
- PWA manifest and service worker for home-screen installation

## Important limitation of photo extraction

OCR is assisted data entry, not an automatic source of truth. Golf scorecards vary widely and small grid numbers are difficult for general-purpose OCR. The app requires the user to review and correct course name, tee, par, yardage, and handicap before saving. The image is processed in the browser and is not uploaded by this starter application.

## Local setup

1. Install Node.js 22 or later.
2. Copy `.env.example` to `.env.local`.
3. Add the Supabase project URL and publishable key.
4. Run:

```bash
npm install
npm run dev
```

The app also runs without Supabase configuration in local-only mode.

## Supabase setup

1. Create a free Supabase project.
2. Open **SQL Editor** and run `supabase/schema.sql`.
3. Run `supabase/seed.sql` to add the bundled course reference.
4. Open **Authentication → Sign In / Providers** and enable **Allow anonymous sign-ins**.
5. Open **Project Settings → API Keys** and copy:
   - Project URL
   - Publishable key beginning with `sb_publishable_`
6. Put both values in `.env.local` for local use and in Cloudflare environment variables for deployment.

RLS is enabled for every exposed table. Public course data is readable by all authenticated users. User-imported courses, settings, rounds, and hole results are restricted to their owner.

## Cloudflare Pages deployment through GitHub

1. Create a new GitHub repository and push this folder.
2. In Cloudflare, open **Workers & Pages → Create application → Pages → Import an existing Git repository**.
3. Select the repository.
4. Build settings:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/`
5. Add these production environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - Optional: `NODE_VERSION=22`
6. Deploy.
7. In Supabase **Authentication → URL Configuration**, set the Cloudflare Pages URL as the Site URL.

Every push to the connected GitHub branch will automatically rebuild and deploy the app.

## Direct deployment alternative

After installing dependencies and authenticating Wrangler:

```bash
npm run deploy
```

Wrangler will ask you to select or create a Pages project.

## Install on a phone

- iPhone: open in Safari, tap Share, then **Add to Home Screen**.
- Android: open in Chrome and choose **Install app** or **Add to Home screen**.

## Data model

- `courses`: public and user-imported course profiles
- `course_holes`: tee-level hole data
- `rounds`: one row per round, including a snapshot of metric settings
- `hole_results`: one row per hole
- `user_settings`: the user's current metric toggles

The round stores a settings snapshot so changing preferences later does not alter the meaning of prior rounds.

## Next production improvements

- Email or passkey account upgrade to preserve anonymous data across a phone replacement
- Crop and perspective-correction tools before OCR
- Multiple tee rows from a single scorecard photo
- Course search and duplicate matching before import
- Round analytics dashboard and CSV export
- Optional scorecard image storage in a private Supabase Storage bucket

## Version 0.3 round features

Version 0.3 adds:

- Tee selection by course, including a manual/custom tee option
- Score-only playing partners with individual tee and playing-handicap selections
- Return-to-home and live scorecard buttons during a round
- Simplified group scorecard and detailed metric scorecard
- Deletion of in-progress and completed rounds
- Round-specific manual overrides for par, yardage, and hole handicap

Existing Supabase projects must run `supabase/migration_v2_round_features.sql` once before deploying this version.

## v0.5 tee database

RoundWise now stores tee-level par, total yardage, course rating, and slope in a dedicated `course_tees` table. The bundled reference includes multiple tee options for 15 detailed Denver-area courses. Hole-level data remains tee-specific and is only prefilled when verified for that exact tee.


## v0.6 scorecard and multiplayer enhancements

- Individual tee and playing handicap for every golfer
- Gross/net score toggle using the saved playing handicap and hole stroke index
- Traditional scorecard symbols: circles for under par and squares for over par
- Live cumulative score to par while entering a round
- Icon-only RoundWise scorecard header with course and player metadata
- Total made-putt feet, separate scoring-zone results, five method-category rates, up-and-down percentage, tee-shot distribution, and summarized notes
- Details matrix with metrics fixed on the left and holes across the top

Existing Supabase projects must run `supabase/migration_v4_player_handicap_tees.sql` before using v0.6 cloud sync.
