import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: vi.fn()
}))

// mediaRefs are created fresh each beforeEach via vi.resetModules + dynamic import.
let phoneRef
let desktopRef
let useWindowLayout
let useMatchMedia

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()

  const { ref } = await import('vue')
  phoneRef = ref(false)
  desktopRef = ref(false)
  ;({ useWindowLayout } = await import('@/components/layout-kit/paged-window/layout'))
  ;({ useMatchMedia } = await import('@/composables/ui/media-query'))

  // Default: queries containing '&' (desktop) → desktopRef; everything else → phoneRef
  useMatchMedia.mockImplementation((query) => {
    if (query.includes('&')) return desktopRef
    return phoneRef
  })
})

// ── layout_mode ───────────────────────────────────────────────────────────────

describe('useWindowLayout — layout_mode', () => {
  test('returns "tablet" when neither phone nor desktop query matches', () => {
    phoneRef.value = false
    desktopRef.value = false
    const { layout_mode } = useWindowLayout({ phone_query: 'w<md', desktop_query: 'w>=lg & fine' })
    expect(layout_mode.value).toBe('tablet')
  })

  test('returns "phone" when phone_query matches', () => {
    phoneRef.value = true
    desktopRef.value = false
    const { layout_mode } = useWindowLayout({ phone_query: 'w<md', desktop_query: 'w>=lg & fine' })
    expect(layout_mode.value).toBe('phone')
  })

  test('returns "desktop" when desktop_query matches and phone does not', () => {
    phoneRef.value = false
    desktopRef.value = true
    const { layout_mode } = useWindowLayout({ phone_query: 'w<md', desktop_query: 'w>=lg & fine' })
    expect(layout_mode.value).toBe('desktop')
  })

  test('phone wins over desktop when both queries match simultaneously [obligation]', () => {
    phoneRef.value = true
    desktopRef.value = true
    const { layout_mode } = useWindowLayout({ phone_query: 'w<md', desktop_query: 'w>=lg & fine' })
    expect(layout_mode.value).toBe('phone')
  })

  test('never returns "desktop" when desktop_query is omitted [obligation]', () => {
    phoneRef.value = false
    const { layout_mode } = useWindowLayout({ phone_query: 'w<md' })
    expect(layout_mode.value).not.toBe('desktop')
    expect(layout_mode.value).toBe('tablet')
  })

  test('never returns "desktop" when called with no options at all [obligation]', () => {
    phoneRef.value = false
    const { layout_mode } = useWindowLayout()
    expect(layout_mode.value).not.toBe('desktop')
    expect(layout_mode.value).toBe('tablet')
  })

  test('layout_mode is reactive — updates when phone media ref changes', () => {
    phoneRef.value = false
    desktopRef.value = false
    const { layout_mode } = useWindowLayout({ phone_query: 'w<md', desktop_query: 'w>=lg & fine' })
    expect(layout_mode.value).toBe('tablet')

    phoneRef.value = true
    expect(layout_mode.value).toBe('phone')

    phoneRef.value = false
    expect(layout_mode.value).toBe('tablet')
  })

  test('layout_mode is reactive — updates when desktop media ref changes', () => {
    phoneRef.value = false
    desktopRef.value = false
    const { layout_mode } = useWindowLayout({ phone_query: 'w<md', desktop_query: 'w>=lg & fine' })
    expect(layout_mode.value).toBe('tablet')

    desktopRef.value = true
    expect(layout_mode.value).toBe('desktop')
  })
})

// ── window_px ─────────────────────────────────────────────────────────────────

describe('useWindowLayout — window_px formula', () => {
  test('returns "4.5rem" on tablet mode', () => {
    phoneRef.value = false
    desktopRef.value = false
    const { window_px } = useWindowLayout({ phone_query: 'w<md', desktop_query: 'w>=lg & fine' })
    expect(window_px.value).toBe('4.5rem')
  })

  test('returns "2rem" on phone mode', () => {
    phoneRef.value = true
    const { window_px } = useWindowLayout({ phone_query: 'w<md', desktop_query: 'w>=lg & fine' })
    expect(window_px.value).toBe('2rem')
  })

  test('returns "2rem" on desktop mode', () => {
    phoneRef.value = false
    desktopRef.value = true
    const { window_px } = useWindowLayout({ phone_query: 'w<md', desktop_query: 'w>=lg & fine' })
    expect(window_px.value).toBe('2rem')
  })

  test('window_px is reactive — switches from 4.5rem to 2rem when phone activates', () => {
    phoneRef.value = false
    desktopRef.value = false
    const { window_px } = useWindowLayout({ phone_query: 'w<md', desktop_query: 'w>=lg & fine' })
    expect(window_px.value).toBe('4.5rem')

    phoneRef.value = true
    expect(window_px.value).toBe('2rem')
  })
})

// ── useMatchMedia call patterns ───────────────────────────────────────────────

describe('useWindowLayout — defaults and query forwarding', () => {
  test('defaults phone_query to "w<md" when not provided', () => {
    useWindowLayout()
    expect(useMatchMedia).toHaveBeenCalledWith('w<md')
  })

  test('does not call useMatchMedia with desktop_query when desktop_query is omitted', () => {
    useWindowLayout({ phone_query: 'w<md' })
    const calls = useMatchMedia.mock.calls.map((c) => c[0])
    expect(calls).not.toContain('w>=lg & fine')
    expect(calls).toHaveLength(1)
  })

  test('calls useMatchMedia with both queries when both are provided', () => {
    useWindowLayout({ phone_query: 'w<md', desktop_query: 'w>=lg & fine' })
    const calls = useMatchMedia.mock.calls.map((c) => c[0])
    expect(calls).toContain('w<md')
    expect(calls).toContain('w>=lg & fine')
  })
})
