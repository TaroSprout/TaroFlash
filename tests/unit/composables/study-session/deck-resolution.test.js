import { describe, test, expect } from 'vite-plus/test'
import { createApp, defineComponent, h, ref } from 'vue'
import {
  buildDeckResolution,
  provideDeckResolution,
  useDeckResolution
} from '@/views/study-session/deck-resolution'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeDeck(overrides = {}) {
  return {
    id: 1,
    title: 'Deck',
    starting_side: 'front',
    shuffle: false,
    cover_config: null,
    card_attributes: null,
    desired_retention: 90,
    learning_steps: ['1m', '10m'],
    relearning_steps: ['10m'],
    leech_threshold: 8,
    max_interval: null,
    ...overrides
  }
}

/** Mounts a parent that provides the resolution and a child that reads it. */
function withDecks(decks) {
  let result
  const decks_ref = ref(decks)

  const Child = defineComponent({
    setup() {
      result = useDeckResolution()
      return () => null
    }
  })

  const Parent = defineComponent({
    setup() {
      provideDeckResolution(buildDeckResolution(decks_ref))
    },
    render() {
      return h(Child)
    }
  })

  const app = createApp(Parent)
  app.mount(document.createElement('div'))

  return { resolution: result, decks_ref, unmount: () => app.unmount() }
}

// ── appearanceFor ────────────────────────────────────────────────────────────

describe('appearanceFor', () => {
  test('returns cover_config and card_attributes for a known deck_id', () => {
    const cover = { bg_color: 'blue-500' }
    const attrs = { text_size: 4 }
    const { resolution } = withDecks([
      makeDeck({ id: 1, cover_config: cover, card_attributes: attrs })
    ])

    expect(resolution.appearanceFor(1)).toEqual({ cover_config: cover, card_attributes: attrs })
  })

  test('returns empty object for an unknown deck_id', () => {
    const { resolution } = withDecks([makeDeck({ id: 1 })])
    expect(resolution.appearanceFor(999)).toEqual({})
  })

  test('returns empty object for an undefined deck_id', () => {
    const { resolution } = withDecks([makeDeck({ id: 1 })])
    expect(resolution.appearanceFor(undefined)).toEqual({})
  })

  test('resolves each deck independently in a multi-deck session', () => {
    const cover1 = { bg_color: 'red-500' }
    const cover2 = { bg_color: 'blue-500' }
    const { resolution } = withDecks([
      makeDeck({ id: 1, cover_config: cover1 }),
      makeDeck({ id: 2, cover_config: cover2 })
    ])

    expect(resolution.appearanceFor(1).cover_config).toEqual(cover1)
    expect(resolution.appearanceFor(2).cover_config).toEqual(cover2)
  })
})

// ── schedulerFor / flipFor / thresholdFor — per-deck resolution ─────────────

describe('schedulerFor', () => {
  test('returns a distinct FSRS instance built from the deck resolved pacing', () => {
    const { resolution } = withDecks([
      makeDeck({ id: 1, desired_retention: 70 }),
      makeDeck({ id: 2, desired_retention: 97 })
    ])

    expect(resolution.schedulerFor(1)).not.toBe(resolution.schedulerFor(2))
  })

  test('returns the same cached instance for repeated calls on the same deck', () => {
    const { resolution } = withDecks([makeDeck({ id: 1 })])
    expect(resolution.schedulerFor(1)).toBe(resolution.schedulerFor(1))
  })

  test('falls back to a default FSRS instance for an unknown/undefined deck_id', () => {
    const { resolution } = withDecks([makeDeck({ id: 1 })])
    expect(resolution.schedulerFor(999)).toBeDefined()
    expect(resolution.schedulerFor(undefined)).toBeDefined()
  })

  test('maps a null max_interval to the FSRS uncapped default', () => {
    const { resolution } = withDecks([makeDeck({ id: 1, max_interval: null })])
    const scheduler = resolution.schedulerFor(1)
    expect(scheduler.parameters.maximum_interval).toBe(36500)
  })

  test('passes a concrete max_interval through as-is', () => {
    const { resolution } = withDecks([makeDeck({ id: 1, max_interval: 120 })])
    expect(resolution.schedulerFor(1).parameters.maximum_interval).toBe(120)
  })
})

