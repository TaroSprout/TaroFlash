import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

function createMockMql(matches = false) {
  const handlers = new Set()
  return {
    matches,
    addEventListener: vi.fn((_, cb) => handlers.add(cb)),
    removeEventListener: vi.fn((_, cb) => handlers.delete(cb)),
    _fire() {
      handlers.forEach((cb) => cb())
    }
  }
}

describe('useMatchMedia', () => {
  let useMatchMedia

  beforeEach(async () => {
    // Reset module cache so the internal query cache starts fresh each test.
    vi.resetModules()
    window.matchMedia = vi.fn(() => createMockMql(false))
    ;({ useMatchMedia } = await import('@/composables/ui/media-query'))
  })

  function compiledFor(token) {
    useMatchMedia(token)
    return window.matchMedia.mock.lastCall[0]
  }

  describe('atom compilation', () => {
    test('coarse pointer', () => {
      expect(compiledFor('coarse')).toBe('(pointer: coarse)')
    })

    test('fine pointer', () => {
      expect(compiledFor('fine')).toBe('(pointer: fine)')
    })

    test('dark color scheme', () => {
      expect(compiledFor('dark')).toBe('(prefers-color-scheme: dark)')
    })

    test('light color scheme', () => {
      expect(compiledFor('light')).toBe('(prefers-color-scheme: light)')
    })

    test('width at-or-above uses a bare min-width', () => {
      const q = compiledFor('w>=md')
      expect(q).toContain('(min-width:')
      expect(q).not.toContain('not all')
    })

    test('width below uses the Safari-safe `not all and (min-width)` form', () => {
      expect(compiledFor('w<md')).toMatch(/^not all and \(min-width:/)
    })

    test('w<mlg compiles to the L3 max-width form (not all and min-width) [obligation]', () => {
      expect(compiledFor('w<mlg')).toMatch(/^not all and \(min-width:/)
    })

    test('w>=mlg compiles to a bare min-width form [obligation]', () => {
      const q = compiledFor('w>=mlg')
      expect(q).toMatch(/^\(min-width:/)
      expect(q).not.toContain('not all')
    })

    test('mlg is accepted as a valid breakpoint token (no throw) [obligation]', () => {
      expect(() => compiledFor('w<mlg')).not.toThrow()
      expect(() => compiledFor('w>=mlg')).not.toThrow()
    })

    test('height at-or-above uses a bare min-height', () => {
      const q = compiledFor('h>=lg')
      expect(q).toContain('(min-height:')
      expect(q).not.toContain('not all')
    })

    test('height below uses the negated min-height form', () => {
      expect(compiledFor('h<sm')).toMatch(/^not all and \(min-height:/)
    })

    test('tolerates surrounding whitespace', () => {
      expect(compiledFor('  coarse  ')).toBe('(pointer: coarse)')
    })
  })

  describe('combinators', () => {
    test('`|` comma-joins each atom as a standalone OR clause', () => {
      const q = compiledFor('w<md | h<sm')
      expect(q.split(', ')).toHaveLength(2)
      expect(q).toContain('not all and (min-width:')
      expect(q).toContain('not all and (min-height:')
    })

    test('`&` joins atoms into one conjunction clause', () => {
      const q = compiledFor('w>=lg & fine')
      expect(q).toContain(' and ')
      expect(q).toContain('(min-width:')
      expect(q).toContain('(pointer: fine)')
      expect(q).not.toContain(',')
    })

    test('tablet token compiles to three OR clauses including coarse', () => {
      const q = compiledFor('w<lg | h<lg | coarse')
      expect(q.split(', ')).toHaveLength(3)
      expect(q).toContain('(pointer: coarse)')
    })

    test('whitespace around the combinator is optional', () => {
      expect(compiledFor('w<md|h<sm')).toBe(compiledFor('w<md | h<sm'))
    })
  })

  describe('reactivity', () => {
    test('seeds the ref from matchMedia.matches', () => {
      window.matchMedia = vi.fn(() => createMockMql(true))
      expect(useMatchMedia('dark').value).toBe(true)
    })

    test('updates when the media query change event fires', () => {
      const mql = createMockMql(false)
      window.matchMedia = vi.fn(() => mql)
      const result = useMatchMedia('dark')
      expect(result.value).toBe(false)

      mql.matches = true
      mql._fire()
      expect(result.value).toBe(true)
    })

    test('never removes its listener — the cache is app-lifetime', () => {
      const mql = createMockMql(false)
      window.matchMedia = vi.fn(() => mql)
      useMatchMedia('dark')
      expect(mql.removeEventListener).not.toHaveBeenCalled()
    })
  })

  describe('caching', () => {
    test('same token returns the same ref and queries matchMedia once', () => {
      const a = useMatchMedia('w<md | h<sm')
      const b = useMatchMedia('w<md | h<sm')
      expect(a).toBe(b)
      expect(window.matchMedia).toHaveBeenCalledTimes(1)
    })

    test('tokens that compile to the same query dedupe', () => {
      const a = useMatchMedia('coarse')
      const b = useMatchMedia(' coarse ')
      expect(a).toBe(b)
      expect(window.matchMedia).toHaveBeenCalledTimes(1)
    })

    test('different queries get separate refs', () => {
      const a = useMatchMedia('dark')
      const b = useMatchMedia('light')
      expect(a).not.toBe(b)
    })
  })

  describe('invalid queries throw', () => {
    test('mixing `&` and `|`', () => {
      expect(() => useMatchMedia('w<md & h<sm | coarse')).toThrow(/mix/)
    })

    test('unknown atom', () => {
      expect(() => useMatchMedia('w<<md')).toThrow(/unknown atom/)
      expect(() => useMatchMedia('tablet')).toThrow(/unknown atom/)
    })

    test('a `<` atom under `&` (would need max-* support)', () => {
      expect(() => useMatchMedia('w<md & fine')).toThrow(/"<" atoms/)
    })
  })
})
