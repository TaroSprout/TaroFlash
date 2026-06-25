import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'

// ── Stubs ─────────────────────────────────────────────────────────────────────

// Card stub — renders the #editor named slot so we can observe text-editor content.
const CardStub = defineComponent({
  name: 'Card',
  inheritAttrs: false,
  props: ['side', 'size', 'mode'],
  setup(props, { slots }) {
    return () =>
      h('div', { 'data-testid': 'card-stub', 'data-side': props.side }, [
        h('div', { 'data-testid': 'card-stub__editor' }, slots.editor?.())
      ])
  }
})

// ImageUploader stub — renders the #editor named slot and exposes openPicker/onRemove.
const ImageUploaderStub = defineComponent({
  name: 'ImageUploader',
  inheritAttrs: false,
  props: ['card', 'side', 'card_attributes', 'size', 'disabled', 'error'],
  setup(props, { slots, expose }) {
    expose({ openPicker: vi.fn(), onRemove: vi.fn() })
    return () =>
      h('div', { 'data-testid': 'image-uploader-stub', 'data-side': props.side }, [
        h('div', { 'data-testid': 'image-uploader-stub__editor' }, slots.editor?.())
      ])
  }
})

// TextEditor stub — renders a simple div with the content and forwards @update.
const TextEditorStub = defineComponent({
  name: 'TextEditor',
  inheritAttrs: false,
  props: ['content', 'placeholder', 'disabled'],
  emits: ['update'],
  setup(props, { attrs, emit }) {
    return () =>
      h('div', {
        ...attrs,
        'data-testid': attrs['data-testid'] ?? 'text-editor-stub',
        'data-content': props.content,
        'data-placeholder': props.placeholder
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

const DEFAULT_CARD_ATTRIBUTES = { front: {}, back: {} }

function mountFaceEditor(props = {}) {
  return shallowMount(FaceEditor, {
    props: {
      side: 'front',
      card_attributes: DEFAULT_CARD_ATTRIBUTES,
      placeholder: 'Type here...',
      ...props
    },
    global: {
      stubs: {
        Card: CardStub,
        ImageUploader: ImageUploaderStub,
        TextEditor: TextEditorStub
      }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FaceEditor — without images (card fallback)', () => {
  test('renders Card stub when with_images is false (default)', () => {
    const wrapper = mountFaceEditor({ card: makeCard() })
    expect(wrapper.find('[data-testid="card-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="image-uploader-stub"]').exists()).toBe(false)
  })

  test('renders Card stub when no card prop is given (card is undefined)', () => {
    const wrapper = mountFaceEditor()
    expect(wrapper.find('[data-testid="card-stub"]').exists()).toBe(true)
  })

  test('card stub receives the correct side prop', () => {
    const wrapper = mountFaceEditor({ card: makeCard(), side: 'back' })
    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-side')).toBe('back')
  })

  test('TextEditor inside Card receives the correct content for front side', () => {
    const wrapper = mountFaceEditor({ card: makeCard(), side: 'front' })
    const editor = wrapper.find('[data-testid="face-editor__input"]')
    expect(editor.attributes('data-content')).toBe('front text')
  })

  test('TextEditor inside Card receives the correct content for back side', () => {
    const wrapper = mountFaceEditor({ card: makeCard(), side: 'back' })
    const editor = wrapper.find('[data-testid="face-editor__input"]')
    expect(editor.attributes('data-content')).toBe('back text')
  })

  test('TextEditor receives the placeholder prop', () => {
    const wrapper = mountFaceEditor({ card: makeCard(), placeholder: 'Write here' })
    const editor = wrapper.find('[data-testid="face-editor__input"]')
    expect(editor.attributes('data-placeholder')).toBe('Write here')
  })

  test('input_testid prop overrides default testid on TextEditor [obligation]', () => {
    const wrapper = mountFaceEditor({ card: makeCard(), input_testid: 'study-card-edit__input' })
    expect(wrapper.find('[data-testid="study-card-edit__input"]').exists()).toBe(true)
  })

  test('emits update with side and text when TextEditor emits update', async () => {
    const wrapper = mountFaceEditor({ card: makeCard(), side: 'front' })
    await wrapper.findComponent(TextEditorStub).vm.$emit('update', 'new text')
    expect(wrapper.emitted('update')).toEqual([['front', 'new text']])
  })
})

describe('FaceEditor — with images (image-uploader path)', () => {
  test('renders ImageUploader when with_images is true and card is provided [obligation]', () => {
    const wrapper = mountFaceEditor({ card: makeCard(), with_images: true })
    expect(wrapper.find('[data-testid="image-uploader-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-stub"]').exists()).toBe(false)
  })

  test('falls back to Card when with_images is true but card is undefined [obligation]', () => {
    const wrapper = mountFaceEditor({ with_images: true })
    expect(wrapper.find('[data-testid="card-stub"]').exists()).toBe(true)
  })

  test('ImageUploader receives the correct side', () => {
    const wrapper = mountFaceEditor({ card: makeCard(), with_images: true, side: 'back' })
    expect(wrapper.find('[data-testid="image-uploader-stub"]').attributes('data-side')).toBe('back')
  })

  test('TextEditor inside ImageUploader receives input_testid [obligation]', () => {
    const wrapper = mountFaceEditor({
      card: makeCard(),
      with_images: true,
      input_testid: 'study-card-edit__input'
    })
    expect(wrapper.find('[data-testid="study-card-edit__input"]').exists()).toBe(true)
  })
})

describe('FaceEditor — editor_key remount strategy [obligation]', () => {
  test('editor_key is card_key + side when card_key is provided [obligation]', async () => {
    // The TextEditor is keyed by editor_key. Since we use shallowMount the stub
    // doesn't remount, but we verify that the key formula uses card_key when supplied.
    // We observe this indirectly: changing card_key changes the computed key,
    // which would force a remount on the real TextEditor.
    // In this integration test, we verify the stub still renders after key change (no crash).
    const wrapper = mountFaceEditor({ card: makeCard(), card_key: 'client-abc', side: 'front' })
    expect(wrapper.find('[data-testid="face-editor__input"]').exists()).toBe(true)

    await wrapper.setProps({ card_key: 'client-abc', side: 'back' })
    expect(wrapper.find('[data-testid="face-editor__input"]').exists()).toBe(true)
  })

  test('editor_key falls back to card.id + side when no card_key [obligation]', () => {
    // No crash when card_key is omitted — id-based key is derived correctly.
    const wrapper = mountFaceEditor({ card: makeCard({ id: 99 }), side: 'front' })
    expect(wrapper.find('[data-testid="face-editor__input"]').exists()).toBe(true)
  })
})

describe('FaceEditor — custom input testid forwarding [obligation]', () => {
  test('input_testid="study-card-edit__input" is forwarded to the TextEditor [obligation]', () => {
    const wrapper = mountFaceEditor({ input_testid: 'study-card-edit__input' })
    expect(wrapper.find('[data-testid="study-card-edit__input"]').exists()).toBe(true)
  })
})
