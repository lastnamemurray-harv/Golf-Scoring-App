# RoundWise v0.9 Update

## Included

- When Scoring Zone tracking is active, the primary score automatically equals Entering Target actual strokes plus Down Target actual strokes.
- The score remains editable. A manual edit is labeled as an override, with a one-tap option to return to the calculated score.
- Fairway is disabled in the tee-result grid on par 3 holes.
- FIR analytics continue to exclude all par 3 holes.
- Settings now include a default Round Focus field.
- The focus is prefilled during round setup, remains editable for that round, and is displayed at the bottom of every hole.
- Birdies trigger a temporary bird flyover after Save & Next.
- Eagles or better trigger a temporary eagle flyover after Save & Next.
- The Analytics header is vertically stacked to prevent the logo and heading from colliding on narrow screens.

## Deployment

No Supabase migration is required. The new focus preference is stored in the existing JSON metric-config field.

Upload the project contents to the root of the GitHub repository and commit to `main`. Cloudflare can use the existing build settings.
