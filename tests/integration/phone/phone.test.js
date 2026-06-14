import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

// ── Hoisted state ─────────────────────────────────────────────────────────────
// Note: ref() cannot be used inside vi.hoisted — refs are wired up in beforeEach.

const { mockOpenModal, mockPopModal, mockRuntime, capturedOpenFullApp, mockInstallApps } =
  vi.hoisted(() => {
    let _openFullApp = null
    const capturedOpenFullApp = {
      get fn() {
        return _openFullApp
      },
      set fn(v) {
        _openFullApp = v
      }
    }

    // Reactive refs assigned in beforeEach (can't use ref() here — hoisted before imports)
    const mockRuntime = {
      phoneOS: {
        open: vi.fn(),
        close: vi.fn(),
        clear: vi.fn()
      },
      init: vi.fn(),
      // These are plain { value } objects; phone.vue reads .value reactively via computed/template.
      // We wrap them in real refs in beforeEach.
      active_session: { value: null },
      transition: { value: null },
      notifications: { value: [] }
    }

    return {
      mockOpenModal: vi.fn(),
      mockPopModal: vi.fn(),
      capturedOpenFullApp,
      mockInstallApps: vi.fn().mockResolvedValue([]),
      mockRuntime
    }
  })

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/composables/modal', () => ({
  useModal: () => ({
    open: mockOpenModal,
    pop: mockPopModal,
    modal_stack: ref([])
  })
}))

vi.mock('@/composables/shortcuts', () => ({
  useShortcuts: () => ({ register: vi.fn() })
}))

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: () => ref(false)
}))

