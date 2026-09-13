import { describe, test, expect, beforeAll } from 'vite-plus/test'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { compile } from 'tailwindcss'

const CSS_PATH = resolve(process.cwd(), 'src/styles/custom-variants.css')

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
  // Minimal `bgx-slide`/`fake-blur` stand in for the real utilities (bg-utils.css,
  // the theme's --blur-4 token) — scoped to what custom-variants.css gates, not
  // the pattern's contents.
  const css = `@import 'tailwindcss';\n${source}\n@utility bgx-slide { animation: none; }\n@utility fake-blur { backdrop-filter: blur(4px); }`
  const compiled = await compile(css, { base: process.cwd(), loadStylesheet })
  built = compiled.build(['motion-rich:bgx-slide', 'tier-full:fake-blur'])
})

describe('custom-variants.css — motion-rich', () => {
  test('gates bgx-slide behind data-motion !== minimal and no-preference reduced motion', () => {
    expect(built).toMatch(
      /\.motion-rich\\:bgx-slide\s*{\s*@media \(prefers-reduced-motion: no-preference\) {\s*:root:not\(\[data-motion='minimal'\]\) & {\s*animation: none;/
    )
  })
})

describe('custom-variants.css — tier-full', () => {
  test('gates fake-blur behind data-motion === full only, with no reduced-motion media query', () => {
    expect(built).toMatch(/\.tier-full\\:fake-blur\s*{\s*:root\[data-motion='full'\] & {/)
    // The whole point of the standing-effect gate: it must never fold in
    // prefers-reduced-motion the way motion-rich does above.
    expect(built).not.toMatch(/\.tier-full\\:fake-blur[\s\S]*prefers-reduced-motion/)
  })
})
