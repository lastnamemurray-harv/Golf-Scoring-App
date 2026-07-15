# Update RoundWise to v0.5

1. Run `supabase/migration_v3_course_tees.sql` in the Supabase SQL Editor.
2. Upload the project contents to the root of your GitHub repository and commit to `main`.
3. Allow Cloudflare to deploy the new commit.
4. Fully close and reopen the installed PWA.

The migration creates `course_tees`, adds tee snapshots to rounds, and seeds multiple tee options with par, yardage, rating, and slope. Existing rounds are preserved.
