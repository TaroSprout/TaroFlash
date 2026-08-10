import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { ref } from 'vue'
import FooterImport from '@/views/deck/mobile-footer/footer-import.vue'
import { cardImportKey } from '@/views/deck/composables/card-import'

function makeDraft(overrides = {}) {
  return {
    close: vi.fn(),
    dismiss: vi.fn(),
    commit: vi.fn(),
    toggleExpanded: vi.fn(),
    is_expanded: ref(true),
    importing: ref(false),
    has_cards: ref(false),
    cards: ref([]),
    ...overrides
  }
}

function mount(draft = makeDraft()) {
  return shallowMount(FooterImport, {
    global: { provide: { [cardImportKey]: draft }, renderStubDefaultSlot: true }
  })
}

function findButton(wrapper, testid) {
  return wrapper
    .findAllComponents({ name: 'UiButton' })
    .find((c) => c.attributes('data-testid') === testid)
}

describe('mobile-footer/footer-import', () => {
  test('shows the source/destination controls when expanded', () => {
    const wrapper = mount(makeDraft({ is_expanded: ref(true) }))
    expect(wrapper.find('[data-testid="deck-footer-import__controls"]').exists()).toBe(true)
  })

  test('hides the controls when collapsed', () => {
    const wrapper = mount(makeDraft({ is_expanded: ref(false) }))
    expect(wrapper.find('[data-testid="deck-footer-import__controls"]').exists()).toBe(false)
  })

  test('always renders the action bar, regardless of expanded state', () => {
    const wrapper = mount(makeDraft({ is_expanded: ref(false) }))
    expect(wrapper.find('[data-testid="deck-footer-import__bar"]').exists()).toBe(true)
  })

  test('clicking close calls draft.dismiss, not draft.close [obligation]', async () => {
    const draft = makeDraft()
    const wrapper = mount(draft)
    await findButton(wrapper, 'deck-footer-import__close').vm.$emit('press')
    expect(draft.dismiss).toHaveBeenCalledOnce()
    expect(draft.close).not.toHaveBeenCalled()
  })

  test('clicking the import button calls draft.commit', async () => {
    const draft = makeDraft({ has_cards: ref(true) })
    const wrapper = mount(draft)
    await findButton(wrapper, 'deck-footer-import__button').vm.$emit('press')
    expect(draft.commit).toHaveBeenCalledOnce()
  })

  test('the import button is disabled when there are no cards', () => {
    const wrapper = mount(makeDraft({ has_cards: ref(false) }))
    expect(findButton(wrapper, 'deck-footer-import__button').props('disabled')).toBe(true)
  })

  test('the import button is disabled while importing', () => {
    const wrapper = mount(makeDraft({ has_cards: ref(true), importing: ref(true) }))
    expect(findButton(wrapper, 'deck-footer-import__button').props('disabled')).toBe(true)
  })

  test('the import button is enabled with cards loaded and not importing', () => {
    const wrapper = mount(makeDraft({ has_cards: ref(true), importing: ref(false) }))
    expect(findButton(wrapper, 'deck-footer-import__button').props('disabled')).toBe(false)
  })

  test('clicking expand calls draft.toggleExpanded', async () => {
    const draft = makeDraft()
    const wrapper = mount(draft)
    await findButton(wrapper, 'deck-footer-import__expand').vm.$emit('press')
    expect(draft.toggleExpanded).toHaveBeenCalledOnce()
  })
})
