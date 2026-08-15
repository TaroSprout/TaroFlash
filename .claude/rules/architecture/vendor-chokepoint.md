---
lastUpdated: 2026-08-13T00:00:00Z
paths:
  - 'src/**/*.{ts,vue}'
---

# Third-party SDKs get one chokepoint composable

**Owns how a third-party SDK is wired into the app.**

A third-party analytics/tracking SDK (Plausible, and the next one) is reached only through a single
app-owned composable — `useTracking()` for tracking. Routers, views, and components call the
composable and name what happened; the composable is the only file that imports the vendor module.
Swapping or adding a provider then touches one file, not every call site.

```ts
// Bad — router imports the vendor SDK directly
import { trackPageview } from '@/utils/analytics/plausible'

// Good — router calls the chokepoint; only it imports the vendor module
import { useTracking } from '@/composables/tracking'
const { trackPageview } = useTracking()
```

Keep the composable small until a second provider actually lands — this is the chokepoint, not the
place to build out a provider-abstraction layer speculatively ([`architecture/utils`](./utils.md)).
Naming the vendor inside that one file is fine; call sites and the composable's own exports stay
vendor-neutral — [`code-style/signatures`](../code-style/signatures.md).
