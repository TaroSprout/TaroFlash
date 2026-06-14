import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: vi.fn()
}))

// mediaRefs are created fresh each beforeEach via vi.resetModules + dynamic import.
// They live here as module-level vars so test bodies can mutate .value.
let sheetRef
let desktopRef
let useTabModalLayout
let useMatchMedia

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()

  // Dynamic import after resetModules so we pick up a fresh module scope.
  const { ref } = await import('vue')
  sheetRef = ref(false)
  desktopRef = ref(false)
  ;({ useTabModalLayout } = await import('@/composables/ui/tab-modal-layout'))
  ;({ useMatchMedia } = await import('@/composables/ui/media-query'))

  // Default: queries containing '&' (desktop) → desktopRef; everything else → sheetRef
  useMatchMedia.mockImplementation((query) => {
    if (query.includes('&')) return desktopRef
    return sheetRef
  })
})

// ── layout_mode ───────────────────────────────────────────────────────────────

describe('useTabModalLayout — layout_mode', () => {
  test('returns "tablet" when neither sheet nor desktop query matches', () => {
    sheetRef.value = false
    desktopRef.value = false
    const { layout_mode } = useTabModalLayout({
      sheet_query: 'w<md',
      desktop_query: 'w>=lg & fine'
    })
    expect(layout_mode.value).toBe('tablet')
  })

  test('returns "sheet" when sheet_query matches', () => {
    sheetRef.value = true
    desktopRef.value = false
    const { layout_mode } = useTabModalLayout({
      sheet_query: 'w<md',
      desktop_query: 'w>=lg & fine'
    })
    expect(layout_mode.value).toBe('sheet')
  })

  test('returns "desktop" when desktop_query matches and sheet does not', () => {
    sheetRef.value = false
    desktopRef.value = true
    const { layout_mode } = useTabModalLayout({
      sheet_query: 'w<md',
      desktop_query: 'w>=lg & fine'
    })
    expect(layout_mode.value).toBe('desktop')
  })

  test('sheet wins over desktop when both queries match simultaneously [obligation]', () => {
    sheetRef.value = true
    desktopRef.value = true
    const { layout_mode } = useTabModalLayout({
      sheet_query: 'w<md',
      desktop_query: 'w>=lg & fine'
    })
    expect(layout_mode.value).toBe('sheet')
  })

  test('never returns "desktop" when desktop_query is omitted [obligation]', () => {
    // deck-create case: only sheet/tablet modes exist
    sheetRef.value = false
    const { layout_mode } = useTabModalLayout({ sheet_query: 'w<md' })
    expect(layout_mode.value).not.toBe('desktop')
    expect(layout_mode.value).toBe('tablet')
  })

  test('never returns "desktop" when called with no options at all [obligation]', () => {
    sheetRef.value = false
    const { layout_mode } = useTabModalLayout()
    expect(layout_mode.value).not.toBe('desktop')
    expect(layout_mode.value).toBe('tablet')
  })

  test('layout_mode is reactive — updates when sheet media ref changes', () => {
    sheetRef.value = false
    desktopRef.value = false
    const { layout_mode } = useTabModalLayout({
      sheet_query: 'w<md',
      desktop_query: 'w>=lg & fine'
    })
    expect(layout_mode.value).toBe('tablet')

    sheetRef.value = true
    expect(layout_mode.value).toBe('sheet')

    sheetRef.value = false
    expect(layout_mode.value).toBe('tablet')
  })

  test('layout_mode is reactive — updates when desktop media ref changes', () => {
    sheetRef.value = false
    desktopRef.value = false
    const { layout_mode } = useTabModalLayout({
      sheet_query: 'w<md',
      desktop_query: 'w>=lg & fine'
    })
    expect(layout_mode.value).toBe('tablet')

    desktopRef.value = true
    expect(layout_mode.value).toBe('desktop')
  })
})

// ── sheet_px ──────────────────────────────────────────────────────────────────

describe('useTabModalLayout — sheet_px formula [obligation]', () => {
  test('returns "4.5rem" on tablet mode', () => {
    sheetRef.value = false
    desktopRef.value = false
    const { sheet_px } = useTabModalLayout({ sheet_query: 'w<md', desktop_query: 'w>=lg & fine' })
    expect(sheet_px.value).toBe('4.5rem')
  })

  test('returns "2rem" on sheet mode', () => {
    sheetRef.value = true
    const { sheet_px } = useTabModalLayout({ sheet_query: 'w<md', desktop_query: 'w>=lg & fine' })
    expect(sheet_px.value).toBe('2rem')
  })

  test('returns "2rem" on desktop mode', () => {
    sheetRef.value = false
    desktopRef.value = true
    const { sheet_px } = useTabModalLayout({ sheet_query: 'w<md', desktop_query: 'w>=lg & fine' })
    expect(sheet_px.value).toBe('2rem')
  })

  test('sheet_px is reactive — switches from 4.5rem to 2rem when sheet activates', () => {
    sheetRef.value = false
    desktopRef.value = false
    const { sheet_px } = useTabModalLayout({ sheet_query: 'w<md', desktop_query: 'w>=lg & fine' })
    expect(sheet_px.value).toBe('4.5rem')

    sheetRef.value = true
    expect(sheet_px.value).toBe('2rem')
  })
})

// ── useMatchMedia call patterns ───────────────────────────────────────────────

describe('useTabModalLayout — defaults and query forwarding', () => {
  test('defaults sheet_query to "w<md" when not provided', () => {
    useTabModalLayout()
    expect(useMatchMedia).toHaveBeenCalledWith('w<md')
  })

  test('does not call useMatchMedia with desktop_query when desktop_query is omitted', () => {
    useTabModalLayout({ sheet_query: 'w<md' })
    // Only one call — for the sheet query
    const calls = useMatchMedia.mock.calls.map((c) => c[0])
    expect(calls).not.toContain('w>=lg & fine')
    expect(calls).toHaveLength(1)
  })

  test('calls useMatchMedia with both queries when both are provided', () => {
    useTabModalLayout({ sheet_query: 'w<md', desktop_query: 'w>=lg & fine' })
    const calls = useMatchMedia.mock.calls.map((c) => c[0])
    expect(calls).toContain('w<md')
    expect(calls).toContain('w>=lg & fine')
  })
})
