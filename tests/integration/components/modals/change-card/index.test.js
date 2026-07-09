import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { ref } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const mockOnSubmit = vi.fn()
const changeCardState = {
  is_loading: ref(false),
  is_submitting: ref(false),
  is_ready: ref(true),
  load_error: ref(false)
}

vi.mock('gsap', () => ({
  gsap: {
    set: vi.fn(),
    to: vi.fn((_el, opts) => opts?.onComplete?.()),
    fromTo: vi.fn((_el, _from, opts) => opts?.onComplete?.())
  }
}))

vi.mock('@/views/settings/tab-subscription/use-change-cc', () => ({
  useChangeCard: () => ({
    is_loading: changeCardState.is_loading,
    is_submitting: changeCardState.is_submitting,
    is_ready: changeCardState.is_ready,
    load_error: changeCardState.load_error,
    onSubmit: mockOnSubmit
  })
}))

import ChangeCardModal from '@/views/settings/tab-subscription/change-cc-modal.vue'

// ── Setup ──────────────────────────────────────────────────────────────────────

function mountChangeCardModal({ has_existing_card = false, close = vi.fn() } = {}) {
  return shallowMount(ChangeCardModal, {
    props: { has_existing_card, close },
    global: {
      stubs: { DialogCard: false, DialogCardHeader: false },
      renderStubDefaultSlot: true
    }
  })
}

beforeEach(() => {
  changeCardState.is_loading.value = false
  changeCardState.is_submitting.value = false
  changeCardState.is_ready.value = true
  changeCardState.load_error.value = false
  mockOnSubmit.mockReset()
})

// ── has_existing_card locale switching [obligation] ─────────────────────────────

describe('ChangeCardModal — has_existing_card locale switching [obligation]', () => {
  test('[obligation] uses the add-title / add-submit keys when has_existing_card is false', () => {
    const wrapper = mountChangeCardModal({ has_existing_card: false })

    expect(wrapper.find('[data-testid="dialog-card-header__title"]').text()).toBe('Add a card')
    expect(wrapper.find('[data-testid="change-card-modal__submit"]').text()).toBe('Save card')
  })

  test('[obligation] uses the change-title / change-submit keys when has_existing_card is true', () => {
    const wrapper = mountChangeCardModal({ has_existing_card: true })

    expect(wrapper.find('[data-testid="dialog-card-header__title"]').text()).toBe('Change card')
    expect(wrapper.find('[data-testid="change-card-modal__submit"]').text()).toBe('Update card')
  })
})

// ── load states ───────────────────────────────────────────────────────────────

describe('ChangeCardModal — load states', () => {
  test('shows the loading state and hides the footer while is_loading', () => {
    changeCardState.is_loading.value = true
    const wrapper = mountChangeCardModal()

    expect(wrapper.find('[data-testid="change-card-modal__loading"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="change-card-modal__footer"]').exists()).toBe(false)
  })

  test('shows the error state and hides the footer when load_error is true', () => {
    changeCardState.load_error.value = true
    const wrapper = mountChangeCardModal()

    expect(wrapper.find('[data-testid="change-card-modal__error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="change-card-modal__footer"]').exists()).toBe(false)
  })

  test('shows the footer once loaded without error', () => {
    const wrapper = mountChangeCardModal()

    expect(wrapper.find('[data-testid="change-card-modal__footer"]').exists()).toBe(true)
  })
})

// ── submit button ─────────────────────────────────────────────────────────────

function findButton(wrapper, testid) {
  return wrapper
    .findAllComponents({ name: 'UiButton' })
    .find((button) => button.attributes('data-testid') === testid)
}

describe('ChangeCardModal — submit button', () => {
  test('is disabled while is_ready is false', () => {
    changeCardState.is_ready.value = false
    const wrapper = mountChangeCardModal()

    expect(findButton(wrapper, 'change-card-modal__submit').props('disabled')).toBe(true)
  })

  test('calls onSubmit from useChangeCard when pressed', () => {
    const wrapper = mountChangeCardModal()

    findButton(wrapper, 'change-card-modal__submit').vm.$emit('press')

    expect(mockOnSubmit).toHaveBeenCalledOnce()
  })
})

// ── close ─────────────────────────────────────────────────────────────────────

describe('ChangeCardModal — close', () => {
  test('close is disabled while is_submitting', () => {
    changeCardState.is_submitting.value = true
    const wrapper = mountChangeCardModal()

    expect(findButton(wrapper, 'dialog-card__close').props('disabled')).toBe(true)
  })

  test('calls close() with no argument when the close button is pressed', () => {
    const close = vi.fn()
    const wrapper = mountChangeCardModal({ close })

    findButton(wrapper, 'dialog-card__close').vm.$emit('press')

    expect(close).toHaveBeenCalledWith()
  })
})
