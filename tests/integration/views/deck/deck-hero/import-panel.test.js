import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { ref } from 'vue'
import ImportPanel from '@/views/deck/deck-hero/import-panel.vue'
import { cardImportKey } from '@/views/deck/composables/card-import'

function makeDraft(overrides = {}) {
  return {
    commit: vi.fn(),
    importing: ref(false),
    has_cards: ref(false),
    cards: ref([]),
    ...overrides
  }
}

function mount(draft = makeDraft()) {
  return shallowMount(ImportPanel, {
    global: { provide: { [cardImportKey]: draft }, renderStubDefaultSlot: true }
  })
}

function importButton(wrapper) {
  return wrapper
    .findAllComponents({ name: 'UiButton' })
    .find((c) => c.attributes('data-testid') === 'deck-hero__import-button')
}

describe('deck-hero/import-panel', () => {
  test('renders the source panel and destination note', () => {
    const wrapper = mount()
    expect(wrapper.findComponent({ name: 'SourcePanel' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'DestinationNote' }).exists()).toBe(true)
  })

  test('the import button is disabled with no cards loaded', () => {
    const wrapper = mount(makeDraft({ has_cards: ref(false) }))
    expect(importButton(wrapper).props('disabled')).toBe(true)
  })

  test('the import button is disabled while importing', () => {
    const wrapper = mount(makeDraft({ has_cards: ref(true), importing: ref(true) }))
    expect(importButton(wrapper).props('disabled')).toBe(true)
  })

  test('the import button is enabled with cards loaded and not importing', () => {
    const wrapper = mount(makeDraft({ has_cards: ref(true), importing: ref(false) }))
    expect(importButton(wrapper).props('disabled')).toBe(false)
  })

  test('clicking the import button calls draft.commit', async () => {
    const draft = makeDraft({ has_cards: ref(true) })
    const wrapper = mount(draft)
    await importButton(wrapper).vm.$emit('press')
    expect(draft.commit).toHaveBeenCalledOnce()
  })
})