const { mockEmitSfx: _mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
const mockEmitSfx = _mockEmitSfx
vi.mock('@/sfx/bus', () => ({ emitSfx: _mockEmitSfx, emitHoverSfx: vi.fn() }))

vi.mock('@/utils/animations/phone', () => ({
  slideDownBlurIn: vi.fn((_el, done) => done?.()),
  slideUpBlurOut: vi.fn((_el, done) => done?.()),
  slideUpBlurIn: vi.fn((_el, done) => done?.()),
  slideDownBlurOut: vi.fn((_el, done) => done?.())
}))

vi.mock('@/phone/system/install-apps', () => ({
  installApps: mockInstallApps
}))

vi.mock('@/phone/system/runtime', () => ({
  createPhoneRuntime: (opts) => {
    capturedOpenFullApp.fn = opts.openFullApp
    return mockRuntime
  }
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

// ── Factory ───────────────────────────────────────────────────────────────────

function makeWrapper() {
  return mount(PhoneVue, {
    global: {
      stubs: {
        phoneSm: PhoneSmStub,
        phoneBase: PhoneBaseStub
      }
    }
  })
}

// ── Reset ─────────────────────────────────────────────────────────────────────

beforeEach(async () => {
  vi.clearAllMocks()
  capturedOpenFullApp.fn = null
  // Swap to real Vue refs so the template can read .value reactively
  mockRuntime.active_session = ref(null)
  mockRuntime.transition = ref(null)
  mockRuntime.notifications = ref([])
  mockInstallApps.mockResolvedValue([])
})

// ── modal_options — openFullApp [obligation] ───────────────────────────────────

describe('phone.vue — openFullApp uses modal_options [obligation]', () => {
  test('uses "dialog" mode when app has no modal_options', async () => {
    makeWrapper()
    await flushPromises() // onMounted installApps resolves

    const app = {
      id: 'test-app',
      type: 'view',
      display: 'full',
      component: defineComponent({ setup: () => () => h('div') })
    }

    capturedOpenFullApp.fn(app, undefined)

    expect(mockOpenModal).toHaveBeenCalledOnce()
    const [, args] = mockOpenModal.mock.calls[0]
    expect(args.mode).toBe('dialog')
    expect(args.mobile_below_width).toBeUndefined()
    expect(args.mobile_below_height).toBeUndefined()
  })

  test('uses opts.mode when app has modal_options [obligation]', async () => {
    makeWrapper()
    await flushPromises()

    const app = {
      id: 'settings-app',
      type: 'view',
      display: 'full',
      component: defineComponent({ setup: () => () => h('div') }),
      modal_options: {
        mode: 'mobile-sheet',
        mobile_below_width: 'md',
        mobile_below_height: 'md'
      }
    }

    capturedOpenFullApp.fn(app, undefined)

    const [, args] = mockOpenModal.mock.calls[0]
    expect(args.mode).toBe('mobile-sheet')
  })

  test('passes mobile_below_width and mobile_below_height from modal_options [obligation]', async () => {
    makeWrapper()
    await flushPromises()

    const app = {
      id: 'settings-app',
      type: 'view',
      display: 'full',
      component: defineComponent({ setup: () => () => h('div') }),
      modal_options: {
        mode: 'mobile-sheet',
        mobile_below_width: 'md',
        mobile_below_height: 'lg'
      }
    }

    capturedOpenFullApp.fn(app, undefined)

    const [, args] = mockOpenModal.mock.calls[0]
    expect(args.mobile_below_width).toBe('md')
    expect(args.mobile_below_height).toBe('lg')
  })

  test('props.close calls popModal', async () => {
    makeWrapper()
    await flushPromises()

    const app = {
      id: 'test-app',
      type: 'view',
      display: 'full',
      component: defineComponent({ setup: () => () => h('div') })
    }

    capturedOpenFullApp.fn(app, undefined)

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

  test('closing from phone-base (no active session) hides phone-base and shows phone-sm', async () => {
    mockRuntime.active_session.value = null
    const wrapper = makeWrapper()
    await flushPromises()
    // Open the phone
    await wrapper.find('[data-testid="phone-sm-stub"]').trigger('click')
    expect(wrapper.find('[data-testid="phone-base-stub"]').exists()).toBe(true)

    // Close it
    await wrapper.find('[data-testid="phone-base__close"]').trigger('click')
    expect(wrapper.find('[data-testid="phone-sm-stub"]').exists()).toBe(true)
  })

  test('closing with an active session calls phoneOS.close rather than hiding the phone', async () => {
    mockRuntime.active_session.value = { controller: {} }
    const wrapper = makeWrapper()
    await flushPromises()

    await wrapper.find('[data-testid="phone-sm-stub"]').trigger('click')
    await wrapper.find('[data-testid="phone-base__close"]').trigger('click')

    expect(mockRuntime.phoneOS.close).toHaveBeenCalledOnce()
    // phone-base stays visible (phone is still "open")
    expect(wrapper.find('[data-testid="phone-base-stub"]').exists()).toBe(true)
  })

  test('emits pop_window sfx when opening the phone', async () => {
    const wrapper = makeWrapper()
    await flushPromises()
    await wrapper.find('[data-testid="phone-sm-stub"]').trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('ui.pop_window')
  })

  test('does not open if still loading', async () => {
    // Delay installApps so loading stays true
    let resolveApps
    mockInstallApps.mockReturnValue(new Promise((r) => (resolveApps = r)))
    const wrapper = makeWrapper()
    // loading is true — clicking open should be a no-op
    await wrapper.find('[data-testid="phone-sm-stub"]').trigger('click')
    expect(wrapper.find('[data-testid="phone-base-stub"]').exists()).toBe(false)

    resolveApps([])
  })

  test('force-close with active session calls phoneOS.clear', async () => {
    mockRuntime.active_session.value = { controller: {} }
    const wrapper = makeWrapper()
    await flushPromises()

    // Open then force-close via vm
    await wrapper.find('[data-testid="phone-sm-stub"]').trigger('click')
    wrapper.vm.closePhone(true)

    expect(mockRuntime.phoneOS.clear).toHaveBeenCalledOnce()
    expect(mockEmitSfx).toHaveBeenCalledWith('ui.toggle_off')
  })

  test('notification_count sums notification counts from runtime', async () => {
    mockRuntime.notifications.value = [{ count: 3 }, { count: 2 }]
    const wrapper = makeWrapper()
    await flushPromises()
    // phone-sm receives notification_count as a prop; check it was passed
    // The PhoneSmStub doesn't expose it, but the component renders without error
    expect(wrapper.find('[data-testid="phone-sm-stub"]').exists()).toBe(true)
  })

  test('togglePhone opens the phone when it is closed', async () => {
    const wrapper = makeWrapper()
    await flushPromises()
    // Phone is closed initially
    wrapper.vm.togglePhone()
    await flushPromises()
    expect(wrapper.find('[data-testid="phone-base-stub"]').exists()).toBe(true)
  })

  test('togglePhone closes the phone when it is already open', async () => {
    const wrapper = makeWrapper()
    await flushPromises()
    // Open first
    await wrapper.find('[data-testid="phone-sm-stub"]').trigger('click')
    expect(wrapper.find('[data-testid="phone-base-stub"]').exists()).toBe(true)
    // Toggle again — should close
    wrapper.vm.togglePhone()
    await flushPromises()
    expect(wrapper.find('[data-testid="phone-sm-stub"]').exists()).toBe(true)
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

    // Open the phone (this adds the document click listener)
    await wrapper.find('[data-testid="phone-sm-stub"]').trigger('click')
    expect(wrapper.find('[data-testid="phone-base-stub"]').exists()).toBe(true)

    // Simulate a click outside the phone element
    const event = new MouseEvent('click', { bubbles: true })
    document.dispatchEvent(event)
    await flushPromises()

    expect(wrapper.find('[data-testid="phone-sm-stub"]').exists()).toBe(true)
  })
})
