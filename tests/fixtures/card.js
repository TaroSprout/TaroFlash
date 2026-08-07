import { build, sequence } from 'mimicry-js'
import { faker } from '@faker-js/faker'
import { generateKeyBetween } from 'fractional-indexing'

// Cards default to a valid, monotonically increasing fractional-indexing key —
// the same base62 format the app mints client-side (@/utils/card/rank) — so
// fixtures exercise rankBetween/resolveRankNeighbours the way real cards do.
let last_fixture_rank = null
function nextFixtureRank() {
  last_fixture_rank = generateKeyBetween(last_fixture_rank, null)
  return last_fixture_rank
}

export const review = build({
  fields: {
    due: () => faker.date.anytime().toISOString(),
    ease: () => faker.number.int({ min: 1, max: 5 }),
    interval: () => faker.number.int({ min: 1, max: 30 }),
    lapses: () => faker.number.int({ min: 0, max: 3 }),
    last_review: () => faker.date.past(),
    learning_steps: () => faker.number.int({ min: 0, max: 10 }),
    reps: () => faker.number.int({ min: 1, max: 10 }),
    scheduled_days: () => faker.number.int({ min: 1, max: 30 }),
    stability: () => faker.number.float({ min: 0.5, max: 2 }),
    state: () => faker.number.int({ min: 0, max: 2 })
  },
  traits: {
    not_due_today: {
      overrides: {
        due: () => faker.date.future().toISOString()
      }
    },
    due_today: {
      overrides: {
        due: () => faker.date.recent().toISOString()
      }
    }
  }
})

export const card = build({
  fields: {
    id: sequence(),
    front_text: () => faker.word.words({ count: { min: 5, max: 10 } }),
    back_text: () => faker.word.words({ count: { min: 5, max: 10 } }),
    front_delta: null,
    back_delta: null,
    deck_id: sequence(),
    created_at: () => faker.date.past().toISOString(),
    updated_at: () => faker.date.past().toISOString(),
    order: sequence(),
    rank: () => nextFixtureRank(),
    member_id: () => faker.number.int({ min: 1, max: 100 }),
    front_image_path: null,
    back_image_path: null,
    review: null,
    state: 'unreviewed'
  },
  traits: {
    with_not_due_review: {
      overrides: {
        review: () => review.one({ traits: 'not_due_today' })
      }
    },
    with_due_review: {
      overrides: {
        review: () => review.one({ traits: 'due_today' })
      }
    },
    with_review: {
      overrides: {
        review: () => review.one()
      }
    },
    passed: {
      overrides: {
        state: 'passed'
      }
    },
    failed: {
      overrides: {
        state: 'failed'
      }
    }
  }
})
