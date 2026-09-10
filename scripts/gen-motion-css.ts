/**
 * Emits src/styles/motion.gen.css from the motion vocabulary.
 *
 * Run with `pnpm gen:motion-css` after editing
 * src/utils/motion/vocabulary.ts, and commit the generated file.
 *
 * Deliberately NOT wired into the build pipeline: the output is committed, so a
 * build-time step would only add a way for CI to fail on a stale checkout.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { DURATIONS, EASINGS, TRAVEL } from '../src/utils/motion/vocabulary.ts'

const OUT = fileURLToPath(new URL('../src/styles/motion.gen.css', import.meta.url))

const HEADER = `/* GENERATED FILE — DO NOT EDIT.
 *
 * Source: src/utils/motion/vocabulary.ts
 * Regenerate: pnpm gen:motion-css
 *
 * Durations and easings land in \`@theme\` so Tailwind exposes them as the
 * \`duration-*\` and \`ease-*\` utilities markup already uses. Travel distances
 * land in \`:root\` instead — they back \`var(--travel-*)\` reads, not a native
 * utility, so they stay out of the theme namespace.
 */
`

const durationLines = Object.entries(DURATIONS).map(
  ([ms, value]) => `  --duration-${ms}: ${value.ms}ms;`
)

const easingLines = Object.entries(EASINGS).map(([name, ease]) => `  --ease-${name}: ${ease.css};`)

const travelLines = Object.entries(TRAVEL).map(([px, value]) => `  --travel-${px}: ${value}px;`)

const theme = ['@theme {', ...durationLines, '', ...easingLines, '}'].join('\n')
const root = [':root {', ...travelLines, '}'].join('\n')

writeFileSync(OUT, `${HEADER}\n${theme}\n\n${root}\n`)

// eslint-disable-next-line no-console -- codegen CLI: status line is the intended output
console.log(
  `Wrote ${durationLines.length} durations, ${easingLines.length} easings, ${travelLines.length} travel steps to ${OUT}`
)
