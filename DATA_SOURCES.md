# RoundWise course tee data

RoundWise v0.5 adds tee-level par, total yardage, course rating, and slope for 67 tee/rating combinations across 15 courses with publicly available scorecards.

The current hole-by-hole database remains verified for one default tee per detailed course. When another tee has only tee-total metadata, RoundWise shows the tee's par, total yardage, rating, and slope but leaves unverified hole yardages blank for review or manual entry.

## Public scorecard sources

- Foothills Golf Course — Championship 18
- The Meadows Golf Club
- Raccoon Creek Golf Course
- Arrowhead Golf Club
- South Suburban Golf Course — Regulation 18
- Lone Tree Golf Club
- Highlands Ranch Golf Club
- Broken Tee Golf Course — Championship 18
- Wellshire Golf Course
- Overland Park Golf Course
- City Park Golf Course
- Fossil Trace Golf Club
- Applewood Golf Course
- Evergreen Golf Course
- The Golf Club at Bear Dance

Source URLs are stored on each `course_tees` record and in the Supabase seed/migration files. Rating and slope can differ by gender from the same physical tee, so those records are labeled separately where the source scorecard provides separate values.