describe('startingSideFor [obligation]', () => {
  test('returns each deck own starting_side value', () => {
    const { resolution } = withDecks([
      makeDeck({ id: 1, starting_side: 'front' }),
      makeDeck({ id: 2, starting_side: 'back' })
    ])

    expect(resolution.startingSideFor(1)).toBe('front')
    expect(resolution.startingSideFor(2)).toBe('back')
  })

  test('passes "random" through verbatim', () => {
    const { resolution } = withDecks([makeDeck({ id: 1, starting_side: 'random' })])
    expect(resolution.startingSideFor(1)).toBe('random')
  })

  test('falls back to "front" for an unknown deck_id [obligation]', () => {
    const { resolution } = withDecks([makeDeck({ id: 1, starting_side: 'back' })])
    expect(resolution.startingSideFor(999)).toBe('front')
  })

  test('falls back to "front" for an undefined deck_id (a card whose deck hasn\'t landed yet) [obligation]', () => {
    const { resolution } = withDecks([makeDeck({ id: 1, starting_side: 'back' })])
    expect(resolution.startingSideFor(undefined)).toBe('front')
  })
})

describe('thresholdFor', () => {
  test('returns each deck own leech_threshold', () => {
    const { resolution } = withDecks([
      makeDeck({ id: 1, leech_threshold: 4 }),
      makeDeck({ id: 2, leech_threshold: 16 })
    ])

    expect(resolution.thresholdFor(1)).toBe(4)
    expect(resolution.thresholdFor(2)).toBe(16)
  })

  test('falls back to DEFAULT_LEECH_THRESHOLD for an unknown/undefined deck_id', () => {
    const { resolution } = withDecks([makeDeck({ id: 1, leech_threshold: 4 })])
    expect(resolution.thresholdFor(999)).toBe(8)
    expect(resolution.thresholdFor(undefined)).toBe(8)
  })
})

// ── covers ────────────────────────────────────────────────────────────────────

describe('covers', () => {
  test('returns covers for decks with a truthy cover_config, preserving order', () => {
    const cover1 = { bg_color: 'red-500' }
    const cover2 = { bg_color: 'blue-500' }
    const { resolution } = withDecks([
      makeDeck({ id: 1, cover_config: cover1 }),
      makeDeck({ id: 2, cover_config: cover2 })
    ])

    expect(resolution.covers.value).toEqual([cover1, cover2])
  })

  test('filters out decks with a null cover_config', () => {
    const cover = { bg_color: 'red-500' }
    const { resolution } = withDecks([
      makeDeck({ id: 1, cover_config: cover }),
      makeDeck({ id: 2, cover_config: null })
    ])

    expect(resolution.covers.value).toEqual([cover])
  })

  test('returns an empty array for an empty deck list', () => {
    const { resolution } = withDecks([])
    expect(resolution.covers.value).toEqual([])
  })
})

// ── shuffle: merged queue shuffles iff ANY session deck opts in [obligation] ─

describe('shuffle [obligation]', () => {
  test('false when no deck opts into shuffle', () => {
    const { resolution } = withDecks([
      makeDeck({ id: 1, shuffle: false }),
      makeDeck({ id: 2, shuffle: false })
    ])
    expect(resolution.shuffle.value).toBe(false)
  })

  test('true when every deck opts into shuffle', () => {
    const { resolution } = withDecks([
      makeDeck({ id: 1, shuffle: true }),
      makeDeck({ id: 2, shuffle: true })
    ])
    expect(resolution.shuffle.value).toBe(true)
  })

  test('true when only ONE of several decks opts into shuffle [obligation]', () => {
    const { resolution } = withDecks([
      makeDeck({ id: 1, shuffle: false }),
      makeDeck({ id: 2, shuffle: true }),
      makeDeck({ id: 3, shuffle: false })
    ])
    expect(resolution.shuffle.value).toBe(true)
  })

  test('reacts to the decks list changing after the initial resolve', () => {
    const { resolution, decks_ref } = withDecks([makeDeck({ id: 1, shuffle: false })])
    expect(resolution.shuffle.value).toBe(false)

    decks_ref.value = [makeDeck({ id: 1, shuffle: true })]

    expect(resolution.shuffle.value).toBe(true)
  })
})

// ── useDeckResolution without a provider ────────────────────────────────────

describe('useDeckResolution without a provider', () => {
  test('throws a descriptive error', () => {
    const Orphan = defineComponent({
      setup() {
        useDeckResolution()
        return () => null
      }
    })
    const app = createApp(Orphan)

    expect(() => app.mount(document.createElement('div'))).toThrow(
      'No DeckResolution provided above this component'
    )
  })
})
