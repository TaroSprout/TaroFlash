import { build, sequence } from 'mimicry-js'
import { faker } from '@faker-js/faker'
import { card } from './card'

export const deck = build({
  fields: {
    id: sequence(),
    created_at: () => faker.date.past().toISOString(),
    updated_at: () => faker.date.past().toISOString(),
    description: () => faker.word.words({ count: { min: 1, max: 10 } }),
    is_public: () => faker.datatype.boolean(),
    title: () => faker.word.words({ count: { min: 1, max: 3 } }),
    member_id: () => faker.number.int({ min: 1, max: 10 }),
    member: () => ({
      display_name: faker.person.firstName()
    }),
    cards: () => [],
    tags: () => [],
    // Use a self-contained data URI, not faker.image.url() (loremflickr/picsum):
    // browser-mode tests render decks in real <img> elements, and those external
    // requests hang in CI (no network egress), racing Playwright's route handler
    // into an "already handled" unhandled rejection that crashes the whole run.
    image_path: () => faker.image.dataUri(),
    due_cards: () => [],
    study_config: () => ({
      study_all_cards: false
    }),
    // Resolved review-pacing fields decks_with_stats always surfaces (system
    // preset defaults when the deck has no linked preset/overrides).
    review_pacing_preset_id: () => null,
    desired_retention: () => 90,
    learning_steps: () => ['1m', '10m'],
    relearning_steps: () => ['10m'],
    desired_retention_override: () => null,
    learning_steps_override: () => null,
    relearning_steps_override: () => null
  },
  traits: {
    with_cards: {
      overrides: {
        cards: () => card.many(faker.number.int({ min: 3, max: 10 }))
      }
    },
    with_some_due_cards: {
      overrides: {
        cards: () => [
          ...card.many(faker.number.int({ min: 1, max: 10 }), {
            traits: 'with_due_review'
          }),
          ...card.many(faker.number.int({ min: 1, max: 10 }), {
            traits: 'with_not_due_review'
          })
        ]
      }
    }
  }
})
