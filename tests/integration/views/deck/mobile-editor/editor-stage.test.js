import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, shallowRef } from 'vue'

// FaceEditor stub — exposes `uploader` (mirroring the real component's
// defineExpose contract) so editor-stage's image_controls publication can be
// observed both when images are enabled and when there's no mounted layer.
const FaceEditorStub = defineComponent({
  name: 'FaceEditor',
  inheritAttrs: false,
  props: {
    card: Object,
    side: String,
    card_key: [String, Number],
    card_attributes: Object,
    placeholder: String,
    with_images: Boolean
  },
  emits: ['update'],
  setup(_props, { expose }) {
    expose({ uploader: { openPicker: vi.fn(), onRemove: vi.fn() } })
    return () => h('div', { 'data-testid': 'face-editor-stub' })
  }
})

import EditorStage from '@/views/deck/mobile-editor/editor-stage.vue'
import { mobileCardEditorKey } from '@/views/deck/mobile-editor/use-mobile-card-editor'

function makeEditor(overrides = {}) {
  return {
    current: ref({ id: 1, client_id: 'c1', front_text: 'Q', back_text: 'A' }),
    side: ref('front'),
    card_attributes: { front: {}, back: {} },
    update: vi.fn(),
    image_controls: shallowRef(null),
    ...overrides
  }
}

function mountStage(editor = makeEditor()) {
  return {
    wrapper: shallowMount(EditorStage, {
      global: {
        provide: { [mobileCardEditorKey]: editor },
        stubs: { FaceEditor: FaceEditorStub }
      }
    }),
    editor
  }
}

describe('EditorStage', () => {
  test('renders the stage root', () => {
    const { wrapper } = mountStage()
    expect(wrapper.find('[data-testid="mobile-card-editor__stage"]').exists()).toBe(true)
  })

  test('renders the FaceEditor with with_images enabled when there is a current card', () => {
    const { wrapper } = mountStage()
    const face = wrapper.findComponent(FaceEditorStub)
    expect(face.exists()).toBe(true)
    expect(face.props('with_images')).toBe(true)
  })

  test('does not render the FaceEditor when there is no current card', () => {
    const { wrapper } = mountStage(makeEditor({ current: ref(null) }))
    expect(wrapper.findComponent(FaceEditorStub).exists()).toBe(false)
  })

  test('forwards side and card_key from the injected editor', () => {
    const { wrapper } = mountStage(makeEditor({ side: ref('back') }))
    const face = wrapper.findComponent(FaceEditorStub)
    expect(face.props('side')).toBe('back')
    expect(face.props('card_key')).toBe('c1')
  })

  test('placeholder resolves to the front-placeholder translation on the front side', () => {
    const { wrapper } = mountStage(makeEditor({ side: ref('front') }))
    expect(wrapper.findComponent(FaceEditorStub).props('placeholder')).toBe('Front')
  })

  test('placeholder resolves to the back-placeholder translation on the back side', () => {
    const { wrapper } = mountStage(makeEditor({ side: ref('back') }))
    expect(wrapper.findComponent(FaceEditorStub).props('placeholder')).toBe('Back')
  })

  test('emits through to update() when the FaceEditor emits update', async () => {
    const { wrapper, editor } = mountStage()
    await wrapper.findComponent(FaceEditorStub).vm.$emit('update', 'front', 'new text')
    expect(editor.update).toHaveBeenCalledWith('front', 'new text')
  })

  // ── image_controls publication [obligation] ─────────────────────────────────
  // The header menu's `image_controls` reads whatever this watchEffect
  // publishes — surface both the enabled and the null (no image layer) case.

  test('publishes openPicker/onRemove from the mounted FaceEditor uploader [obligation]', async () => {
    const { editor } = mountStage()
    await nextTick()
    expect(editor.image_controls.value).not.toBeNull()
    expect(typeof editor.image_controls.value.openPicker).toBe('function')
    expect(typeof editor.image_controls.value.onRemove).toBe('function')
  })

  test('image_controls is null once the FaceEditor unmounts (no current card) [obligation]', async () => {
    const editor = makeEditor()
    const { wrapper } = mountStage(editor)
    await nextTick()
    expect(editor.image_controls.value).not.toBeNull()

    editor.current.value = null
    await nextTick()

    expect(editor.image_controls.value).toBeNull()
    wrapper.unmount()
  })
})
