/**
 * Emits src/styles/identities.gen.css from the identity registry.
 *
 * Run with `pnpm gen:identity-css` after editing
 * src/utils/identity/registry.ts, and commit the generated file.
 *
 * Deliberately NOT wired into the build pipeline: the output is committed, so a
 * build-time step would only add a way for CI to fail on a stale checkout.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { IDENTITIES, SEMANTIC_IDENTITIES } from '../src/utils/identity/registry.ts'

const OUT = fileURLToPath(new URL('../src/styles/identities.gen.css', import.meta.url))

const HEADER = `/* GENERATED FILE — DO NOT EDIT.
 *
 * Source: src/utils/identity/registry.ts
 * Regenerate: pnpm gen:identity-css
 *
 * Identity roles owned by \`data-palette\`. They are disjoint from the neutral
 * roles owned by \`data-depth\` (src/styles/depth.css), so the two axes compose
 * without precedence rules.
 *
 * Each identity emits two blocks: the light rendition, and a dark rendition
 * scoped under \`data-mode='dark'\`. Both the descendant and the self form of the
 * dark selector are listed so the palette resolves whether \`data-palette\` sits
 * on a child of the moded root or on the root itself.
 *
 * Semantic aliases (\`danger\`, \`info\`, ...) join the selector list of the
 * identity they point at, so \`data-palette='danger'\` is valid markup and stays
 * a true alias — repointing it in the registry moves every call site at once.
 */
`

/** Every data-palette value that resolves to `identity`: the name plus its aliases. */
function paletteNames(identity: string): string[] {
  const aliases = Object.entries(SEMANTIC_IDENTITIES)
    .filter(([, target]) => target === identity)
    .map(([alias]) => alias)

  return [identity, ...aliases]
}

function block(prefixes: string[], identity: string, rendition: IdentityRendition): string {
  const selector = prefixes
    .flatMap((prefix) => paletteNames(identity).map((name) => `${prefix}[data-palette='${name}']`))
    .join(',\n')

  return [
    `${selector} {`,
    `  --color-accent: var(--color-${rendition.accent});`,
    `  --color-accent-muted: var(--color-${rendition.accentMuted});`,
    `  --color-on-accent: var(--color-${rendition.onAccent});`,
    `}`
  ].join('\n')
}

const blocks = Object.entries(IDENTITIES).flatMap(([name, definition]) => [
  block([''], name, definition.light),
  block(["[data-mode='dark'] ", "[data-mode='dark']"], name, definition.dark)
])

writeFileSync(OUT, `${HEADER}\n${blocks.join('\n\n')}\n`)

console.log(`Wrote ${Object.keys(IDENTITIES).length * 2} blocks to ${OUT}`)
