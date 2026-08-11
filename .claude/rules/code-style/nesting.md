# At most one level of nesting

**`max-depth` in `vite.config.ts`'s `lint.rules` enforces this** — `vp lint` warns past depth 2.
Still `warn`, not `error`: 14 pre-existing sites haven't been cleared, and this rule's owner can't
touch source to clear them.

When a path forks, invert the condition and return early instead of pushing the main path inside an
`if`.

```ts
// Good — orchestrator routes; each branch is its own one-job function
async function save(id: number, values: Partial<Card>) {
  const entry = list.findEntryByCardId(id)

  if (entry && entry.real_id === null) return insertTemp(id, entry, values)

  const card = entry?.card ?? list.findCard(id)
  if (!card) return

  return saveExisting(card, values)
}
```
