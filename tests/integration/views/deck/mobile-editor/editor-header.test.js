import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { ref } from 'vue'
import EditorHeader from '@/views/deck/mobile-editor/editor-header.vue'
import { mobileCardEditorKey } from '@/views/deck/mobile-editor/use-mobile-card-editor'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEditorContext(overrides = {}) {
  return {
    saving: ref(false),
    has_image: ref(false),
    image_controls: ref(null),
    moveCard: vi.fn(),
    deleteCard: vi.fn(),
    ...overrides
  }
}

function mountHeader(context) {
  return shallowMount(EditorHeader, {
    global: { provide: { [mobileCardEditorKey]: context } }
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('EditorHeader', () => {
  test('renders only the menu, no saving indicator, when not saving', () => {
    const wrapper = mountHeader(makeEditorContext({ saving: ref(false) }))
    expect(wrapper.find('[data-testid="mobile-card-editor__saving"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="mobile-card-editor__menu"]').exists()).toBe(true)
  })

  test('shows the saving indicator when saving is true', () => {
    const wrapper = mountHeader(makeEditorContext({ saving: ref(true) }))
    expect(wrapper.find('[data-testid="mobile-card-editor__saving"]').exists()).toBe(true)
  })

  test('menu options include "add image" when there is no image and image_controls is registered', () => {
    const context = makeEditorContext({
      has_image: ref(false),
      image_controls: ref({ openPicker: vi.fn(), onRemove: vi.fn() })
    })
    const wrapper = mountHeader(context)
    const values = wrapper
      .findComponent({ name: 'UiDropdownButton' })
      .props('options')
      .map((o) => o.value)
    expect(values).toContain('image-add')
  })

  test('menu options include "replace" and "remove" image when has_image is true', () => {
    const context = makeEditorContext({
      has_image: ref(true),
      image_controls: ref({ openPicker: vi.fn(), onRemove: vi.fn() })
    })
    const wrapper = mountHeader(context)
    const values = wrapper
      .findComponent({ name: 'UiDropdownButton' })
      .props('options')
      .map((o) => o.value)
    expect(values).toEqual(expect.arrayContaining(['image-add', 'image-remove']))
  })

  test('omits image options entirely when image_controls is null (no mounted image layer)', () => {
    const context = makeEditorContext({ image_controls: ref(null) })
    const wrapper = mountHeader(context)
    const values = wrapper
      .findComponent({ name: 'UiDropdownButton' })
      .props('options')
      .map((o) => o.value)
    expect(values).not.toContain('image-add')
    expect(values).not.toContain('image-remove')
  })

  test('always includes move and delete options', () => {
    const wrapper = mountHeader(makeEditorContext())
    const values = wrapper
      .findComponent({ name: 'UiDropdownButton' })
      .props('options')
      .map((o) => o.value)
    expect(values).toEqual(expect.arrayContaining(['move', 'delete']))
  })

  test('selecting "image-add" calls image_controls.openPicker', async () => {
    const openPicker = vi.fn()
    const context = makeEditorContext({
      has_image: ref(false),
      image_controls: ref({ openPicker, onRemove: vi.fn() })
    })
    const wrapper = mountHeader(context)
    await wrapper
      .findComponent({ name: 'UiDropdownButton' })
      .vm.$emit('select', { value: 'image-add' })
    expect(openPicker).toHaveBeenCalled()
  })

  test('selecting "image-remove" calls image_controls.onRemove', async () => {
    const onRemove = vi.fn()
    const context = makeEditorContext({
      has_image: ref(true),
      image_controls: ref({ openPicker: vi.fn(), onRemove })
    })
    const wrapper = mountHeader(context)
    await wrapper
      .findComponent({ name: 'UiDropdownButton' })
      .vm.$emit('select', { value: 'image-remove' })
    expect(onRemove).toHaveBeenCalled()
  })

  test('selecting "move" calls moveCard', async () => {
    const context = makeEditorContext()
    const wrapper = mountHeader(context)
    await wrapper.findComponent({ name: 'UiDropdownButton' }).vm.$emit('select', { value: 'move' })
    expect(context.moveCard).toHaveBeenCalled()
  })

  test('selecting "delete" calls deleteCard', async () => {
    const context = makeEditorContext()
    const wrapper = mountHeader(context)
    await wrapper
      .findComponent({ name: 'UiDropdownButton' })
      .vm.$emit('select', { value: 'delete' })
    expect(context.deleteCard).toHaveBeenCalled()
  })
})
