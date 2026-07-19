import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import Card from '@/components/card/index.vue'

// Stub GSAP so transition hooks don't error in browser mode
vi.mock('gsap', () => ({
  gsap: {
    fromTo: vi.fn((_el, _from, to) => to?.onComplete?.()),
    to: vi.fn((_el, opts) => opts?.onComplete?.())
  }
}))

// Card's flip transition now delegates to flipEnter/flipLeave instead of an
// inline GSAP copy [obligation] — spy on the util so the delegation + the
// flip-complete/flip-out-complete emits can be asserted directly. onComplete
// fires asynchronously, like the real GSAP animation — calling it
// synchronously races Vue's own transition lifecycle and throws.
const { flipEnterMock, flipLeaveMock } = vi.hoisted(() => ({
  flipEnterMock: vi.fn((_el, _axis, onComplete) => setTimeout(() => onComplete?.(), 0)),
  flipLeaveMock: vi.fn((_el, _axis, onComplete) => setTimeout(() => onComplete?.(), 0))
}))
vi.mock('@/utils/animations/flip', () => ({
  flipEnter: flipEnterMock,
  flipLeave: flipLeaveMock
}))

// CardFace stub that renders its #image and #editor named slots so slot-
// forwarding tests can observe what the Card passes through.
const CardFaceStub = defineComponent({
  name: 'CardFace',
  props: ['image', 'text', 'mode', 'attributes'],
  setup(props, { slots }) {
    return () =>
      h('div', { 'data-testid': 'card-face-stub', 'data-image': props.image }, [
        h('div', { 'data-testid': 'card-face-stub__image-slot' }, slots.image?.()),
        h('div', { 'data-testid': 'card-face-stub__editor-slot' }, slots.editor?.())
      ])
  }
})

function mountCard(props = {}, slots = {}, extraOpts = {}) {
  return shallowMount(Card, {
    props: { side: 'front', ...props },
    slots,
    global: { stubs: { CardFace: CardFaceStub }, directives: { sfx: {} } },
    ...extraOpts
  })
}

// FaceImageLayer stub — mirrors the real component's defineExpose surface so
// the card's data-active/data-dragging/data-loading + image_controls wiring
// (previously owned by the deleted image-uploader.vue wrapper) can be
// asserted directly on the card root [obligation].
const FaceImageLayerStub = defineComponent({
  name: 'FaceImageLayer',
  props: ['card', 'side', 'attributes', 'root', 'disabled'],
  setup(_props, { expose }) {
    expose({
      active: true,
      dragging: true,
      pending: true,
      covered: true,
      region_dropzone: false,
      openPicker: vi.fn(),
      onRemove: vi.fn()
    })
    return () => h('div', { 'data-testid': 'face-image-layer-stub' })
  }
})

function makeRegionDropzoneStub() {
  return defineComponent({
    name: 'FaceImageLayer',
    props: ['card', 'side', 'attributes', 'root', 'disabled'],
    setup(_props, { expose }) {
      expose({
        active: true,
        dragging: false,
        pending: false,
        covered: false,
        region_dropzone: true,
        image_url: 'https://cdn/cards/f.png',
        error_message: '',
        openPicker: vi.fn(),
        onRemove: vi.fn(),
        onDismissError: vi.fn(),
        onRegionPointerEnter: vi.fn(),
        onPointerLeave: vi.fn()
      })
      return () => h('div', { 'data-testid': 'face-image-layer-stub' })
    }
  })
}

function mountEditableCard(props = {}, slots = {}) {
  return shallowMount(Card, {
    props: { side: 'front', mode: 'edit', image_editing: true, ...props },
    slots,
    global: {
      stubs: { CardFace: CardFaceStub, FaceImageLayer: FaceImageLayerStub },
      directives: { sfx: {} }
    }
  })
}

