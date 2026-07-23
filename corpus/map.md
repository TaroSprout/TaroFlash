# Corpus Map

Root index of every topic. One line each: `[[id]] — hook`. ⚠️ marks a topic that
documents a [system hole](./hazards.md).
See [CONTRIBUTING](./CONTRIBUTING.md) for how the corpus works.

## authz

- [[permissions]] — named `can_` checks; the server is the real boundary; widening one ripples everywhere ⚠️

## cards

- [[cards]] — front/back units; server-picked ordering number; duplicates flagged not blocked ⚠️

## decks

- [[decks]] — one owner, one public/private switch; public means read-only, not shared study ⚠️

## feedback

- [[feedback]] — a curated public wall; posts stay hidden until a moderator publishes them ⚠️

## media

- [[media]] — files vs. the notes that keep them alive; lazy hourly cleanup ⚠️
- [[audio-generation]] — a durable step-chain turns a lesson recording into a transcript ⚠️

## members

- [[members]] — the account behind everything; ownership stamped from whoever's asking ⚠️

## pacing

- [[pacing]] — per-deck dials; follow a preset or pin a dial; a pin is presence, not difference ⚠️

## scheduling

- [[scheduling]] — FSRS decides when each card returns; the math runs on the client, not the server ⚠️

## study

- [[study]] — the session run over a merged pile; reviews save as you go ⚠️

## theming

- [[theming]] — colors are roles, not shades; three switches reslot the whole screen ⚠️

## architecture

- [[data-flow]] — server data is a named cache; a write owns marking its own data stale ⚠️
