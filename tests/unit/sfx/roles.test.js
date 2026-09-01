import { describe, test, expect } from 'vite-plus/test'
import { ROLES, roleDef } from '@/sfx/roles'

describe('roleDef', () => {
  test('returns the role definition for a known role', () => {
    expect(roleDef('ui.press')).toEqual(ROLES['ui.press'])
  })

  test('every role name is namespace.intent shaped', () => {
    for (const role of Object.keys(ROLES)) {
      expect(role).toMatch(/^[a-z-]+\.[a-z-]+$/)
    }
  })

  test('a role whose sound is an array carries at least one sound', () => {
    for (const def of Object.values(ROLES)) {
      if (Array.isArray(def.sound)) expect(def.sound.length).toBeGreaterThan(0)
    }
  })

  test('ui.hover resolves to the hover bus', () => {
    expect(roleDef('ui.hover').bus).toBe('hover')
  })

  test('ui.rejected carries its own debounce, separate from the shared player debounce', () => {
    expect(roleDef('ui.rejected').debounce).toBeGreaterThan(0)
  })

  // ── phone.open / phone.close / phone.app-focus ──────────────

  test('phone.open resolves to pop_window', () => {
    expect(roleDef('phone.open').sound).toBe('pop_window')
  })

  test('phone.close resolves to pop_window', () => {
    expect(roleDef('phone.close').sound).toBe('pop_window')
  })

  test('phone.app-focus resolves to pop_drip_mid on the hover bus', () => {
    expect(roleDef('phone.app-focus').sound).toBe('pop_drip_mid')
    expect(roleDef('phone.app-focus').bus).toBe('hover')
  })

  // ── dialog.open-chime ────────────────────────────────────────

  test('dialog.open-chime resolves to wooden_chime_ring', () => {
    expect(roleDef('dialog.open-chime').sound).toBe('wooden_chime_ring')
  })

  // ── card.saved / file.accepted / dialog.confirm retired ──────

  test('card.saved resolves to success_3', () => {
    expect(roleDef('card.saved').sound).toBe('success_3')
  })

  test('file.accepted resolves to music_plink_ok', () => {
    expect(roleDef('file.accepted').sound).toBe('music_plink_ok')
  })

  test('dialog.confirm is not a defined role — the file/card-saved cues replaced it', () => {
    expect(Object.keys(ROLES)).not.toContain('dialog.confirm')
  })

  // ── session.intro chime, restored after the role rename regression ──

  test('session.intro resolves to music_plink_chordyes', () => {
    expect(roleDef('session.intro').sound).toBe('music_plink_chordyes')
  })

  test('session.intro and nav.page-forward resolve to different sounds', () => {
    expect(roleDef('session.intro').sound).not.toBe(roleDef('nav.page-forward').sound)
  })
})
