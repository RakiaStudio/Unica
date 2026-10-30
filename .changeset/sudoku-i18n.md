---
'@rakiastudio/unica': minor
---

Explain sudoku ratings in other languages. Every step now carries `detail`,
what it was based on as data (pattern, units, cells, values), and
`explain(text, { locale })` builds sentences from it: `'en'` (default, the same
text as before) or `'ja'`, or a caller's own `Locale`. Ratings also count what
they used (`uses` per technique, `levels` per level), and `compareRatings`
orders ratings of the same difficulty without weights. See ADR-0004.
