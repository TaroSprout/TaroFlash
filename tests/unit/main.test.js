import { describe, test, expect } from 'vite-plus/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SOURCE = readFileSync(resolve(process.cwd(), 'src/main.ts'), 'utf-8') // importing main.ts would mount the app, so read the source instead

describe('main.ts boot', () => {
  test('never references the retired startup animation warm-up', () => {
    expect(SOURCE).not.toMatch(/warmupAnimations|animations\/warmup/)
  })
})
