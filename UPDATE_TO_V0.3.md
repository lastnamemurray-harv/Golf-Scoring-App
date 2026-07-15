# Update an existing Golf Scorecard deployment to v0.3

## 1. Update Supabase first

Open Supabase > SQL Editor > New query.
Copy and run all SQL from:

`supabase/migration_v2_round_features.sql`

This adds the database fields used for score-only playing partners. It does not delete existing rounds.

## 2. Update GitHub

Unzip the v0.3 project. Open the extracted folder and upload its contents to the root of the existing GitHub repository.

Required top-level items include:

- `src/`
- `public/`
- `supabase/`
- `package.json`
- `package-lock.json`
- `wrangler.jsonc`
- `.npmrc`
- `.nvmrc`

Do not upload `node_modules/` or `dist/`.

When GitHub asks about files with the same names, allow the new versions to replace them. Commit directly to `main` with a message such as:

`Add tee selection, group scorecard, round deletion and hole overrides`

## 3. Let Cloudflare redeploy

The GitHub commit should start a Cloudflare build automatically. Keep the existing Cloudflare settings:

- `NODE_VERSION=22.16.0`
- `SKIP_DEPENDENCY_INSTALL=true`
- Build: `npm install --no-audit --no-fund --progress=false && npm run build`
- Deploy: `npx wrangler deploy`

## 4. Refresh the installed app

Open the workers.dev site and refresh. If the app is installed on your home screen, close it completely and reopen it. A second reopen can be necessary while the service worker activates the update.
