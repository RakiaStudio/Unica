---
'@rakiastudio/unica': minor
---

Add the `expert` sudoku difficulty: naked and hidden quads, swordfish,
skyscraper, 2-string kite, xy-wing and xyz-wing, tried after x-wing in that
fixed order. `generate({ difficulty: 'expert' })` is now accepted.

A puzzle that 0.2 rated `beyond` can now be rated `expert`; if you store
ratings, a stored `beyond` may now mean `expert`. Ratings of `easy`, `medium`
and `hard` are unchanged, and `generate({ seed, difficulty })` returns the same
puzzle as in 0.2.0 for those levels: new techniques are only ever added as a
new level above the existing ones (ADR-0003).
