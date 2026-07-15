# Update RoundWise to v0.6

1. In Supabase, open **SQL Editor → New query**.
2. Paste and run `supabase/migration_v4_player_handicap_tees.sql` using **Run and enable RLS**.
3. Upload the contents of this project to the root of the GitHub repository and commit to `main`.
4. Allow Cloudflare to build and deploy the new commit.
5. Completely close and reopen the installed PWA after deployment.

The migration adds one JSONB field to hole results so each golfer's selected tee can preserve its hole par, yardage, and stroke index. Existing rounds are preserved and normalized automatically.
