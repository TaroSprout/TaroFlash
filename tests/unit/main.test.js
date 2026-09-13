import { describe, test, expect } from 'vite-plus/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// main.ts mounts the app as a side effect of import, so this reads the
// source rather than executing it — the same static-content approach
// tests/unit/styles/custom-variants.test.js uses for its own boot file.
const SOURCE = readFileSync(resolve(process.cwd(), 'src/main.ts'), 'utf-8')

describe('main.ts boot', () => {
  test('never references the retired startup animation warm-up', () => {
    expect(SOURCE).not.toMatch(/warmupAnimations|animations\/warmup/)
  })
})
