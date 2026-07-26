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
function withDecks(decks, ordering = 'sequential') {
  let result
  const decks_ref = ref(decks)
  const ordering_ref = ref(ordering)

  const Child = defineComponent({
    setup() {
      result = useDeckResolution()
      return () => null
    }
  })

  const Parent = defineComponent({
    setup() {
      provideDeckResolution(buildDeckResolution(decks_ref, ordering_ref))
    },
    render() {
      return h(Child)
    }
  })

  const app = createApp(Parent)
  app.mount(document.createElement('div'))

  return { resolution: result, decks_ref, ordering_ref, unmount: () => app.unmount() }
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

// ── orderCards [obligation] ──────────────────────────────────────────────────
// Two orthogonal axes: (1) each deck's own `shuffle` flag governs its INTERNAL
// order, independent of (2) the cross-deck `ordering` strategy that merges the
// per-deck slices.

function makeCards(deck_id, ids) {
  return ids.map((id) => ({ id, deck_id }))
}

describe('orderCards — sequential strategy [obligation]', () => {
  test('returns cards grouped deck-by-deck in first-seen deck order (exact concat) [obligation]', () => {
    const { resolution } = withDecks(
      [makeDeck({ id: 1, shuffle: false }), makeDeck({ id: 2, shuffle: false })],
      'sequential'
    )
    // Server arrival order interleaves decks; first-seen order is 1 then 2.
    const cards = [...makeCards(1, [101, 102]), ...makeCards(2, [201]), ...makeCards(1, [103])]

    const ordered = resolution.orderCards(cards)

    expect(ordered.map((c) => c.id)).toEqual([101, 102, 103, 201])
  })

  test('a single-deck session returns the one deck slice verbatim — strategy is moot [obligation]', () => {
    const { resolution } = withDecks([makeDeck({ id: 1, shuffle: false })], 'sequential')
    const cards = makeCards(1, [1, 2, 3])

    expect(resolution.orderCards(cards).map((c) => c.id)).toEqual([1, 2, 3])
  })
})

describe.each(['even_spread', 'random'])('orderCards — %s strategy [obligation]', (strategy) => {
  test('preserves each deck internal relative order and the full card multiset (no drops/dupes) [obligation]', () => {
    const { resolution } = withDecks(
      [makeDeck({ id: 1, shuffle: false }), makeDeck({ id: 2, shuffle: false })],
      strategy
    )
    const deck1_cards = makeCards(1, [101, 102, 103, 104])
    const deck2_cards = makeCards(2, [201, 202])
    const cards = [...deck1_cards, ...deck2_cards]

    // Run many iterations — random-merge paths vary run to run.
    for (let i = 0; i < 30; i++) {
      const ordered = resolution.orderCards(cards)

      // Full multiset, no drops/dupes.
      expect(ordered).toHaveLength(cards.length)
      expect(new Set(ordered.map((c) => c.id))).toEqual(new Set(cards.map((c) => c.id)))

      // Each deck's own relative order is preserved.
      const deck1_order = ordered.filter((c) => c.deck_id === 1).map((c) => c.id)
      const deck2_order = ordered.filter((c) => c.deck_id === 2).map((c) => c.id)
      expect(deck1_order).toEqual([101, 102, 103, 104])
      expect(deck2_order).toEqual([201, 202])
    }
  })

  test('a single-deck session returns the one deck slice verbatim — strategy is moot [obligation]', () => {
    const { resolution } = withDecks([makeDeck({ id: 1, shuffle: false })], strategy)
    const cards = makeCards(1, [1, 2, 3])

    expect(resolution.orderCards(cards).map((c) => c.id)).toEqual([1, 2, 3])
  })
})

describe('orderCards — per-deck shuffle flag governs internal order independently [obligation]', () => {
  test('shuffle=false keeps server order for that deck even under the "random" cross-deck strategy [obligation]', () => {
    const { resolution } = withDecks(
      [makeDeck({ id: 1, shuffle: false }), makeDeck({ id: 2, shuffle: false })],
      'random'
    )
    const deck1_cards = makeCards(1, [101, 102, 103, 104, 105])
    const deck2_cards = makeCards(2, [201, 202])
    const cards = [...deck1_cards, ...deck2_cards]

    for (let i = 0; i < 30; i++) {
      const ordered = resolution.orderCards(cards)
      const deck1_order = ordered.filter((c) => c.deck_id === 1).map((c) => c.id)
      expect(deck1_order).toEqual([101, 102, 103, 104, 105])
    }
  })

  test('shuffle=true reorders a deck internal order, but preserves its full multiset [obligation]', () => {
    const { resolution } = withDecks([makeDeck({ id: 1, shuffle: true })], 'sequential')
    const cards = makeCards(1, [1, 2, 3, 4, 5, 6, 7, 8])

    const orders = new Set()
    for (let i = 0; i < 30; i++) {
      const ordered = resolution.orderCards(cards)
      expect(new Set(ordered.map((c) => c.id))).toEqual(new Set(cards.map((c) => c.id)))
      orders.add(ordered.map((c) => c.id).join(','))
    }

    // Fisher-Yates over 8 items across 30 runs should produce more than one order.
    expect(orders.size).toBeGreaterThan(1)
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
