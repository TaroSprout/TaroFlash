import { describe, test, expect, beforeAll } from 'vite-plus/test'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { compile } from 'tailwindcss'

const CSS_PATH = resolve(process.cwd(), 'src/styles/custom-variants.css')

/** Resolves `@import`s the same way Vite does: `tailwindcss` to its package entry, everything else relative to the importing file. */
async function loadStylesheet(id, base) {
  const resolved =
    id === 'tailwindcss'
      ? resolve(process.cwd(), 'node_modules/tailwindcss/index.css')
      : resolve(base, id)
  return { path: resolved, base: dirname(resolved), content: readFileSync(resolved, 'utf-8') }
}

let built

beforeAll(async () => {
  const source = readFileSync(CSS_PATH, 'utf-8')
  // A minimal `bgx-slide` utility standing in for the real one in bg-utils.css — this
  // test is scoped to what custom-variants.css gates, not the pattern's own contents.
  const css = `@import 'tailwindcss';\n${source}\n@utility bgx-slide { animation: none; }`
  const compiled = await compile(css, { base: process.cwd(), loadStylesheet })
  built = compiled.build(['motion-rich:bgx-slide'])
})

describe('custom-variants.css — motion-rich', () => {
  test('gates bgx-slide behind data-motion !== minimal and no-preference reduced motion', () => {
    expect(built).toMatch(
      /\.motion-rich\\:bgx-slide\s*{\s*@media \(prefers-reduced-motion: no-preference\) {\s*:root:not\(\[data-motion='minimal'\]\) & {\s*animation: none;/
    )
  })
})