describe('Card (cover side)', () => {
  // ── Cover rendering ──────────────────────────────��────────────────────────────

  test('renders card-cover-stub when side is cover', () => {
    const wrapper = mountCard({ side: 'cover' })
    expect(wrapper.findComponent({ name: 'CardCover' }).exists()).toBe(true)
  })

  test('does not render card-cover-stub when side is front', () => {
    const wrapper = mountCard({ side: 'front' })
    expect(wrapper.findComponent({ name: 'CardCover' }).exists()).toBe(false)
  })

  test('does not render card-cover-stub when side is back', () => {
    const wrapper = mountCard({ side: 'back' })
    expect(wrapper.findComponent({ name: 'CardCover' }).exists()).toBe(false)
  })

  // ── cover_config forwarding ──────────────────────────────��────────────────────

  test('passes cover_config to card-cover', () => {
    const cover_config = { bg_color: 'blue-500', pattern: 'stars' }
    const wrapper = mountCard({ side: 'cover', cover_config })
    const coverStub = wrapper.findComponent({ name: 'CardCover' })
    expect(coverStub.props('cover')).toEqual(cover_config)
  })

  test('passes undefined cover_config when not provided', () => {
    const wrapper = mountCard({ side: 'cover' })
    const coverStub = wrapper.findComponent({ name: 'CardCover' })
    expect(coverStub.props('cover')).toBeUndefined()
  })

  // ── error prop → data-error attribute (drives red outline in CSS) ────────────

  test('does not set data-error on the root when error is false', () => {
    const wrapper = mountCard({ error: false })
    expect(wrapper.find('[data-testid="card"]').attributes('data-error')).toBeUndefined()
  })

  test('does not set data-error on the root when error is omitted (defaults to false)', () => {
    const wrapper = mountCard()
    expect(wrapper.find('[data-testid="card"]').attributes('data-error')).toBeUndefined()
  })

  test('sets data-error on the root when error is true', () => {
    const wrapper = mountCard({ error: true })
    // Binding uses `error || undefined` so the attribute is absent when false
    // and present when true; we don't assert a specific value string.
    expect(wrapper.find('[data-testid="card"]').attributes('data-error')).toBeDefined()
  })

  // ── shimmer prop [obligation] ─────────────────────────────────────────────

  test('renders .card-shimmer overlay when shimmer=true [obligation]', () => {
    const wrapper = mountCard({ shimmer: true })
    expect(wrapper.find('.card-shimmer').exists()).toBe(true)
  })

  test('does not render .card-shimmer overlay when shimmer=false [obligation]', () => {
    const wrapper = mountCard({ shimmer: false })
    expect(wrapper.find('.card-shimmer').exists()).toBe(false)
  })

  test('does not render .card-shimmer when shimmer is omitted (defaults to false) [obligation]', () => {
    const wrapper = mountCard()
    expect(wrapper.find('.card-shimmer').exists()).toBe(false)
  })
})

describe('Card slot-forwarding [obligation]', () => {
  // ── #image slot forwarding ────────────────────────────────────────────────────
  // The card forwards the caller's #image slot to the active face's #image slot.
  // When no #image slot is provided the face uses its default <img> from the
  // `image` prop. This is a regression guard — an unfilled forwarded slot must
  // not blank out images in study/grid views.

  test('forwards the #image slot to the front face', () => {
    const wrapper = mountCard(
      { side: 'front' },
      { image: '<div data-testid="slot-content">x</div>' }
    )
    expect(wrapper.find('[data-testid="slot-content"]').exists()).toBe(true)
  })

  test('forwards the #image slot to the back face', () => {
    const wrapper = mountCard(
      { side: 'back' },
      { image: '<div data-testid="slot-content">x</div>' }
    )
    expect(wrapper.find('[data-testid="slot-content"]').exists()).toBe(true)
  })

  test('renders default <img> from front_image_path when no #image slot is provided', () => {
    const wrapper = mountCard({ side: 'front', front_image_path: 'cards/front.jpg' })
    // The default slot in card-face renders an <img> — card-face-stub exposes
    // via findComponent since shallowMount stubs the inner CardFace.
    const face = wrapper.findComponent({ name: 'CardFace' })
    expect(face.props('image')).toContain('cards/front.jpg')
  })

  test('renders default <img> from back_image_path when no #image slot is provided', () => {
    const wrapper = mountCard({ side: 'back', back_image_path: 'cards/back.jpg' })
    const face = wrapper.findComponent({ name: 'CardFace' })
    expect(face.props('image')).toContain('cards/back.jpg')
  })

  test('passes card_attributes.front to the front face', () => {
    const card_attributes = { front: { image_layout: 'behind' }, back: {} }
    const wrapper = mountCard({ side: 'front', card_attributes })
    const face = wrapper.findComponent({ name: 'CardFace' })
    expect(face.props('attributes')).toEqual({ image_layout: 'behind' })
  })

  test('passes card_attributes.back to the back face', () => {
    const card_attributes = { front: {}, back: { image_layout: 'below' } }
    const wrapper = mountCard({ side: 'back', card_attributes })
    const face = wrapper.findComponent({ name: 'CardFace' })
    expect(face.props('attributes')).toEqual({ image_layout: 'below' })
  })
})

describe('Card — flip delegates to flipEnter/flipLeave [obligation]', () => {
  // @vue/test-utils auto-stubs <transition> by default, which never invokes
  // @enter/@leave — unstub it here so the real transition lifecycle (and the
  // card's onEnter/onLeave delegation to flip.ts) actually runs. The mocked
  // flipEnter/flipLeave call onComplete asynchronously, like the real GSAP
  // animation would — calling it synchronously races Vue's own transition
  // book-keeping and throws.
  function mountRealTransition(props = {}) {
    return mount(Card, {
      props: { side: 'cover', ...props },
      global: { directives: { sfx: {} }, stubs: { transition: false } }
    })
  }

  test('emits flip-complete once flipEnter completes', async () => {
    const wrapper = mountRealTransition()
    await wrapper.setProps({ side: 'front' })
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(flipEnterMock).toHaveBeenCalledWith(expect.anything(), 'y', expect.any(Function))
    expect(wrapper.emitted('flip-complete')).toBeTruthy()
  })

  test('emits flip-out-complete once flipLeave completes', async () => {
    const wrapper = mountRealTransition()
    await wrapper.setProps({ side: 'front' })
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(flipLeaveMock).toHaveBeenCalledWith(expect.anything(), 'y', expect.any(Function))
    expect(wrapper.emitted('flip-out-complete')).toBeTruthy()
  })
})

