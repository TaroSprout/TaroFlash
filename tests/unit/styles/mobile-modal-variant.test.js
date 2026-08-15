import { describe, test, expect } from 'vite-plus/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const CSS_PATH = resolve(process.cwd(), 'src/styles/mobile-modal-variant.css')
const css = readFileSync(CSS_PATH, 'utf-8')

/**
 * Pulls the width-axis media/attribute-selector tiers out of a
 * `@custom-variant <name> { ... }` block, dropping comments so the two
 * variants can be compared on structure alone. `mobile-modal` also carries a
 * height-axis half that `mobile-modal-flush` doesn't have, so this stops at
 * the first `(height` media query.
 */
function widthTiers(variant_name) {
  const block_start = css.indexOf(`@custom-variant ${variant_name} {`)
  if (block_start === -1) throw new Error(`@custom-variant ${variant_name} not found`)

  const after_open = css.indexOf('{', block_start) + 1
  const height_axis_start = css.indexOf('@media (height', after_open)
  const block_end = height_axis_start === -1 ? css.lastIndexOf('}') : height_axis_start

  return css
    .slice(after_open, block_end)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

describe('mobile-modal-variant.css — mobile-modal-flush width tiers [obligation]', () => {
  test('duplicate the width tiers of mobile-modal verbatim', () => {
    expect(widthTiers('mobile-modal-flush')).toBe(widthTiers('mobile-modal'))
  })
})
