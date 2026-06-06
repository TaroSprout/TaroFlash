import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

import CollectionHero from '@/views/audio-reader/collection-hero.vue'

// ── Stubs ──────────────────────────────────────────────────────────────────────

const UiButtonStub = defineComponent({
  name: 'UiButton',
  emits: ['click'],
  setup(_, { emit, slots, attrs }) {
    return () =>
      h('button', { ...attrs, onClick: () => emit('click') }, slots.default ? slots.default() : [])
  }
})

const UiIconStub = defineComponent({
  name: 'UiIcon',
  props: ['src'],
  setup(props, { attrs }) {
    return () => h('span', { ...attrs, 'data-testid': 'ui-icon', 'data-src': props.src })
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const COLLECTION = { id: 1, title: 'JLPT N5', created_at: '2026-06-01T00:00:00Z' }

function mountHero(props = {}) {
  return shallowMount(CollectionHero, {
    props: { collection: COLLECTION, lessonCount: 3, ...props },
    global: {
      stubs: { UiButton: UiButtonStub, UiIcon: UiIconStub }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CollectionHero', () => {
  test('renders the thumbnail', () => {
    const wrapper = mountHero()
    expect(wrapper.find('[data-testid="collection-hero__thumbnail"]').exists()).toBe(true)
  })

  test('renders the collection title', () => {
    const wrapper = mountHero()
    expect(wrapper.find('[data-testid="collection-hero__details"]').text()).toContain('JLPT N5')
  })

  test('renders the created date', () => {
    const wrapper = mountHero()
    expect(wrapper.find('[data-testid="collection-hero__date"]').text()).not.toBe('')
  })

  test('emits upload when the new button is clicked', async () => {
    const wrapper = mountHero()
    await wrapper.find('[data-testid="collection-view__new"]').trigger('click')
    expect(wrapper.emitted('upload')).toHaveLength(1)
  })
})
