import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'

// Card stub: render the default + image + editor slots and forward attrs so the
// data-active, data-dragging flags, drag listeners, and pointer listeners
// reach a real element.
const CardStub = defineComponent({
  name: 'Card',
  inheritAttrs: false,
  props: ['side', 'mode', 'size', 'error', 'sfx', 'cardAttributes'],
  setup(_props, { slots }) {
    const attrs = useAttrs()
    return () =>
      h('div', { ...attrs, 'data-testid': 'card-root' }, [
        slots.default?.(),
        slots.image?.(),
        slots.editor?.()
      ])
  }
})

// FaceImageDropzone stub: surfaces the controls it owns as testid'd buttons and
// re-emits, so the uploader's wiring (remove/browse/dismiss) can be asserted.
const FaceImageDropzoneStub = defineComponent({
  name: 'FaceImageDropzone',
  inheritAttrs: false,
  props: ['mode', 'image', 'active', 'disabled', 'error'],
  emits: ['browse', 'remove', 'dismiss-error'],
  setup(props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'face-image-dropzone', 'data-mode': props.mode }, [
        h('button', {
          'data-testid': 'face-image-dropzone__remove',
          onClick: () => emit('remove')
        }),
        h('button', {
          'data-testid': 'face-image-dropzone__scrim',
          onClick: () => emit('browse')
        }),
        props.error
          ? h('button', {
              'data-testid': 'face-image-dropzone__error',
              onClick: () => emit('browse')
            })
          : null
      ])
  }
})

// UiButton stub: forward attrs + native clicks
const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  setup(_p, { slots }) {
    const attrs = useAttrs()
    return () => h('button', attrs, slots.default?.())
  }
})

// UiIcon stub (no output needed — just prevents warnings)
const UiIconStub = defineComponent({
  name: 'UiIcon',
  props: ['src'],
  setup: () => () => h('i')
})

// UiTooltip stub: forward attrs as a button so click handlers fire
const UiTooltipStub = defineComponent({
  name: 'UiTooltip',
  inheritAttrs: false,
  props: ['text', 'position', 'gap', 'theme', 'themeDark'],
  setup(_p, { slots }) {
    const attrs = useAttrs()
    return () => h('button', attrs, slots.default?.())
  }
})

const mocks = vi.hoisted(() => ({
  setFaceImageMock: vi.fn(),
  toastErrorMock: vi.fn(),
  emitSfxMock: vi.fn(),
  guardCardImageMock: vi.fn()
}))

vi.mock('@/composables/toast', () => ({ useToast: () => ({ error: mocks.toastErrorMock }) }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mocks.emitSfxMock, emitHoverSfx: vi.fn() }))

// The paywall gate's own logic is unit-tested separately; here we drive it to
// assert how the uploader wires it into the click + drop paths.
vi.mock('@/composables/card/image-gate', () => ({
  useCardImageGate: () => ({ guardCardImage: mocks.guardCardImageMock })
}))

// playButtonTap touches a DOM element via GSAP — stub it out entirely
vi.mock('@/utils/animations/button-tap', () => ({
  BUTTON_TAP_DURATION: 0.1,
  playButtonTap: vi.fn()
}))

import CardFaceUploader from '@/views/deck/card-editor/card-face-uploader.vue'
import { cardEditorKey } from '@/composables/card/list-controller'

function makeCard(overrides = {}) {
  return { id: 1, deck_id: 10, front_text: 'Q', back_text: 'A', rank: 1000, ...overrides }
}

function pngFile() {
  return new File(['x'], 'a.png', { type: 'image/png' })
}

function oversizeFile() {
  // 3 MiB — above the 2 MiB cap in the component
  return new File([new Uint8Array(3 * 1024 * 1024)], 'big.png', { type: 'image/png' })
}

function dropImage(wrapper, file) {
  const dataTransfer = new DataTransfer()
  dataTransfer.items.add(file)
  return wrapper.find('[data-testid="card-root"]').trigger('drop', { dataTransfer })
}

let _wrapper

