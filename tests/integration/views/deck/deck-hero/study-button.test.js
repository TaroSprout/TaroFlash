import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'

const { mockStartStudy } = vi.hoisted(() => ({ mockStartStudy: vi.fn() }))

vi.mock('@/views/study-session/composables/study-modal', () => ({
  useStudyModal: () => ({ start: mockStartStudy })
}))

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: ['disabled'],
  emits: ['press'],
  setup(props, { slots, emit }) {
    const attrs = useAttrs()
    return () =>
      h(
        'button',
        {
          ...attrs,
          disabled: props.disabled,
          onClick: () => emit('press')
        },
        slots.default?.()
      )
  }
})

import StudyButton from '@/views/deck/deck-hero/study-button.vue'

function mount(deck = {}) {
  return shallowMount(StudyButton, {
    props: { deck: { id: 1, title: 'd', card_count: 10, due_count: 3, ...deck } },
    global: { stubs: { UiButton: UiButtonStub } }
  })
}

const studyBtn = (w) => w.find('[data-testid="overview-panel__study-button"]')

describe('deck-hero/study-button', () => {
  beforeEach(() => {
    mockStartStudy.mockClear()
  })

  test('renders the study button', () => {
    const wrapper = mount()
    expect(studyBtn(wrapper).exists()).toBe(true)
  })

  test('clicking study button starts a study session for the deck', async () => {
    const wrapper = mount({ id: 7 })
    await studyBtn(wrapper).trigger('click')
    expect(mockStartStudy).toHaveBeenCalledWith([7])
  })

  test('renders the deck due_count inside the study button', () => {
    const wrapper = mount({ due_count: 12 })
    expect(studyBtn(wrapper).text()).toContain('12')
  })

  test('study button is disabled when due_count is 0 [obligation]', () => {
    const wrapper = mount({ due_count: 0 })
    expect(studyBtn(wrapper).attributes('disabled')).toBeDefined()
  })

  test('study button is disabled when due_count is undefined [obligation]', () => {
    const wrapper = mount({ due_count: undefined })
    expect(studyBtn(wrapper).attributes('disabled')).toBeDefined()
  })

  test('study button shows no-cards-due text when due_count is 0 [obligation]', () => {
    const wrapper = mount({ due_count: 0 })
    expect(studyBtn(wrapper).text()).toContain('No cards due')
  })

  test('study button shows no-cards-due text when due_count is undefined [obligation]', () => {
    const wrapper = mount({ due_count: undefined })
    expect(studyBtn(wrapper).text()).toContain('No cards due')
  })

  test('study button is enabled when due_count is greater than 0 [obligation]', () => {
    const wrapper = mount({ due_count: 5 })
    expect(studyBtn(wrapper).attributes('disabled')).toBeUndefined()
  })

  test('study button shows due count when due_count > 0 [obligation]', () => {
    const wrapper = mount({ due_count: 7 })
    expect(studyBtn(wrapper).text()).toContain('7')
  })

  test('clicking the enabled study button starts the session [obligation]', async () => {
    const wrapper = mount({ id: 3, due_count: 5 })
    await studyBtn(wrapper).trigger('click')
    expect(mockStartStudy).toHaveBeenCalledWith([3])
  })
})
