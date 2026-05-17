# At most one level of nesting

Don't nest more than one `if` / `for` / `try`. When a path forks, invert the condition and return early instead of pushing the main path inside an `if`.

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