describe('Card — edit-state attrs owned by the card root [obligation]', () => {
  // Previously set by the deleted image-uploader.vue wrapper; the card root
  // itself now sources data-active/data-dragging/data-loading off the mounted
  // FaceImageLayer's exposed state.

  test('sets data-active/data-dragging/data-loading from the image layer', async () => {
    const wrapper = mountEditableCard()
    await wrapper.vm.$nextTick()
    const root = wrapper.find('[data-testid="card"]')
    expect(root.attributes('data-active')).toBe('true')
    expect(root.attributes('data-dragging')).toBe('true')
    expect(root.attributes('data-loading')).toBe('true')
  })

  test('omits the edit-state attrs when the image layer is not mounted (view mode)', () => {
    const wrapper = mountCard({ side: 'front', mode: 'view' })
    const root = wrapper.find('[data-testid="card"]')
    expect(root.attributes('data-active')).toBeUndefined()
    expect(root.attributes('data-dragging')).toBeUndefined()
    expect(root.attributes('data-loading')).toBeUndefined()
  })

  test('mounts the image layer only in edit mode with image_editing on a front/back side', () => {
    const not_editing = mountCard({ side: 'front', mode: 'edit', image_editing: false })
    expect(not_editing.find('[data-testid="face-image-layer-stub"]').exists()).toBe(false)

    const cover_side = shallowMount(Card, {
      props: { side: 'cover', mode: 'edit', image_editing: true },
      global: {
        stubs: { CardFace: CardFaceStub, FaceImageLayer: FaceImageLayerStub },
        directives: { sfx: {} }
      }
    })
    expect(cover_side.find('[data-testid="face-image-layer-stub"]').exists()).toBe(false)
  })
})

describe('Card — disabled prop', () => {
  test('adds pointer-events-none to the root when disabled', () => {
    const wrapper = mountCard({ disabled: true })
    expect(wrapper.find('[data-testid="card"]').classes()).toContain('pointer-events-none')
  })

  test('omits pointer-events-none when not disabled', () => {
    const wrapper = mountCard({ disabled: false })
    expect(wrapper.find('[data-testid="card"]').classes()).not.toContain('pointer-events-none')
  })
})

describe('Card — defineExpose image_controls [obligation]', () => {
  test('exposes openPicker/onRemove from the mounted image layer', () => {
    const wrapper = mountEditableCard()
    expect(wrapper.vm.image_controls).not.toBeNull()
    expect(typeof wrapper.vm.image_controls.openPicker).toBe('function')
    expect(typeof wrapper.vm.image_controls.onRemove).toBe('function')
  })

  test('image_controls is null when no image layer is mounted', () => {
    const wrapper = mountCard({ side: 'front', mode: 'view' })
    expect(wrapper.vm.image_controls).toBeNull()
  })
})

describe('Card — #editor slot wrapper [obligation]', () => {
  test('renders the card__editor wrapper when an #editor slot is provided', () => {
    const wrapper = mountCard(
      { side: 'front' },
      { editor: '<div data-testid="editor-content">edit</div>' }
    )
    expect(wrapper.find('[data-testid="card__editor"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="editor-content"]').exists()).toBe(true)
  })

  test('does not render the card__editor wrapper when no #editor slot is provided', () => {
    const wrapper = mountCard({ side: 'front' })
    expect(wrapper.find('[data-testid="card__editor"]').exists()).toBe(false)
  })
})

describe('Card — region-dropzone image slot substitution', () => {
  // When the mounted image layer reports region_dropzone, the card fills the
  // face's #image slot with <image-dropzone> instead of the caller's #image
  // slot / the face's default <img> — on both the front and back faces.

  test('renders image-dropzone in the front face #image slot', async () => {
    const wrapper = shallowMount(Card, {
      props: { side: 'front', mode: 'edit', image_editing: true },
      global: {
        stubs: { CardFace: CardFaceStub, FaceImageLayer: makeRegionDropzoneStub() },
        directives: { sfx: {} }
      }
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent({ name: 'ImageDropzone' }).exists()).toBe(true)
  })

  test('renders image-dropzone in the back face #image slot', async () => {
    const wrapper = shallowMount(Card, {
      props: { side: 'back', mode: 'edit', image_editing: true },
      global: {
        stubs: { CardFace: CardFaceStub, FaceImageLayer: makeRegionDropzoneStub() },
        directives: { sfx: {} }
      }
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent({ name: 'ImageDropzone' }).exists()).toBe(true)
  })
})
