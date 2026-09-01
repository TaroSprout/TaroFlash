import { describe, test, expect } from 'vite-plus/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// jsdom never evaluates @media, so the gutter's width-gated rule can only be
// checked by reading the component's own <style> block text.
const SFC_PATH = resolve(process.cwd(), 'src/components/layout-kit/scroll-region/index.vue')
const sfc = readFileSync(SFC_PATH, 'utf-8')

const THEME_CSS_PATH = resolve(process.cwd(), 'src/styles/main.css')
const theme_css = readFileSync(THEME_CSS_PATH, 'utf-8')

function styleBlock() {
  const start = sfc.indexOf('<style')
  const open = sfc.indexOf('>', start) + 1
  const end = sfc.indexOf('</style>', open)
  return sfc.slice(open, end)
}

describe('scroll-region/index.vue — gutter width gate', () => {
  test('the base .scroll-region rule leaves --scroll-gutter at 0', () => {
    const style = styleBlock()
    const base_rule_start = style.indexOf('.scroll-region {')
    const base_rule_end = style.indexOf('}', base_rule_start)
    const base_rule = style.slice(base_rule_start, base_rule_end)

    expect(base_rule).toMatch(/--scroll-gutter:\s*0(px)?;/)
  })

  test('the 2rem gutter sits behind a media query requiring both pointer:fine and a min-width', () => {
    const style = styleBlock()
    const media_start = style.indexOf('@media (pointer: fine)')
    expect(media_start).toBeGreaterThan(-1)

    const media_open = style.indexOf('{', media_start)
    const media_line = style.slice(media_start, media_open)
    expect(media_line).toContain('pointer: fine')
    expect(media_line).toMatch(/min-width:\s*[\d.]+rem/)

    const media_block_end = style.indexOf('}', media_open)
    const media_body = style.slice(media_open, media_block_end)
    expect(media_body).toMatch(/--scroll-gutter:\s*2rem;/)
  })
})

describe('scroll-region/index.vue — the hand-written breakpoint agrees with the md variant', () => {
  test('the media query min-width matches --breakpoint-md in the theme config', () => {
    const style = styleBlock()
    const min_width_match = style.match(/min-width:\s*([\d.]+rem)/)
    expect(min_width_match).not.toBeNull()

    const breakpoint_match = theme_css.match(/--breakpoint-md:\s*([\d.]+rem)/)
    expect(breakpoint_match).not.toBeNull()

    expect(min_width_match[1]).toBe(breakpoint_match[1])
  })
})
