import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'

const { mockStartStudy } = vi.hoisted(() => ({ mockStartStudy: vi.fn() }))

vi.mock('@/composables/modals/use-study-modal', () => ({
  useStudyModal: () => ({ start: mockStartStudy })
}))

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  setup(_p, { slots, emit }) {
    const attrs = useAttrs()
    return () => h('button', { ...attrs, onClick: () => emit('click') }, slots.default?.())
  }
})

import Actions from '@/views/deck/deck-hero/actions.vue'

function makeEditor({ mode = 'view', setMode = vi.fn(), onSelectCard = vi.fn() } = {}) {
  return {
    mode: ref(mode),
    setMode,
    actions: { onSelectCard }
  }
}

function mount({ deck = {}, editor } = {}) {
  return shallowMount(Actions, {
    props: { deck: { id: 1, title: 'd', card_count: 10, due_count: 3, ...deck } },
    global: {
      stubs: { UiButton: UiButtonStub },
      provide: editor === undefined ? {} : { 'card-editor': editor }
    }
  })
}

const editBtn = (w) => w.find('[data-testid="overview-panel__settings-button"]')
const studyBtn = (w) => w.find('[data-testid="overview-panel__study-button"]')
const selectBtn = (w) => w.find('[data-testid="overview-panel__select-cards-button"]')

describe('deck-hero/actions', () => {
  beforeEach(() => {
    mockStartStudy.mockClear()
  })

  test('clicking study button starts a study session for the deck', async () => {
    const wrapper = mount({ deck: { id: 7 } })
    await studyBtn(wrapper).trigger('click')
    expect(mockStartStudy).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }))
  })

  test('renders the deck due_count inside the study button', () => {
    const wrapper = mount({ deck: { due_count: 12 } })
    expect(studyBtn(wrapper).text()).toContain('12')
  })

  test('shows "Edit Cards" when mode is view', () => {
    const wrapper = mount({ editor: makeEditor({ mode: 'view' }) })
    expect(editBtn(wrapper).text()).toContain('Edit Cards')
  })

  test('shows "Stop Editing" when mode is edit', () => {
    const wrapper = mount({ editor: makeEditor({ mode: 'edit' }) })
    expect(editBtn(wrapper).text()).toContain('Stop Editing')
  })

  test('clicking edit toggles view → edit', async () => {
    const setMode = vi.fn()
    const wrapper = mount({ editor: makeEditor({ mode: 'view', setMode }) })
    await editBtn(wrapper).trigger('click')
    expect(setMode).toHaveBeenCalledWith('edit')
  })

  test('clicking edit toggles edit → view', async () => {
    const setMode = vi.fn()
    const wrapper = mount({ editor: makeEditor({ mode: 'edit', setMode }) })
    await editBtn(wrapper).trigger('click')
    expect(setMode).toHaveBeenCalledWith('view')
  })

  test('clicking edit is a no-op when no editor is provided', async () => {
    const wrapper = mount()
    await editBtn(wrapper).trigger('click')
    expect(editBtn(wrapper).exists()).toBe(true)
  })

  test('clicking select-cards calls actions.onSelectCard with no args', async () => {
    const onSelectCard = vi.fn()
    const wrapper = mount({ editor: makeEditor({ onSelectCard }) })
    await selectBtn(wrapper).trigger('click')
    expect(onSelectCard).toHaveBeenCalledWith()
  })

  test('select-cards click is a no-op when no editor is provided', async () => {
    const wrapper = mount()
    await selectBtn(wrapper).trigger('click')
    expect(selectBtn(wrapper).exists()).toBe(true)
  })
})
