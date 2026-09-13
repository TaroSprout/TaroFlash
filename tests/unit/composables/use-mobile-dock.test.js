import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { nextTick } from 'vue'
import { DEFAULT_BREAKPOINT, useMobileDock } from '@/components/mobile-dock/use-mobile-dock'
import { setBelowBreakpoint, resetBreakpointMedia } from '../../helpers/breakpoint-media-mock'
import { setKeyboardOpen } from '../../helpers/keyboard-open-mock'

// The dock's is_visible reads useKeyboardOpen — mock it so keyboard state is
// directly controllable per test.
vi.mock('@/composables/ui/keyboard', async () => {
  const m = await import('../../helpers/keyboard-open-mock')
  return m.keyboardOpenMockModule
})

// The dock compiles its own `w<<breakpoint>` queries — mock per-query so the
// claimed breakpoint and the flush breakpoint (`w<sm`) can be driven independently.
vi.mock('@/composables/ui/media-query', async () => {
  const m = await import('../../helpers/breakpoint-media-mock')
  return m.breakpointMediaMockModule
})

// Module-level singleton — el, breakpoint claims and the registered height owner
// persist across tests. Every claim made in a test is released in afterEach so the
// claim stack never leaks into the next test.
const releasers = []

// is_below_breakpoint is written from a watchEffect, which flushes on the next
// tick rather than synchronously — every mock mutation needs a tick before the
// dock's computed values reflect it.
async function setBelow(breakpoint, matches) {
  setBelowBreakpoint(breakpoint, matches)
  await nextTick()
}

async function openKeyboard(open) {
  setKeyboardOpen(open)
  await nextTick()
}

beforeEach(() => {
  const { el, setHeightOwner } = useMobileDock()
  el.value = null
  setHeightOwner(null)
  setKeyboardOpen(false)
  resetBreakpointMedia()
})

afterEach(() => {
  releasers.splice(0).forEach((release) => release())
})

function claim(breakpoint) {
  const { claimBreakpoint } = useMobileDock()
  const release = claimBreakpoint(breakpoint)
  releasers.push(release)
  return release
}

describe('useMobileDock', () => {
  describe('singleton', () => {
    test('repeated calls return the same el ref instance', () => {
      const a = useMobileDock()
      const b = useMobileDock()

      expect(a.el).toBe(b.el)
    })

    test('repeated calls return the same is_visible ref instance', () => {
      const a = useMobileDock()
      const b = useMobileDock()

      expect(a.is_visible).toBe(b.is_visible)
    })
  })

  describe('initial state', () => {
    test('el starts as null', () => {
      const { el } = useMobileDock()
      expect(el.value).toBeNull()
    })

    test('DEFAULT_BREAKPOINT is xl', () => {
      expect(DEFAULT_BREAKPOINT).toBe('xl')
    })
  })

  describe('breakpoint claim stack', () => {
    test('with no claim, is_visible follows the default breakpoint', async () => {
      const { is_visible } = useMobileDock()

      await setBelow(DEFAULT_BREAKPOINT, true)
      expect(is_visible.value).toBe(true)

      await setBelow(DEFAULT_BREAKPOINT, false)
      expect(is_visible.value).toBe(false)
    })

    test('after the only fill unmounts (releases), the effective breakpoint falls back to DEFAULT_BREAKPOINT', async () => {
      const { is_visible } = useMobileDock()
      const release = claim('md')
      await nextTick()

      await setBelow('md', true)
      expect(is_visible.value).toBe(true)

      release()
      // Now below the md query only — the default (xl) query decides instead.
      await setBelow('md', true)
      expect(is_visible.value).toBe(false)

      await setBelow(DEFAULT_BREAKPOINT, true)
      expect(is_visible.value).toBe(true)
    })

    test('while two fills overlap, the newest claim wins', async () => {
      const { is_visible } = useMobileDock()
      claim('md')
      claim('sm')
      await nextTick()

      await setBelow('md', true)
      expect(is_visible.value).toBe(false)

      await setBelow('sm', true)
      expect(is_visible.value).toBe(true)
    })

    test('releasing the newest claim drops back to the still-open older claim', async () => {
      const { is_visible } = useMobileDock()
      claim('md')
      const releaseSm = claim('sm')
      await nextTick()

      await setBelow('sm', true)
      expect(is_visible.value).toBe(true)

      releaseSm()
      await setBelow('sm', true)
      await setBelow('md', false)
      expect(is_visible.value).toBe(false)

      await setBelow('md', true)
      expect(is_visible.value).toBe(true)
    })

    test('claims are id-keyed — releasing an older claim out of order never drops the newer one', async () => {
      const { is_visible } = useMobileDock()
      const releaseMd = claim('md')
      claim('sm')
      await nextTick()

      // Release the older (bottom-of-stack) claim while the newer one is still open.
      releaseMd()
      await nextTick()

      await setBelow('sm', true)
      expect(is_visible.value).toBe(true)
    })
  })

  describe('is_visible also gates on the keyboard', () => {
    test('is_visible is false while the keyboard is open, even below the claimed breakpoint', async () => {
      const { is_visible } = useMobileDock()
      claim('md')
      await setBelow('md', true)
      expect(is_visible.value).toBe(true)

      await openKeyboard(true)
      expect(is_visible.value).toBe(false)
    })
  })

  describe('is_flush', () => {
    test('is_flush follows the sm breakpoint independently of the claimed breakpoint', async () => {
      const { is_flush } = useMobileDock()
      claim('xl')
      await nextTick()

      await setBelow('sm', true)
      expect(is_flush.value).toBe(true)

      await setBelow('sm', false)
      expect(is_flush.value).toBe(false)
    })
  })

  describe('claimHeight delegates to the mounted host stage', () => {
    test('claimHeight is a no-op before any host registers its stage, returning a safe release', () => {
      const { claimHeight } = useMobileDock()

      const release = claimHeight()

      // No owner registered, so nothing is claimed; the release must still be callable.
      expect(() => release()).not.toThrow()
    })

    test('claimHeight forwards to the registered owner and returns its release', () => {
      const { claimHeight, setHeightOwner } = useMobileDock()
      const ownerRelease = vi.fn()
      const ownerClaim = vi.fn(() => ownerRelease)
      setHeightOwner(ownerClaim)

      const release = claimHeight()
      expect(ownerClaim).toHaveBeenCalledOnce()
      expect(ownerRelease).not.toHaveBeenCalled()

      release()
      expect(ownerRelease).toHaveBeenCalledOnce()
    })

    test('clearing the owner with null makes claimHeight a no-op again', () => {
      const { claimHeight, setHeightOwner } = useMobileDock()
      const ownerClaim = vi.fn(() => vi.fn())
      setHeightOwner(ownerClaim)
      setHeightOwner(null)

      const release = claimHeight()

      expect(ownerClaim).not.toHaveBeenCalled()
      expect(() => release()).not.toThrow()
    })
  })
})
