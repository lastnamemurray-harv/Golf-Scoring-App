# RoundWise v0.4 Update

This release applies the RoundWise brand identity and adds performance analytics and round insights.

## Added

- RoundWise shield mark, app icons, wordmark treatment and brand colors.
- Mobile home dashboard aligned with the RoundWise brand system.
- Analytics tab with selectable Last 5, Last 10 and All-round views.
- Score-to-par trend chart.
- Aggregate fairway, GIR, scoring-zone, method, short-putt and putting metrics.
- Hole-outcome distribution.
- Recurring strength and opportunity identification.
- New Summary tab for completed and in-progress rounds.
- Automatic “What went well,” “What cost strokes,” and next-round priority sections.
- Best-hole and costliest-hole highlights.
- Completed rounds now open directly to the summary screen after finishing.

## Deployment

No Supabase database migration is required for v0.4. Analytics are calculated from the existing `rounds` and `hole_results` records.

Upload the contents of this project to the existing GitHub repository and commit to `main`. Cloudflare should deploy automatically using the current build settings.

After deployment, fully close and reopen the installed home-screen app so the new service worker and icon assets activate.
