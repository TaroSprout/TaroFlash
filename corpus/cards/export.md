---
id: card-export
domain: cards
status: current
hazard: false
related: [cards]
updated: 2026-08-10
---

# Card export

How a deck's cards leave the app as a file, and the shape an importer expects
to read back in.

Exporting a deck writes a plain-text file that tells an importer how to read
it, rather than leaving the reader to guess.

## Two directive lines, then one row per card [K:card-export-csv-format]

The file opens with two lines, `#separator:,` and `#html:false`, that an
importer reads as `#key:value` settings — so nobody using it is ever asked to
pick a separator by hand. The separator is written as the literal character,
not its name (`comma`): a spreadsheet sniffing the first line for a delimiter
needs an actual comma there, or it falls back to fixed-width guessing and
slices every row at the wrong columns. After those, one row per card follows
in the deck's own order, front then back.

The file is otherwise plain CSV (RFC 4180): a comma would start a new column
and a line break would start a new row, so any field carrying either is
wrapped in double quotes, with a quote inside that field written twice. Rows
are joined with `\r\n`.

## What travels, and what doesn't

Only the two sides of the card. Notes, images, and review history stay
behind — the file is the questions and answers, nothing else.

## What this isn't

- **Not the import path.** Reading this format back in is a parser of its
  own, landing in the same module later.
- **Not the card's identity.** How a card is created, ordered, or flagged as
  a duplicate is [[cards]]'s job.

## Related

[[cards]]
