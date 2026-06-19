import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { defineComponent, h } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { usePhoneStore } from '@/phone/store'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockOpenModal, mockPopModal, mockBuildPhoneApps } = vi.hoisted(() => ({
  mockOpenModal: vi.fn(),
  mockPopModal: vi.fn(),
  mockBuildPhoneApps: vi.fn().mockReturnValue([])
}))

const { mockEmitSfx: _mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
const mockEmitSfx = _mockEmitSfx

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/composables/modal', () => ({
  useModal: () => ({
    open: mockOpenModal,
    pop: mockPopModal,
    modal_stack: { value: [] }
  }),
  useModalRequestClose: vi.fn()
}))

vi.mock('@/phone/apps/index', () => ({
  buildPhoneApps: mockBuildPhoneApps
}))

vi.mock('@/composables/shortcuts', () => ({
  useShortcuts: () => ({ register: vi.fn() })
}))

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: () => ({ value: false })
}))

vi.mock('@/sfx/bus', () => ({ emitSfx: _mockEmitSfx, emitHoverSfx: vi.fn() }))

vi.mock('@/utils/animations/phone', () => ({
  slideDownBlurIn: vi.fn((_el, done) => done?.()),
  slideUpBlurOut: vi.fn((_el, done) => done?.()),
  slideUpBlurIn: vi.fn((_el, done) => done?.()),
  slideDownBlurOut: vi.fn((_el, done) => done?.())
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const PhoneSmStub = defineComponent({
  name: 'PhoneSm',
  emits: ['open'],
  setup(_p, { emit }) {
    return () =>
      h('button', { 'data-testid': 'phone-sm-stub', onClick: () => emit('open') }, 'open')
  }
})

const PhoneBaseStub = defineComponent({
  name: 'PhoneBase',
  emits: ['close'],
  setup(_p, { emit }) {
    return () =>
      h('div', { 'data-testid': 'phone-base-stub' }, [
        h('button', { 'data-testid': 'phone-base__close', onClick: () => emit('close') }, 'close')
      ])
  }
})

// ── Import ────────────────────────────────────────────────────────────────────

import PhoneVue from '@/phone/phone.vue'

// ── Setup ─────────────────────────────────────────────────────────────────────

let pinia

beforeEach(() => {
  vi.clearAllMocks()
  pinia = createPinia()
  setActivePinia(pinia)
  mockBuildPhoneApps.mockReturnValue([])
})

function makeWrapper() {
  return mount(PhoneVue, {
    global: {
      plugins: [pinia],
      stubs: { phoneSm: PhoneSmStub, phoneBase: PhoneBaseStub }
    }
  })
}

function makeApp(modal_options) {
  return {
    id: 'test-app',
    title: 'Test',
    type: 'view',
    display: 'full',
    component: defineComponent({ setup: () => () => h('div') }),
    ...(modal_options ? { modal_options } : {})
  }
}

// ── pending_modal → openModal [obligation] ────────────────────────────────────

describe('phone.vue — pending_modal triggers openModal [obligation]', () => {
  test('uses "dialog" mode when app has no modal_options', async () => {
    makeWrapper()
    await flushPromises()
    const store = usePhoneStore()

    store.pending_modal = makeApp()
    await nextTick()

    expect(mockOpenModal).toHaveBeenCalledOnce()
    const [, args] = mockOpenModal.mock.calls[0]
    expect(args.mode).toBe('dialog')
    expect(args.mobile_below_width).toBeUndefined()
    expect(args.mobile_below_height).toBeUndefined()
  })

  test('uses opts.mode when app has modal_options [obligation]', async () => {
    makeWrapper()
    await flushPromises()
    const store = usePhoneStore()

    store.pending_modal = makeApp({ mode: 'mobile-sheet', mobile_below_width: 'md' })
    await nextTick()

    const [, args] = mockOpenModal.mock.calls[0]
    expect(args.mode).toBe('mobile-sheet')
  })

  test('passes mobile_below_width and mobile_below_height from modal_options [obligation]', async () => {
    makeWrapper()
    await flushPromises()
    const store = usePhoneStore()

    store.pending_modal = makeApp({
      mode: 'mobile-sheet',
      mobile_below_width: 'md',
      mobile_below_height: 'lg'
    })
    await nextTick()

    const [, args] = mockOpenModal.mock.calls[0]
    expect(args.mobile_below_width).toBe('md')
    expect(args.mobile_below_height).toBe('lg')
  })

  test('props.close calls popModal', async () => {
    makeWrapper()
    await flushPromises()
    const store = usePhoneStore()

    store.pending_modal = makeApp()
    await nextTick()

    const [, args] = mockOpenModal.mock.calls[0]
    args.props.close()
    expect(mockPopModal).toHaveBeenCalledOnce()
  })
})

// ── Basic phone open/close ────────────────────────────────────────────────────

describe('phone.vue — open / close', () => {
  test('phone-sm is shown when phone is closed', async () => {
    const wrapper = makeWrapper()
    await flushPromises()
    expect(wrapper.find('[data-testid="phone-sm-stub"]').exists()).toBe(true)
  })

  test('clicking phone-sm opens the phone and shows phone-base', async () => {
    const wrapper = makeWrapper()
    await flushPromises()
    await wrapper.find('[data-testid="phone-sm-stub"]').trigger('click')
    expect(wrapper.find('[data-testid="phone-base-stub"]').exists()).toBe(true)
  })

  test('closing from phone-base with no active_app hides phone-base and shows phone-sm', async () => {
    const wrapper = makeWrapper()
    await flushPromises()
    await wrapper.find('[data-testid="phone-sm-stub"]').trigger('click')
    expect(wrapper.find('[data-testid="phone-base-stub"]').exists()).toBe(true)

    await wrapper.find('[data-testid="phone-base__close"]').trigger('click')
    expect(wrapper.find('[data-testid="phone-sm-stub"]').exists()).toBe(true)
  })

  test('closing with an active_app calls store.close rather than hiding the phone', async () => {
    const wrapper = makeWrapper()
    await flushPromises()
    const store = usePhoneStore()
    store.active_app = makeApp()

    await wrapper.find('[data-testid="phone-sm-stub"]').trigger('click')
    await wrapper.find('[data-testid="phone-base__close"]').trigger('click')

    expect(wrapper.find('[data-testid="phone-base-stub"]').exists()).toBe(true)
  })

  test('emits pop_window sfx when opening the phone', async () => {
    const wrapper = makeWrapper()
    await flushPromises()
    await wrapper.find('[data-testid="phone-sm-stub"]').trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('ui.pop_window')
  })

  test('force-close with active_app calls store.clear', async () => {
    const wrapper = makeWrapper()
    await flushPromises()
    const store = usePhoneStore()
    store.active_app = makeApp()

    await wrapper.find('[data-testid="phone-sm-stub"]').trigger('click')
    wrapper.vm.closePhone(true)

    expect(mockEmitSfx).toHaveBeenCalledWith('ui.toggle_off')
  })

  test('togglePhone opens the phone when it is closed', async () => {
    const wrapper = makeWrapper()
    await flushPromises()
    wrapper.vm.togglePhone()
    await flushPromises()
    expect(wrapper.find('[data-testid="phone-base-stub"]').exists()).toBe(true)
  })

  test('togglePhone closes the phone when it is already open', async () => {
    const wrapper = makeWrapper()
    await flushPromises()
    await wrapper.find('[data-testid="phone-sm-stub"]').trigger('click')
    expect(wrapper.find('[data-testid="phone-base-stub"]').exists()).toBe(true)
    wrapper.vm.togglePhone()
    await flushPromises()
    expect(wrapper.find('[data-testid="phone-sm-stub"]').exists()).toBe(true)
  })

  test('registers apps from buildPhoneApps on mount', async () => {
    const fake_app = {
      id: 'fake',
      title: 'Fake',
      type: 'trigger',
      launcher: { icon_src: 'x', theme: 'brown-300' }
    }
    mockBuildPhoneApps.mockReturnValue([fake_app])
    makeWrapper()
    await flushPromises()
    const store = usePhoneStore()
    expect(store.apps.some((a) => a.id === 'fake')).toBe(true)
  })
})

// ── Animation hooks ───────────────────────────────────────────────────────────

describe('phone.vue — animation hooks', () => {
  test('onOpenBasePhone calls slideUpBlurIn (non-coarse pointer)', async () => {
    const { slideUpBlurIn } = await import('@/utils/animations/phone')
    const wrapper = makeWrapper()
    await flushPromises()
    const el = document.createElement('div')
    const done = vi.fn()
    wrapper.vm.onOpenBasePhone(el, done)
    expect(slideUpBlurIn).toHaveBeenCalledWith(el, done)
  })

  test('onCloseBasePhone calls slideDownBlurOut (non-coarse pointer)', async () => {
    const { slideDownBlurOut } = await import('@/utils/animations/phone')
    const wrapper = makeWrapper()
    await flushPromises()
    const el = document.createElement('div')
    const done = vi.fn()
    wrapper.vm.onCloseBasePhone(el, done)
    expect(slideDownBlurOut).toHaveBeenCalledWith(el, done)
  })

  test('onOpenPhoneSm calls slideUpBlurIn', async () => {
    const { slideUpBlurIn } = await import('@/utils/animations/phone')
    const wrapper = makeWrapper()
    await flushPromises()
    const el = document.createElement('div')
    const done = vi.fn()
    wrapper.vm.onOpenPhoneSm(el, done)
    expect(slideUpBlurIn).toHaveBeenCalledWith(el, done)
  })

  test('onClosePhoneSm calls slideDownBlurOut', async () => {
    const { slideDownBlurOut } = await import('@/utils/animations/phone')
    const wrapper = makeWrapper()
    await flushPromises()
    const el = document.createElement('div')
    const done = vi.fn()
    wrapper.vm.onClosePhoneSm(el, done)
    expect(slideDownBlurOut).toHaveBeenCalledWith(el, done)
  })
})

// ── onPageClick ───────────────────────────────────────────────────────────────

describe('phone.vue — onPageClick', () => {
  test('outside click with empty modal stack closes the phone', async () => {
    const wrapper = makeWrapper()
    await flushPromises()

    await wrapper.find('[data-testid="phone-sm-stub"]').trigger('click')
    expect(wrapper.find('[data-testid="phone-base-stub"]').exists()).toBe(true)

    const event = new MouseEvent('click', { bubbles: true })
    document.dispatchEvent(event)
    await flushPromises()

    expect(wrapper.find('[data-testid="phone-sm-stub"]').exists()).toBe(true)
  })
})
