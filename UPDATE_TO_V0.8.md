# Update RoundWise to v0.8

This update does not require a Supabase migration.

## Enhancements

- Green in regulation is calculated automatically as `(score - putts) <= (par - 2)`.
- Settings now include a configurable target-zone distance, defaulting to 100 yards.
- On-course scoring-zone prompts use the saved target-zone distance.
- Calculated hole results are grouped below Notes:
  - Enter point
  - Down point
  - GIR
  - Up and down
- The Details matrix and hole cards place calculated results after Notes.
- Existing users receive a 100-yard target-zone default automatically when their settings are loaded.

Upload the project contents to the existing GitHub repository and commit to `main`. Cloudflare will deploy automatically.
