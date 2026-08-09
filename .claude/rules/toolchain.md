# Toolchain

**Scope: every command run in this repo.** Always in context — a session can shell out before it
reads a single file.

Project uses **Vite+** (`vp`), a unified toolchain wrapping Vite, Rolldown, Vitest, Oxlint, Oxfmt.
Always use `vp` — never `pnpm`, `npm`, `vitest`, `oxlint`, `oxfmt` directly.

## The type-check gate

CI's authoritative type-check is `pnpm type-check` (`vue-tsc --build --force`), and it is **stricter
than `vp check`** — `vp check` can report zero errors while `vue-tsc` fails. Run `pnpm type-check`
before pushing anything that touches types; a green `vp check` is not evidence.

## Never `pnpm`

- **`vp install` after any dependency bump.** Never `pnpm up` / `pnpm install` directly — pnpm
  rewrites the lockfile importer spec away from the `@latest` override, and CI's frozen-lockfile
  check then fails with "specifiers in the lockfile don't match specifiers in package.json".
- `pnpm type-check` is the sole exception, and only as the pre-push gate above.
- **Upgrade a tool rather than working around it.** If a CLI is too old for a feature we want, offer
  the upgrade — don't accumulate one-off `curl`/SQL workarounds. Work around only when upgrading is
  genuinely blocked, and say why.

## Imports

- Build/config utilities from `vite-plus`, not `vite`: `import { defineConfig } from 'vite-plus'`
- Test utilities from `vite-plus/test`, not `vitest`: `import { expect, test, vi } from 'vite-plus/test'`
- Don't install `vitest`, `oxlint`, `oxfmt`, `tsdown` — bundled in Vite+

## Spokes

- [`commands`](./toolchain/commands.md) — the full `vp` command list
