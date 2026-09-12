---
lastUpdated: 2026-09-12T00:00:00Z
paths:
  - '**/*.ts'
  - '**/*.vue'
---

# Toolchain — imports & lint config

**Narrower than the [`toolchain`](../toolchain.md) hub on purpose:** the hub's scope is "every
command run in this repo," but these rules only bite while writing an import statement or a lint
rule, i.e. editing a `.ts`/`.vue` file — never when just running `vp` or `pnpm` commands.

## Imports

- Build/config utilities from `vite-plus`, not `vite`: `import { defineConfig } from 'vite-plus'`
- Test utilities from `vite-plus/test`, not `vitest`: `import { expect, test, vi } from 'vite-plus/test'`
- Don't install `vitest`, `oxlint`, `oxfmt`, `tsdown` — bundled in Vite+

## Lint

- **Configure lint rules only in `vite.config.ts`'s `lint` block.** `vp lint` silently ignores a root
  `.oxlintrc.json` — a rule set there never runs, `vp lint` still reports zero errors, and
  `./node_modules/.bin/oxlint` on the same file with the same config proves the gap
  (→[K:proxy-pass-not-evidence]).
- **Oxlint only sees a Vue SFC's `<script>` block.** The template is invisible to its AST — a rule
  reporting a position outside the script block is rejected outright — and an SFC with no `<script>`
  at all is never visited.
