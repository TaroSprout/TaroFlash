import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const { mockPlayer } = vi.hoisted(() => ({
  mockPlayer: {
    setup: vi.fn(() => Promise.resolve()),
    setVolumeConfig: vi.fn(),
    previewVolumeConfig: vi.fn(),
    resetSettings: vi.fn()
  }
}))

vi.mock('@/sfx/player', () => ({ default: mockPlayer }))

vi.mock('@/utils/member/preferences', () => ({
  toBusVolumes: vi.fn((audio) => ({ interface: audio.interface_volume, hover: audio.hover_volume }))
}))

const { setupAudio, applyMemberVolumes, previewMemberVolumes, discardVolumePreview } =
  await import('@/sfx/volume-seam')

describe('volume-seam', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('setupAudio delegates to player.setup', async () => {
    await setupAudio()
    expect(mockPlayer.setup).toHaveBeenCalledOnce()
  })

  test("applyMemberVolumes commits the member's saved levels via setVolumeConfig", () => {
    applyMemberVolumes({ interface_volume: 4, hover_volume: 3 })
    expect(mockPlayer.setVolumeConfig).toHaveBeenCalledWith({ interface: 4, hover: 3 })
  })

  test('previewMemberVolumes applies without committing via previewVolumeConfig', () => {
    previewMemberVolumes({ interface_volume: 2, hover_volume: 1 })
    expect(mockPlayer.previewVolumeConfig).toHaveBeenCalledWith({ interface: 2, hover: 1 })
    expect(mockPlayer.setVolumeConfig).not.toHaveBeenCalled()
  })

  test('discardVolumePreview falls back to the committed baseline via resetSettings', () => {
    discardVolumePreview()
    expect(mockPlayer.resetSettings).toHaveBeenCalledOnce()
  })
})

// ── the player is only ever reached through this seam ───────────

describe('src/sfx/player.ts is imported nowhere outside src/sfx/', () => {
  test('no source file outside src/sfx/ imports @/sfx/player or a relative path to it', () => {
    const src_root = join(process.cwd(), 'src')
    const offenders = []

    function walk(dir) {
      for (const entry of readdirSync(dir)) {
        const full_path = join(dir, entry)
        const stat = statSync(full_path)

        if (stat.isDirectory()) {
          walk(full_path)
          continue
        }
        if (!/\.(ts|vue|js)$/.test(entry)) continue

        const rel_path = relative(src_root, full_path)
        if (rel_path.startsWith(join('sfx'))) continue

        const contents = readFileSync(full_path, 'utf-8')
        if (/from\s+['"](@\/sfx\/player|\.\.?\/.*sfx\/player)['"]/.test(contents)) {
          offenders.push(rel_path)
        }
      }
    }

    walk(src_root)

    expect(offenders).toEqual([])
  })
})
