import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// ── Stubs ─────────────────────────────────────────────────────────────────────

// Card stub — renders the #editor named slot and exposes an image_controls
// object (mirroring the real Card's defineExpose) so FaceEditor's own
// `uploader` expose can be observed.
const CardStub = defineComponent({
  name: 'Card',
  inheritAttrs: false,
  props: ['side', 'mode', 'card_attributes', 'image_editing', 'disabled', 'error'],
  setup(props, { slots, expose }) {
    expose({
      image_controls: props.image_editing ? { openPicker: vi.fn(), onRemove: vi.fn() } : null
    })
    return () =>
      h(
        'div',
        {
          'data-testid': 'card-stub',
          'data-side': props.side,
          'data-mode': props.mode,
          'data-image-editing': String(!!props.image_editing),
          'data-disabled': String(!!props.disabled),
          'data-error': String(!!props.error)
        },
        [h('div', { 'data-testid': 'card-stub__editor' }, slots.editor?.())]
      )
  }
})

// TextEditor stub — renders a simple div with the content and forwards @update.
const TextEditorStub = defineComponent({
  name: 'TextEditor',
  inheritAttrs: false,
  props: ['content', 'attributes', 'placeholder', 'disabled'],
  emits: ['update'],
  setup(props, { attrs, emit, expose }) {
    expose({ focus: vi.fn() })
    return () =>
      h('div', {
        ...attrs,
        'data-testid': attrs['data-testid'] ?? 'text-editor-stub',
        'data-content': props.content,
        'data-placeholder': props.placeholder,
        'data-disabled': String(!!props.disabled)
      })
  }
})

// ── Imports ───────────────────────────────────────────────────────────────────

import FaceEditor from '@/components/card/face-editor.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCard(overrides = {}) {
  return {
    id: 1,
    deck_id: 1,
    front_text: 'front text',
    back_text: 'back text',
    front_image_path: null,
    back_image_path: null,
    ...overrides
  }
}

