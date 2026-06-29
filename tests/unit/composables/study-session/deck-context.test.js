import { describe, test, expect } from 'vite-plus/test'
import { createApp, defineComponent, h } from 'vue'
import { useProvideDeckContext, useDeckContext } from '@/components/study-session/deck-context'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Mounts a parent + child pair where the parent provides the deck context via
 * `useProvideDeckContext` and the child reads it via the `consumer` function.
 * Returns the value from `consumer` (typically a Ref<DeckContext>).
 */
function withDecks(decks, consumer) {
  let result
  let app

  const Child = defineComponent({
    setup() {
      result = consumer()
      return () => null
    }
  })

  const Parent = defineComponent({
    setup() {
      useProvideDeckContext(() => decks)
    },
    render() {
      return h(Child)
    }
  })

  app = createApp(Parent)
  app.mount(document.createElement('div'))
  app.unmount()

  return result
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DeckContext', () => {
  describe('appearanceFor', () => {
    test('returns cover_config and card_attributes for a known deck_id [obligation]', () => {
      const cover = { bg_color: 'blue-500', pattern: 'dots' }
      const attrs = { text_size: 'lg' }
      const decks = [{ id: 1, cover_config: cover, card_attributes: attrs }]

      const ctx = withDecks(decks, () => useDeckContext())
      expect(ctx.value.appearanceFor(1)).toEqual({ cover_config: cover, card_attributes: attrs })
    })

    test('returns empty object for unknown deck_id [obligation]', () => {
      const decks = [{ id: 1, cover_config: { bg_color: 'red' }, card_attributes: null }]
      const ctx = withDecks(decks, () => useDeckContext())
      expect(ctx.value.appearanceFor(999)).toEqual({})
    })

    test('returns empty object for undefined deck_id [obligation]', () => {
      const decks = [{ id: 1, cover_config: { bg_color: 'red' }, card_attributes: null }]
      const ctx = withDecks(decks, () => useDeckContext())
      expect(ctx.value.appearanceFor(undefined)).toEqual({})
    })

    test('resolves each deck independently in a multi-deck session', () => {
      const cover1 = { bg_color: 'red-500', pattern: 'none' }
      const cover2 = { bg_color: 'blue-500', pattern: 'stars' }
      const decks = [
        { id: 1, cover_config: cover1, card_attributes: null },
        { id: 2, cover_config: cover2, card_attributes: null }
      ]

      const ctx = withDecks(decks, () => useDeckContext())
      expect(ctx.value.appearanceFor(1).cover_config).toEqual(cover1)
      expect(ctx.value.appearanceFor(2).cover_config).toEqual(cover2)
    })

    test('deck with null cover_config returns appearance object with null cover_config', () => {
      const decks = [{ id: 1, cover_config: null, card_attributes: { text_size: 'sm' } }]
      const ctx = withDecks(decks, () => useDeckContext())
      // The deck IS in the map so the full appearance object is returned.
      // Only missing decks (not in the map) fall back to {}.
      const appearance = ctx.value.appearanceFor(1)
      expect(appearance).toEqual({ cover_config: null, card_attributes: { text_size: 'sm' } })
    })
  })

  describe('covers', () => {
    test('returns covers for decks with truthy cover_config [obligation]', () => {
      const cover1 = { bg_color: 'red-500', pattern: 'none' }
      const cover2 = { bg_color: 'blue-500', pattern: 'stars' }
      const decks = [
        { id: 1, cover_config: cover1 },
        { id: 2, cover_config: cover2 }
      ]

      const ctx = withDecks(decks, () => useDeckContext())
      expect(ctx.value.covers).toEqual([cover1, cover2])
    })

    test('filters out decks with null cover_config [obligation]', () => {
      const cover = { bg_color: 'red-500', pattern: 'none' }
      const decks = [
        { id: 1, cover_config: cover },
        { id: 2, cover_config: null },
        { id: 3, cover_config: undefined }
      ]

      const ctx = withDecks(decks, () => useDeckContext())
      expect(ctx.value.covers).toEqual([cover])
    })

    test('returns empty array when no decks have covers [obligation]', () => {
      const decks = [
        { id: 1, cover_config: null },
        { id: 2, cover_config: undefined }
      ]

      const ctx = withDecks(decks, () => useDeckContext())
      expect(ctx.value.covers).toEqual([])
    })

    test('returns empty array for empty deck list', () => {
      const ctx = withDecks([], () => useDeckContext())
      expect(ctx.value.covers).toEqual([])
    })

    test('preserves cover order matching the decks array order', () => {
      const cover1 = { bg_color: 'red-500' }
      const cover2 = { bg_color: 'blue-500' }
      const cover3 = { bg_color: 'green-500' }
      const decks = [
        { id: 1, cover_config: cover1 },
        { id: 2, cover_config: cover2 },
        { id: 3, cover_config: cover3 }
      ]

      const ctx = withDecks(decks, () => useDeckContext())
      expect(ctx.value.covers).toEqual([cover1, cover2, cover3])
    })
  })

  describe('useDeckContext without a provider', () => {
    test('returns empty context with no-op appearanceFor [obligation]', () => {
      let ctx
      let app

      const component = defineComponent({
        setup() {
          ctx = useDeckContext()
          return () => null
        }
      })

      app = createApp(component)
      app.mount(document.createElement('div'))
      app.unmount()

      expect(ctx.value.appearanceFor(1)).toEqual({})
    })

    test('empty context has empty covers array', () => {
      let ctx
      let app

      const component = defineComponent({
        setup() {
          ctx = useDeckContext()
          return () => null
        }
      })

      app = createApp(component)
      app.mount(document.createElement('div'))
      app.unmount()

      expect(ctx.value.covers).toEqual([])
    })
  })
})
