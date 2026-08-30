import { describe, test, expect } from 'vite-plus/test'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// ── the fade is retired from every skeleton.vue ────────────────

function listSkeletonFiles(dir) {
  const files = []

  for (const entry of readdirSync(dir)) {
    const full_path = join(dir, entry)
    const stat = statSync(full_path)

    if (stat.isDirectory()) {
      files.push(...listSkeletonFiles(full_path))
      continue
    }
    if (entry === 'skeleton.vue') files.push(full_path)
  }

  return files
}

const views_root = join(process.cwd(), 'src', 'views')
const skeleton_files = listSkeletonFiles(views_root)

describe('skeleton.vue fade retirement', () => {
  test('finds at least one skeleton.vue under src/views/ to guard', () => {
    expect(skeleton_files.length).toBeGreaterThan(0)
  })

  test('no skeleton.vue under src/views/ references animate-pulse', () => {
    const offenders = []

    for (const file of skeleton_files) {
      const contents = readFileSync(file, 'utf-8')
      if (contents.includes('animate-pulse')) offenders.push(relative(views_root, file))
    }

    expect(offenders).toEqual([])
  })
})
