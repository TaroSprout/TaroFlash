/**
 * Emits src/styles/palettes.gen.css from the palette registry.
 *
 * Run with `pnpm gen:palette-css` after editing
 * src/utils/palette/registry.ts, and commit the generated file.
 *
 * Deliberately NOT wired into the build pipeline: the output is committed, so a
 * build-time step would only add a way for CI to fail on a stale checkout.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { PALETTES, SEMANTIC_ALIASES } from '../src/utils/palette/registry.ts'

const OUT = fileURLToPath(new URL('../src/styles/palettes.gen.css', import.meta.url))

const HEADER = `/* GENERATED FILE — DO NOT EDIT.
 *
 * Source: src/utils/palette/registry.ts
 * Regenerate: pnpm gen:palette-css
 *
 * Accent roles owned by \`data-palette\`. They are disjoint from the neutral
 * roles owned by \`data-depth\` (src/styles/depth.css), so the two axes compose
 * without precedence rules.
 *
 * Each palette emits two blocks: the light rendition, and a dark rendition
 * scoped under \`data-mode='dark'\`. Both the descendant and the self form of the
 * dark selector are listed so the palette resolves whether \`data-palette\` sits
 * on a child of the moded root or on the root itself.
 *
 * Semantic aliases (\`danger\`, \`info\`, ...) join the selector list of the
 * palette they point at, so \`data-palette='danger'\` is valid markup and stays
 * a true alias — repointing it in the registry moves every call site at once.
 */
`

/** Every data-palette value that resolves to `palette`: the name plus its aliases. */
function paletteNames(palette: string): string[] {
  const aliases = Object.entries(SEMANTIC_ALIASES)
    .filter(([, target]) => target === palette)
    .map(([alias]) => alias)

  return [palette, ...aliases]
}

function block(prefixes: string[], palette: string, rendition: PaletteRendition): string {
  const selector = prefixes
    .flatMap((prefix) => paletteNames(palette).map((name) => `${prefix}[data-palette='${name}']`))
    .join(',\n')

  return [
    `${selector} {`,
    `  --color-accent: var(--color-${rendition.accent});`,
    `  --color-accent-muted: var(--color-${rendition.accentMuted});`,
    `  --color-on-accent: var(--color-${rendition.onAccent});`,
    `}`
  ].join('\n')
}

const blocks = Object.entries(PALETTES).flatMap(([name, definition]) => [
  block([''], name, definition.light),
  block(["[data-mode='dark'] ", "[data-mode='dark']"], name, definition.dark)
])

writeFileSync(OUT, `${HEADER}\n${blocks.join('\n\n')}\n`)

console.log(`Wrote ${Object.keys(PALETTES).length * 2} blocks to ${OUT}`)
