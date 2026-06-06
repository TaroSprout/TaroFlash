import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import CollectionCard from '@/views/audio-reader/collection-card.vue'

const COLLECTION = {
  id: 1,
  title: 'JLPT N5',
  lesson_count: 3,
  created_at: '2026-06-01T00:00:00Z'
}

function mountCard(collection = COLLECTION) {
  return mount(CollectionCard, { props: { collection } })
}

describe('CollectionCard', () => {
  describe('content rendering', () => {
    test('renders the collection title', () => {
      const wrapper = mountCard()
      expect(wrapper.find('[data-testid="collection-card__title"]').text()).toBe('JLPT N5')
    })

    test('renders pluralized lesson count for count 3', () => {
      const wrapper = mountCard()
      expect(wrapper.find('[data-testid="collection-card__count"]').text()).toBe('3 lessons')
    })

    test('renders singular lesson count for count 1', () => {
      const wrapper = mountCard({ ...COLLECTION, lesson_count: 1 })
      expect(wrapper.find('[data-testid="collection-card__count"]').text()).toBe('1 lesson')
    })

    test('renders a date in collection-card__date', () => {
      const wrapper = mountCard()
      expect(wrapper.find('[data-testid="collection-card__date"]').text()).not.toBe('')
    })
  })

  describe('interactions', () => {
    test('clicking collection-card__open emits "open"', async () => {
      const wrapper = mountCard()
      await wrapper.find('[data-testid="collection-card__open"]').trigger('click')
      expect(wrapper.emitted('open')).toBeTruthy()
    })

    test('clicking collection-card__edit emits "edit"', async () => {
      const wrapper = mountCard()
      await wrapper.find('[data-testid="collection-card__edit"]').trigger('click')
      expect(wrapper.emitted('edit')).toBeTruthy()
    })
  })
})
