---
lastUpdated: 2026-09-11T00:00:00Z
paths:
  - 'tests/**/*'
  - 'vite.config.ts'
  - 'supabase/functions/**/*.test.ts'
---

# Test integrity

**Owns conflicts, incorrect assertions, and redundant coverage across a batch of changed test
files** — read relationally, against each other and against the source, not line by line. Read by
`review-work`'s `test-integrity` concern over a diff's full changed test files; the hub
[`test-authoring`](../test-authoring.md) owns everything about writing one test in isolation.

## Cross-test conflicts

- Two changed tests asserting different expected values for the same behavior, input, or code path
  is a conflict — name both files and the contradiction; the fix corrects whichever side disagrees
  with the source's actual contract, never both left standing.

## Assertion correctness

- An assertion that contradicts what the source under test actually does fails, regardless of which
  test landed first or which branch wrote it — read the source, not the sibling test, to decide which
  side is wrong.
- An assertion that would pass for more than one real outcome (a broad match standing in for the
  specific value under test, a check the exercised code path can't actually fail) manufactures
  coverage without catching the behavior — flag it, especially when another changed test in the same
  batch already asserts the same path concretely.

## Redundant coverage

- Two changed tests exercising the identical path and input with equivalent assertions are redundant
  — collapse to one, or require the newer one to name the distinct case (an edge value, an error
  branch, a different starting state) it actually adds.
