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
    })
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