function mount(props = {}) {
  const { card, cardEditor, ...rest } = props
  _wrapper = shallowMount(CardFaceUploader, {
    props: { side: 'front', card: makeCard(card), ...rest },
    global: {
      stubs: {
        Card: CardStub,
        UiButton: UiButtonStub,
        UiIcon: UiIconStub,
        UiTooltip: UiTooltipStub,
        FaceImageDropzone: FaceImageDropzoneStub
      },
      directives: { sfx: {} },
      provide: {
        [cardEditorKey]: {
          setFaceImage: mocks.setFaceImageMock,
          card_attributes: ref({ front: {}, back: {} }),
          ...cardEditor
        }
      }
    }
  })
  return _wrapper
}

beforeEach(() => {
  mocks.setFaceImageMock.mockReset()
  mocks.setFaceImageMock.mockResolvedValue(undefined)
  mocks.toastErrorMock.mockReset()
  mocks.emitSfxMock.mockReset()
  mocks.guardCardImageMock.mockReset()
  // Default: paid member — uploads proceed. Paywalled cases override per-test.
  mocks.guardCardImageMock.mockResolvedValue(true)
  _wrapper = undefined
})

afterEach(() => {
  // Always unmount — releases document-level pointerdown listeners
  // that the component attaches while an error is showing.
  _wrapper?.unmount()
})

