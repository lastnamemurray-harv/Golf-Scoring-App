# RoundWise v0.12

- Added Hole in One poster override when score on a hole is exactly 1.
- Score posters now stay visible until the user taps the screen.
- Added a settings toggle to turn posters on or off.
- Existing poster logic remains:
  - 8 = Snowman
  - -3 or better to par = Albatross
  - -2 = Eagle
  - -1 = Birdie
  - 0 = Par
  - +1 = Bogey
  - +2 = Double Bogey
  - +3 or worse = Meltdown
- No Supabase migration required.
