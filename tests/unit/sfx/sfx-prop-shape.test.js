import { describe, test, expect } from 'vite-plus/test'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// ── the `sfx` prop is one shape across ui-kit and layout-kit ────

function listVueFiles(dir) {
  const files = []

  for (const entry of readdirSync(dir)) {
    const full_path = join(dir, entry)
    const stat = statSync(full_path)

    if (stat.isDirectory()) {
      files.push(...listVueFiles(full_path))
      continue
    }
    if (entry.endsWith('.vue')) files.push(full_path)
  }

  return files
}

const kit_root = join(process.cwd(), 'src', 'components')
const ui_kit_files = listVueFiles(join(kit_root, 'ui-kit'))
const layout_kit_files = listVueFiles(join(kit_root, 'layout-kit'))
const all_files = [...ui_kit_files, ...layout_kit_files]

describe('sfx prop shape across ui-kit and layout-kit', () => {
  test('every declared `sfx?:` prop is typed SfxOptions, never a bespoke shape', () => {
    const offenders = []

    for (const file of all_files) {
      const contents = readFileSync(file, 'utf-8')
      const match = contents.match(/sfx\?:\s*([A-Za-z_][\w]*)/)
      if (match && match[1] !== 'SfxOptions') offenders.push(relative(kit_root, file))
    }

    expect(offenders).toEqual([])
  })

  test('no ui-kit/layout-kit primitive declares a `silent` boolean prop alongside sfx', () => {
    const offenders = []

    for (const file of all_files) {
      const contents = readFileSync(file, 'utf-8')
      if (/\bsilent\??:\s*boolean/.test(contents)) offenders.push(relative(kit_root, file))
    }

    expect(offenders).toEqual([])
  })

  test('no ui-kit/layout-kit primitive declares a second sound-shaped prop beside `sfx` (e.g. `xxx_sfx`)', () => {
    const offenders = []

    for (const file of all_files) {
      const contents = readFileSync(file, 'utf-8')
      const has_sfx = /\bsfx\?:\s*SfxOptions/.test(contents)
      const has_second_sfx_prop = /\b\w+_sfx\??:\s*(SfxRole|SoundKey|string)/.test(contents)
      if (has_sfx && has_second_sfx_prop) offenders.push(relative(kit_root, file))
    }

    expect(offenders).toEqual([])
  })
})
