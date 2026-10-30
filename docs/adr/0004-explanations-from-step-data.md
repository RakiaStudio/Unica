# ADR-0004: Build explanations from step data, one locale per language

Status: accepted (2026-10-30)

## Context

Until 0.3.0 a rating step carried its explanation only as an English sentence
(`reason`). An app in another language could not explain steps without parsing
those sentences, and the sentence was the only record of which row, column or
box a step was based on.

## Decision

Every step carries what it was based on as data, `Step.detail`: the pattern,
the units, the cells and the values involved. A `Locale` turns a detail into a
sentence, and `explain(text, { locale })` picks one. English (`'en'`, the
default) and Japanese (`'ja'`) ship with the package. Any other language is a
`Locale` object written by the caller; nothing else is bundled.

A locale builds each sentence with a function per pattern, not with a string
template. Word order, plural forms and list punctuation differ between
languages ("1, 2 and 3" against 「1、2、3」), and a template cannot express that.

`reason` stays, and it is what the English locale builds from `detail`. A test
checks that the English locale rebuilds `reason` exactly for every step, and
the explain output pinned against the published 0.2.0 (ADR-0003) is unchanged.
So existing callers see the same text, and the data and the sentence cannot
drift apart.

Japanese names say what a pattern means instead of transliterating the
English term (for example 「ここだけ」 for hidden single, 「2本の柱」 for
skyscraper). Cells are written 「3行5列」 and boxes 「ブロック」, numbered left
to right, top to bottom. Internal technique names (`'hidden single'` and so on)
stay English, so code that compares them is unaffected.

Error messages (`ExactCoverError`) stay English: they are for developers, and
they name indices rather than explain a puzzle.

## Consequences

- Adding a technique means adding its sentence to every bundled locale, and a
  caller's own locale gets a type error until it handles the new pattern.
- Locales live in `src/puzzles/sudoku/`; `src/core/` stays puzzle-agnostic.
- No dependency on an i18n library: a locale is a plain object.
