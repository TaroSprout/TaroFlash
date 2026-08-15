---
lastUpdated: 2026-08-08T00:00:00Z
paths:
  - 'CLAUDE.md'
  - '.claude/**/*.md'
  - 'corpus/**/*.md'
  - 'README.md'
---

# Authoring

**Owns the five principles every written artifact obeys** — a rule, a ticket, a corpus topic, a
test, a commit message, a code comment, a reply. The sibling `*-authoring` specs add what is
specific to their artifact and link here for these five; none of them restates one.

- **Delete-test.** Remove the sentence. If no future decision changes, it stays removed. Rationale,
  restatement, and throat-clearing all fail it.
  - Bad: `Invalidate the query key after a mutation. Stale caches are a common source of bugs.`
  - Good: `Invalidate the query key after a mutation.`
- **Say it once.** One fact, one home. Every other place that needs it links there — a second copy
  is a second thing to update, and the two disagree within a month.
  - Bad: a migration rule repeated in the ticket, the commit, and the code comment.
  - Good: stated in `supabase.md`; the other three link it.
- **No hedging.** Cut `consider`, `generally`, `where possible`, `try to`, and `or`/`either`
  alternatives. A hedge is an unresolved decision wearing a hat — resolve it or mark it open.
  - Bad: `Consider extracting the fetch, or leave it inline if the component is small.`
  - Good: `Extract the fetch into a composable.`
- **Concrete over abstract.** Values, mechanisms, and exact names, in the line itself. A competence
  claim is not a specification.
  - Bad: `Retries the save appropriately and handles failures.`
  - Good: `Retries the save 3× at 0.5s / 1s / 2s, then marks it failed.`
- **Label a guess.** State what you verified plainly. Anything unverified is marked as such, at the
  point of the claim — never smuggled in beside confirmed facts. A comment or code hedging that
  something _can_ happen is not evidence it _has_ — don't upgrade a hedge into a finding without
  confirming the live value.
  - Bad: `The dashboard refetches because the key includes the member id.`
  - Good: `⚠️ Hunch — not code-confirmed: the refetch likely comes from the member id in the key.`
  - Bad: a comment says a display count "can drift" from the enforced limit → reported as a known
    pricing-page defect, unconfirmed.
  - Good: read the enforced limit from the current migration state before claiming the two disagree.
  - Bad: a locale key names a feature (`roadmap.item.card-audio`, "Card Audio Upload") → reported as
    shipped, because copy exists for it.
  - Good: read the code that gates or renders the feature (a `done` flag, a `can_` check, a route)
    before claiming it ships — authored copy proves a string was written, nothing about the feature.
  - Bad: "nothing plays a sound on open anywhere in the app" — stated after reading only the files
    where the seam was expected to live.
  - Good: `grep -rn` the mechanism (e.g. `emitSfx`) across the whole tree before asserting a
    universal absence — reading the expected files rules out only those files, not the codebase.
