---
id: card-limit-gate
domain: cards
status: current
hazard: false
related: [cards]
updated: 2026-08-08
---

# The per-deck card cap's error code

A free plan caps how many cards a deck can hold. The frontend checks this before
an insert so the UI can show an upgrade prompt instantly, but the real boundary
lives in the database — `enforce_deck_card_limit` rejects the write regardless of
what the client believed.

## A custom SQLSTATE turns the rejection into a real 402 [K:card-limit-custom-errcode]

The database raises the custom code `PT402`, not a generic constraint violation.
PostgREST reads the `PT` prefix as its own "HTTP status" convention, so the
client sees an actual `402 Payment Required` response rather than a generic
`400`/`23514` it would have to interpret. The digits are chosen to stay clear of
`P0001`, Postgres's own retry-prone default error class.