function mountFaceEditor(props = {}) {
  return shallowMount(FaceEditor, {
    props: {
      side: 'front',
      placeholder: 'Type here...',
      ...props
    },
    global: {
      stubs: { Card: CardStub, TextEditor: TextEditorStub }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FaceEditor — Card forwarding, with and without images [obligation]', () => {
  // The old no-images branch dropped `disabled`/`error` on the way to Card —
  // both configurations must forward both, every time.

  test('forwards disabled=true to Card when with_images is false [obligation]', () => {
    const wrapper = mountFaceEditor({ card: makeCard(), disabled: true })
    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-disabled')).toBe('true')
  })

  test('forwards error=true to Card when with_images is false [obligation]', () => {
    const wrapper = mountFaceEditor({ card: makeCard(), error: true })
    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-error')).toBe('true')
  })

  test('forwards disabled=true to Card when with_images is true [obligation]', () => {
    const wrapper = mountFaceEditor({ card: makeCard(), with_images: true, disabled: true })
    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-disabled')).toBe('true')
  })

  test('forwards error=true to Card when with_images is true [obligation]', () => {
    const wrapper = mountFaceEditor({ card: makeCard(), with_images: true, error: true })
    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-error')).toBe('true')
  })

  test('disabled/error default to false when omitted, in both configurations', () => {
    const without_images = mountFaceEditor({ card: makeCard() })
    expect(without_images.find('[data-testid="card-stub"]').attributes('data-disabled')).toBe(
      'false'
    )
    expect(without_images.find('[data-testid="card-stub"]').attributes('data-error')).toBe('false')

    const with_images = mountFaceEditor({ card: makeCard(), with_images: true })
    expect(with_images.find('[data-testid="card-stub"]').attributes('data-disabled')).toBe('false')
    expect(with_images.find('[data-testid="card-stub"]').attributes('data-error')).toBe('false')
  })

  test('forwards image_editing=with_images to Card', () => {
    const wrapper = mountFaceEditor({ card: makeCard(), with_images: true })
    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-image-editing')).toBe('true')
  })

  test('image_editing defaults to false when with_images is omitted', () => {
    const wrapper = mountFaceEditor({ card: makeCard() })
    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-image-editing')).toBe('false')
  })
})

describe('FaceEditor — card_attributes resolution', () => {
  test('forwards card_attributes as-is when provided', () => {
    const card_attributes = { front: { image_layout: 'behind' }, back: {} }
    const wrapper = mountFaceEditor({ card: makeCard(), card_attributes })
    expect(wrapper.findComponent(CardStub).props('card_attributes')).toEqual(card_attributes)
  })

  test('wraps a bare `attributes` prop into { front, back } when card_attributes is absent', () => {
    const attributes = { image_layout: 'above' }
    const wrapper = mountFaceEditor({ attributes })
    expect(wrapper.findComponent(CardStub).props('card_attributes')).toEqual({
      front: attributes,
      back: attributes
    })
  })

  test('falls back to empty objects when neither card_attributes nor attributes is given', () => {
    const wrapper = mountFaceEditor()
    expect(wrapper.findComponent(CardStub).props('card_attributes')).toEqual({
      front: {},
      back: {}
    })
  })
})

describe('FaceEditor — text/placeholder/side wiring', () => {
  test('card stub receives the correct side prop', () => {
    const wrapper = mountFaceEditor({ card: makeCard(), side: 'back' })
    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-side')).toBe('back')
  })

  test('TextEditor receives the card front text for side=front', () => {
    const wrapper = mountFaceEditor({ card: makeCard(), side: 'front' })
    expect(wrapper.find('[data-testid="face-editor__input"]').attributes('data-content')).toBe(
      'front text'
    )
  })

  test('TextEditor receives the card back text for side=back', () => {
    const wrapper = mountFaceEditor({ card: makeCard(), side: 'back' })
    expect(wrapper.find('[data-testid="face-editor__input"]').attributes('data-content')).toBe(
      'back text'
    )
  })

  test('an explicit text prop overrides the card text', () => {
    const wrapper = mountFaceEditor({ card: makeCard(), side: 'front', text: 'override' })
    expect(wrapper.find('[data-testid="face-editor__input"]').attributes('data-content')).toBe(
      'override'
    )
  })

  test('TextEditor receives the placeholder prop', () => {
    const wrapper = mountFaceEditor({ card: makeCard(), placeholder: 'Write here' })
    expect(wrapper.find('[data-testid="face-editor__input"]').attributes('data-placeholder')).toBe(
      'Write here'
    )
  })

  test('input_testid prop overrides the default TextEditor testid', () => {
    const wrapper = mountFaceEditor({ card: makeCard(), input_testid: 'study-card-edit__input' })
    expect(wrapper.find('[data-testid="study-card-edit__input"]').exists()).toBe(true)
  })

  test('emits update with side and text when TextEditor emits update', async () => {
    const wrapper = mountFaceEditor({ card: makeCard(), side: 'front' })
    await wrapper.findComponent(TextEditorStub).vm.$emit('update', 'new text')
    expect(wrapper.emitted('update')).toEqual([['front', 'new text']])
  })

  test('TextEditor disabled mirrors the FaceEditor disabled prop', () => {
    const wrapper = mountFaceEditor({ card: makeCard(), disabled: true })
    expect(wrapper.find('[data-testid="face-editor__input"]').attributes('data-disabled')).toBe(
      'true'
    )
  })
})

describe('FaceEditor — defineExpose surface', () => {
  test('uploader surfaces the Card image_controls when images are enabled [obligation]', () => {
    const wrapper = mountFaceEditor({ card: makeCard(), with_images: true })
    expect(wrapper.vm.uploader).not.toBeNull()
    expect(typeof wrapper.vm.uploader.openPicker).toBe('function')
    expect(typeof wrapper.vm.uploader.onRemove).toBe('function')
  })

  test('uploader is null when images are not enabled [obligation]', () => {
    const wrapper = mountFaceEditor({ card: makeCard() })
    expect(wrapper.vm.uploader).toBeNull()
  })

  test('exposes a focus function', () => {
    const wrapper = mountFaceEditor({ card: makeCard() })
    expect(typeof wrapper.vm.focus).toBe('function')
    expect(() => wrapper.vm.focus()).not.toThrow()
  })
})

describe('FaceEditor — editor_key remount strategy', () => {
  test('no crash when card_key + side change together', async () => {
    const wrapper = mountFaceEditor({ card: makeCard(), card_key: 'client-abc', side: 'front' })
    expect(wrapper.find('[data-testid="face-editor__input"]').exists()).toBe(true)

    await wrapper.setProps({ card_key: 'client-abc', side: 'back' })
    expect(wrapper.find('[data-testid="face-editor__input"]').exists()).toBe(true)
  })

  test('falls back to card.id + side when no card_key is given', () => {
    const wrapper = mountFaceEditor({ card: makeCard({ id: 99 }), side: 'front' })
    expect(wrapper.find('[data-testid="face-editor__input"]').exists()).toBe(true)
  })
})
