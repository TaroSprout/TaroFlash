import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vite-plus/test'
import plugin from '../../../../scripts/lint-rules/compositor-only.js'

const rule = plugin.rules['no-layout-tween']

let dir

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'compositor-only-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

/** Runs the rule against `source` written to a real file (it reads from disk), returning reports. */
function lint(source, { filename = join(dir, 'motion.ts') } = {}) {
  mkdirSync(dirname(filename), { recursive: true })
  writeFileSync(filename, source)
  const reports = []
  const listeners = rule.create({ filename, report: (r) => reports.push(r) })
  listeners.Program?.()
  return reports
}

describe('compositor-only/no-layout-tween', () => {
  test('flags gsap.to with a forbidden layout key', () => {
    const reports = lint(`gsap.to(el, { height: 10, duration: 1 })`)
    expect(reports).toHaveLength(1)
    expect(reports[0].message).toContain("'height'")
  })

  test('flags gsap.from with a forbidden layout key', () => {
    const reports = lint(`gsap.from(el, { width: 0, duration: 1 })`)
    expect(reports).toHaveLength(1)
    expect(reports[0].message).toContain("'width'")
  })

  test('flags gsap.fromTo with a forbidden filter key', () => {
    const reports = lint(`gsap.fromTo(el, { filter: 'blur(4px)' }, { filter: 'blur(0)' })`)
    expect(reports).toHaveLength(1)
    expect(reports[0].message).toContain("'filter'")
  })

  test('ignores gsap.set, an instant write rather than a tween', () => {
    const reports = lint(`gsap.set(el, { height: 10 })`)
    expect(reports).toHaveLength(0)
  })

  test('ignores Array.from, which merely shares the method name', () => {
    const reports = lint(`Array.from(items, (x) => ({ height: x }))`)
    expect(reports).toHaveLength(0)
  })

  test('resolves a call chained off gsap.timeline()', () => {
    const reports = lint(`
      gsap
        .timeline({ onComplete: cleanup })
        .to(el, { height: 10, duration: 1 }, 0)
    `)
    expect(reports).toHaveLength(1)
    expect(reports[0].message).toContain("'height'")
  })

  test('a sentence-ending period in a preceding comment never reads as a chain dot', () => {
    const reports = lint(`
      // One timeline, so the release waits for whichever tween runs longer.
      gsap
        .timeline({ onComplete: cleanup })
        .to(el, { height: 10, duration: 1 }, 0)
    `)
    expect(reports).toHaveLength(1)
    expect(reports[0].message).toContain("'height'")
  })

  test('exempts the stage primitive, the one allowed route for layout motion', () => {
    const filename = join(dir, 'components', 'layout-kit', 'stage', 'use-stage-height.ts')
    const reports = lint(`ctx.tl.fromTo(node, { height: from }, { height: target, duration: 1 })`, {
      filename
    })
    expect(reports).toHaveLength(0)
  })
})