describe('CardFaceUploader', () => {
  // ── Empty face ──────────────────────────────────────────────────────────────

  test('shows the add-image button on an empty, persisted face', () => {
    const wrapper = mount({ card: { id: 5 } })
    expect(wrapper.find('[data-testid="card-face-uploader__add"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-face-uploader__scrim"]').exists()).toBe(false)
  })

  test('hides the add-image button on a temp card (id <= 0)', () => {
    const wrapper = mount({ card: { id: 0 } })
    expect(wrapper.find('[data-testid="card-face-uploader__add"]').exists()).toBe(false)
  })

  test('hides the add-image button on a negative-id temp card', () => {
    const wrapper = mount({ card: { id: -1 } })
    expect(wrapper.find('[data-testid="card-face-uploader__add"]').exists()).toBe(false)
  })

  test('hides add control and the image dropzone when disabled (selection mode)', () => {
    const wrapper = mount({ card: { id: 5, front_image_path: 'cards/f.png' }, disabled: true })
    expect(wrapper.find('[data-testid="card-face-uploader__add"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="face-image-dropzone"]').exists()).toBe(false)
  })

  // ── Image face ────────────────────────────────────────────────────────────────

  test('renders the region dropzone on a face that has an image', () => {
    const wrapper = mount({ card: { front_image_path: 'cards/f.png' } })
    const dropzone = wrapper.find('[data-testid="face-image-dropzone"]')
    expect(dropzone.exists()).toBe(true)
    expect(dropzone.attributes('data-mode')).toBe('region')
    expect(wrapper.find('[data-testid="face-image-dropzone__remove"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="face-image-dropzone__scrim"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-face-uploader__add"]').exists()).toBe(false)
  })

  test('renders the corners dropzone for a behind-layout image', () => {
    const wrapper = mount({
      card: { front_image_path: 'cards/f.png' },
      cardEditor: { card_attributes: ref({ front: { image_layout: 'behind' }, back: {} }) }
    })
    const dropzone = wrapper.find('[data-testid="face-image-dropzone"]')
    expect(dropzone.exists()).toBe(true)
    expect(dropzone.attributes('data-mode')).toBe('corners')
  })

  // ── Activation (hover / drag) ─────────────────────────────────────────────────

  test('card-root pointerenter does NOT set data-active in region mode (hover scoped to image region)', async () => {
    // above/below layout — hover must be scoped to the image region, not the whole card
    const wrapper = mount({ card: { front_image_path: 'cards/f.png' } })
    const root = wrapper.find('[data-testid="card-root"]')
    expect(root.attributes('data-active')).toBeUndefined()

    await root.trigger('pointerenter')
    expect(root.attributes('data-active')).toBeUndefined()
  })

  test('card-root pointerenter DOES set data-active in behind mode (full-bleed, card-wide hover)', async () => {
    const wrapper = mount({
      card: { front_image_path: 'cards/f.png' },
      cardEditor: { card_attributes: ref({ front: { image_layout: 'behind' }, back: {} }) }
    })
    const root = wrapper.find('[data-testid="card-root"]')
    expect(root.attributes('data-active')).toBeUndefined()

    await root.trigger('pointerenter')
    expect(root.attributes('data-active')).toBe('true')

    await root.trigger('pointerleave')
    expect(root.attributes('data-active')).toBeUndefined()
  })

  test('card-root pointerenter DOES set data-active on an empty card (no image)', async () => {
    const wrapper = mount({ card: { id: 5 } })
    const root = wrapper.find('[data-testid="card-root"]')
    expect(root.attributes('data-active')).toBeUndefined()

    await root.trigger('pointerenter')
    expect(root.attributes('data-active')).toBe('true')

    await root.trigger('pointerleave')
    expect(root.attributes('data-active')).toBeUndefined()
  })

  test('marks the card active while a file is dragged over it', async () => {
    const wrapper = mount({ card: { id: 5 } })
    const root = wrapper.find('[data-testid="card-root"]')
    await root.trigger('dragenter')
    expect(root.attributes('data-active')).toBe('true')
    expect(wrapper.find('[data-testid="card-face-uploader__empty-overlay"]').exists()).toBe(true)
    expect(root.attributes('data-dragging')).toBe('true')
  })

  // ── Upload success ──────────────────────────────────────────────────────────

  test('uploads a valid dropped file via setFaceImage and plays music_plink_ok with blocking:true', async () => {
    const wrapper = mount({ card: { id: 5 }, side: 'back' })
    const file = pngFile()
    await dropImage(wrapper, file)
    await flushPromises()

    expect(mocks.setFaceImageMock).toHaveBeenCalledWith(5, 'back', file)
    expect(mocks.emitSfxMock).toHaveBeenCalledWith('ui.music_plink_ok', { blocking: true })
  })

  test('blocking option is explicitly passed (suppresses overlapping sfx)', async () => {
    const wrapper = mount({ card: { id: 5 } })
    await dropImage(wrapper, pngFile())
    await flushPromises()

    const call = mocks.emitSfxMock.mock.calls.find((c) => c[0] === 'ui.music_plink_ok')
    expect(call).toBeDefined()
    expect(call[1]).toEqual({ blocking: true })
  })

  // ── Upload — temp card gate ────────────────────────────────────────────────

  test('does not upload on a temp card (id = 0) even on drop', async () => {
    const wrapper = mount({ card: { id: 0 } })
    await dropImage(wrapper, pngFile())
    await flushPromises()

    expect(mocks.setFaceImageMock).not.toHaveBeenCalled()
  })

  test('does not upload on a negative-id temp card', async () => {
    const wrapper = mount({ card: { id: -1 } })
    await dropImage(wrapper, pngFile())
    await flushPromises()

    expect(mocks.setFaceImageMock).not.toHaveBeenCalled()
  })

  // ── Invalid file ─────────────────────────────────────────────────────────────

  test('invalid type: does not call setFaceImage, plays digi_powerdown, shows error overlay', async () => {
    const wrapper = mount({ card: { id: 5 } })
    await dropImage(wrapper, new File(['x'], 'a.txt', { type: 'text/plain' }))
    await flushPromises()

    expect(mocks.setFaceImageMock).not.toHaveBeenCalled()
    expect(mocks.emitSfxMock).toHaveBeenCalledWith('ui.digi_powerdown')
    expect(wrapper.find('[data-testid="card-face-uploader__error"]').exists()).toBe(true)
  })

  test('oversized file: does not call setFaceImage, plays digi_powerdown, shows error overlay', async () => {
    const wrapper = mount({ card: { id: 5 } })
    await dropImage(wrapper, oversizeFile())
    await flushPromises()

    expect(mocks.setFaceImageMock).not.toHaveBeenCalled()
    expect(mocks.emitSfxMock).toHaveBeenCalledWith('ui.digi_powerdown')
    expect(wrapper.find('[data-testid="card-face-uploader__error"]').exists()).toBe(true)
  })

  // ── Error overlay persistence ─────────────────────────────────────────────

  test('clicking the add control opens the file picker (fileInput is wired)', async () => {
    const wrapper = mount({ card: { id: 5 } })
    const input = wrapper.find('input[type="file"]').element
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {})

    await wrapper.find('[data-testid="card-face-uploader__add"]').trigger('click')
    await flushPromises()

    expect(clickSpy).toHaveBeenCalled()
  })

  test('clicking the error scrim opens the file picker to re-pick', async () => {
    const wrapper = mount({ card: { id: 5 } })
    await dropImage(wrapper, new File(['x'], 'a.txt', { type: 'text/plain' }))
    await flushPromises()
    const input = wrapper.find('input[type="file"]').element
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {})

    await wrapper.find('[data-testid="card-face-uploader__error"]').trigger('click')

    expect(clickSpy).toHaveBeenCalled()
  })

  test('error overlay has a Dismiss button', async () => {
    const wrapper = mount({ card: { id: 5 } })
    await dropImage(wrapper, new File(['x'], 'a.txt', { type: 'text/plain' }))
    await flushPromises()

    expect(wrapper.find('[data-testid="card-face-uploader__dismiss-error"]').exists()).toBe(true)
  })

  test('clicking Dismiss hides the error overlay', async () => {
    const wrapper = mount({ card: { id: 5 } })
    await dropImage(wrapper, new File(['x'], 'a.txt', { type: 'text/plain' }))
    await flushPromises()
    expect(wrapper.find('[data-testid="card-face-uploader__error"]').exists()).toBe(true)

    await wrapper.find('[data-testid="card-face-uploader__dismiss-error"]').trigger('click')

    expect(wrapper.find('[data-testid="card-face-uploader__error"]').exists()).toBe(false)
    expect(mocks.emitSfxMock).toHaveBeenCalledWith('ui.snappy_button_5')
  })

  test('error has no auto-dismiss: overlay stays up without any user action', async () => {
    vi.useFakeTimers()
    const wrapper = mount({ card: { id: 5 } })
    await dropImage(wrapper, new File(['x'], 'a.txt', { type: 'text/plain' }))
    await flushPromises()
    expect(wrapper.find('[data-testid="card-face-uploader__error"]').exists()).toBe(true)

    // Advance past the 1 s hover-suppression timer — error must still be shown
    vi.advanceTimersByTime(2000)
    await flushPromises()

    expect(wrapper.find('[data-testid="card-face-uploader__error"]').exists()).toBe(true)
    vi.useRealTimers()
  })

  test('outside pointerdown clears the error overlay', async () => {
    const wrapper = mount({ card: { id: 5 } })
    await dropImage(wrapper, new File(['x'], 'a.txt', { type: 'text/plain' }))
    await flushPromises()
    expect(wrapper.find('[data-testid="card-face-uploader__error"]').exists()).toBe(true)

    // Dispatch a pointerdown on body (outside the card root)
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await flushPromises()

    expect(wrapper.find('[data-testid="card-face-uploader__error"]').exists()).toBe(false)
    expect(mocks.emitSfxMock).toHaveBeenCalledWith('ui.snappy_button_5')
    wrapper.unmount()
  })

  test('pointerdown inside the card root does NOT clear the error overlay', async () => {
    const wrapper = mount({ card: { id: 5 } })
    await dropImage(wrapper, new File(['x'], 'a.txt', { type: 'text/plain' }))
    await flushPromises()
    expect(wrapper.find('[data-testid="card-face-uploader__error"]').exists()).toBe(true)

    // Dispatch pointerdown on the card root element itself (which is inside)
    const root = wrapper.find('[data-testid="card-root"]').element
    root.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await flushPromises()

    expect(wrapper.find('[data-testid="card-face-uploader__error"]').exists()).toBe(true)
    wrapper.unmount()
  })

  test('error is cleared when the remove button is clicked (via onRemove calling clearError)', async () => {
    // Trigger an error first, then trigger remove — error should be gone
    const wrapper = mount({ card: { id: 5, front_image_path: 'cards/f.png' } })
    await dropImage(wrapper, new File(['x'], 'a.txt', { type: 'text/plain' }))
    await flushPromises()
    expect(wrapper.find('[data-testid="face-image-dropzone__error"]').exists()).toBe(true)

    await wrapper.find('[data-testid="face-image-dropzone__remove"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="face-image-dropzone__error"]').exists()).toBe(false)
  })

  // ── data-active stays truthy while error is showing ───────────────────────

  test('data-active is truthy while the error overlay is showing even when not hovered', async () => {
    const wrapper = mount({ card: { id: 5 } })
    const root = wrapper.find('[data-testid="card-root"]')

    // No hover, no drag — baseline: not active
    expect(root.attributes('data-active')).toBeUndefined()

    // Trigger an error
    await dropImage(wrapper, new File(['x'], 'a.txt', { type: 'text/plain' }))
    await flushPromises()

    // Error is up — card must stay active so the image keeps its padded frame
    expect(wrapper.find('[data-testid="card-face-uploader__error"]').exists()).toBe(true)
    expect(root.attributes('data-active')).toBe('true')
  })

  // ── Editor is inert while an overlay covers it ────────────────────────────

  test('editor is interactive on an idle empty face', () => {
    const wrapper = mount({ card: { id: 5 } })
    const editor = wrapper.find('[data-testid="card-face-uploader__editor"]')
    expect(editor.exists()).toBe(true)
    expect(editor.attributes('inert')).toBeUndefined()
  })

  test('editor becomes inert while a file is dragged over the card', async () => {
    const wrapper = mount({ card: { id: 5 } })
    await wrapper.find('[data-testid="card-root"]').trigger('dragenter')
    expect(
      wrapper.find('[data-testid="card-face-uploader__editor"]').attributes('inert')
    ).toBeDefined()
  })

  test('editor becomes inert while the error overlay covers it (no typing behind the scrim)', async () => {
    const wrapper = mount({ card: { id: 5 } })
    await dropImage(wrapper, new File(['x'], 'a.txt', { type: 'text/plain' }))
    await flushPromises()
    expect(
      wrapper.find('[data-testid="card-face-uploader__editor"]').attributes('inert')
    ).toBeDefined()
  })

  // ── Hover suppression after successful drop ───────────────────────────────

  test('after a successful drop, data-active is false even while hovered (hover suppressed)', async () => {
    vi.useFakeTimers()
    const wrapper = mount({ card: { id: 5 } })
    const root = wrapper.find('[data-testid="card-root"]')

    // Simulate pointer over card during drop
    await root.trigger('pointerenter')
    await dropImage(wrapper, pngFile())
    await flushPromises()

    // Hover is suppressed immediately after upload — active should be falsy
    expect(root.attributes('data-active')).toBeUndefined()

    vi.useRealTimers()
  })

  test('pointerleave clears hover suppression so data-active returns to normal', async () => {
    vi.useFakeTimers()
    const wrapper = mount({ card: { id: 5 } })
    const root = wrapper.find('[data-testid="card-root"]')

    await root.trigger('pointerenter')
    await dropImage(wrapper, pngFile())
    await flushPromises()

    // Still suppressed
    expect(root.attributes('data-active')).toBeUndefined()

    // Pointer leaves — suppression clears, hovered becomes false too
    await root.trigger('pointerleave')
    expect(root.attributes('data-active')).toBeUndefined()

    // If user re-hovers now, suppression is gone so active should be true
    await root.trigger('pointerenter')
    expect(root.attributes('data-active')).toBe('true')

    vi.useRealTimers()
  })

  // ── Drag enter plays music_plink_mid (once per drag) ─────────────────────

  test('first dragenter plays music_plink_mid once', async () => {
    const wrapper = mount({ card: { id: 5 } })
    const root = wrapper.find('[data-testid="card-root"]')
    await root.trigger('dragenter')

    const midCalls = mocks.emitSfxMock.mock.calls.filter((c) => c[0] === 'ui.music_plink_mid')
    expect(midCalls).toHaveLength(1)
  })

  test('subsequent dragenter events (child boundary crossings) do NOT re-play music_plink_mid', async () => {
    const wrapper = mount({ card: { id: 5 } })
    const root = wrapper.find('[data-testid="card-root"]')

    // Enter, leave child (counter goes 1→2→1), enter again — still mid-drag
    await root.trigger('dragenter')
    await root.trigger('dragenter')
    await root.trigger('dragleave')

    const midCalls = mocks.emitSfxMock.mock.calls.filter((c) => c[0] === 'ui.music_plink_mid')
    expect(midCalls).toHaveLength(1)
  })

  test('drag chime is gated on can_upload — no chime on a temp card', async () => {
    const wrapper = mount({ card: { id: 0 } })
    const root = wrapper.find('[data-testid="card-root"]')
    await root.trigger('dragenter')

    const midCalls = mocks.emitSfxMock.mock.calls.filter((c) => c[0] === 'ui.music_plink_mid')
    expect(midCalls).toHaveLength(0)
  })

  // ── Remove button ─────────────────────────────────────────────────────────

  test('remove button calls setFaceImage(id, side, null) and plays trash_crumple_short', async () => {
    const wrapper = mount({ card: { id: 5, front_image_path: 'cards/f.png' } })
    await wrapper.find('[data-testid="face-image-dropzone__remove"]').trigger('click')
    await flushPromises()

    expect(mocks.setFaceImageMock).toHaveBeenCalledWith(5, 'front', null)
    expect(mocks.emitSfxMock).toHaveBeenCalledWith('ui.trash_crumple_short')
  })

  test('toasts when an upload fails', async () => {
    mocks.setFaceImageMock.mockRejectedValueOnce(new Error('boom'))
    const wrapper = mount({ card: { id: 5 } })
    await dropImage(wrapper, pngFile())
    await flushPromises()

    expect(mocks.toastErrorMock).toHaveBeenCalled()
  })

  // ── Browse / onBrowse ─────────────────────────────────────────────────────

  test('clicking the add-image button plays ui.select', async () => {
    const wrapper = mount({ card: { id: 5 } })
    await wrapper.find('[data-testid="card-face-uploader__add"]').trigger('click')
    await flushPromises()

    expect(mocks.emitSfxMock).toHaveBeenCalledWith('ui.select')
  })

  // ── Paid-plan gate ────────────────────────────────────────────────────────

  test('clicking add as a free member runs the gate and does NOT open the picker', async () => {
    mocks.guardCardImageMock.mockResolvedValue(false)
    const wrapper = mount({ card: { id: 5 } })
    const input = wrapper.find('input[type="file"]').element
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {})

    await wrapper.find('[data-testid="card-face-uploader__add"]').trigger('click')
    await flushPromises()

    expect(mocks.guardCardImageMock).toHaveBeenCalled()
    expect(clickSpy).not.toHaveBeenCalled()
    expect(mocks.emitSfxMock).not.toHaveBeenCalledWith('ui.select')
  })

  test('dropping a file as a free member runs the gate and does NOT upload', async () => {
    mocks.guardCardImageMock.mockResolvedValue(false)
    const wrapper = mount({ card: { id: 5 } })

    await dropImage(wrapper, pngFile())
    await flushPromises()

    expect(mocks.guardCardImageMock).toHaveBeenCalled()
    expect(mocks.setFaceImageMock).not.toHaveBeenCalled()
  })

  test('a blocked free-member drop of an invalid file shows no error overlay (gate runs first)', async () => {
    mocks.guardCardImageMock.mockResolvedValue(false)
    const wrapper = mount({ card: { id: 5 } })

    await dropImage(wrapper, new File(['x'], 'a.txt', { type: 'text/plain' }))
    await flushPromises()

    expect(mocks.setFaceImageMock).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="card-face-uploader__error"]').exists()).toBe(false)
  })

  // ── sfx prop on the Card ──────────────────────────────────────────────────

  test('passes the hover sfx to Card for a behind-layout image (full-bleed, card-wide hover)', () => {
    const wrapper = mount({
      card: { front_image_path: 'cards/f.png' },
      cardEditor: { card_attributes: ref({ front: { image_layout: 'behind' }, back: {} }) }
    })
    const cardEl = wrapper.findComponent(CardStub)
    expect(cardEl.props('sfx')).toEqual({ hover: 'ui.tap_05' })
  })

  test('does NOT pass card sfx in region mode (hover sfx is scoped to the image region)', () => {
    const wrapper = mount({ card: { front_image_path: 'cards/f.png' } })
    const cardEl = wrapper.findComponent(CardStub)
    expect(cardEl.props('sfx')).toBeUndefined()
  })

  test('does NOT pass sfx prop to Card when the face has no image', () => {
    const wrapper = mount({ card: { id: 5 } })
    const cardEl = wrapper.findComponent(CardStub)
    expect(cardEl.props('sfx')).toBeUndefined()
  })
})
