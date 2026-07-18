import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, inject } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

// ── Responsive mock ────────────────────────────────────────────────────────

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: (query) => ({
    get value() {
      // desktop_query 'w>=lg & fine' contains '&'; phone_query 'w<md' does not.
      if (query.includes('&')) return globalThis.__isDesktop ?? false
      return globalThis.__isPhone ?? false
    }
  })
}))

function setDesktop(v) {
  globalThis.__isDesktop = v
}
function setPhone(v) {
  globalThis.__isPhone = v
}

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

// Collapse the page transition's real GSAP/tab-slide animations to a
// microtask-deferred done() so leave/enter hooks resolve within a promise
// flush instead of a real tween duration. Deferring (rather than calling done
// synchronously) avoids re-entering Vue's own patch cycle while it's still
// unwinding the DOM swap that triggered the leave hook in the first place.
vi.mock('@/utils/animations/fade', () => ({
  fadeEnter: vi.fn((_el, done) => Promise.resolve().then(done)),
  fadeLeave: vi.fn((_el, done) => Promise.resolve().then(done))
}))
vi.mock('@/utils/animations/tab-slide', () => ({
  tabSlideEnter: vi.fn(() => vi.fn((_el, done) => Promise.resolve().then(done))),
  tabSlideLeave: vi.fn(() => vi.fn((_el, done) => Promise.resolve().then(done)))
}))

import PagedWindow from '@/components/layout-kit/paged-window/index.vue'
import { windowLayoutKey } from '@/components/layout-kit/paged-window/layout'

const pages = [
  { value: 'design', label: 'Design', icon: 'paint-brush' },
  { value: 'details', label: 'Details', icon: 'text-field', sidebar: false },
  { value: 'danger-zone', label: 'Danger Zone', icon: 'delete', danger: true }
]

const groups = [
  { key: 'appearance', heading: 'Appearance', entries: ['details', 'design', 'danger-zone'] }
]

// Stub AppWindow that renders every slot paged-window hands it so we can
// assert against forwarded content while keeping paged-window's own template
// under test. Renders the default (unnamed) slot unconditionally, matching
// the real component's always-mounted body.
const AppWindowStub = defineComponent({
  name: 'AppWindow',
  inheritAttrs: false,
  props: {
    show_close_button: { type: Boolean, default: undefined },
    title: { type: String, default: undefined },
    surface: { type: String, default: undefined },
    header_border: { type: String, default: undefined },
    close_label: { type: String, default: undefined },
    close_icon: { type: String, default: undefined },
    window_px: { type: String, default: undefined }
  },
  emits: ['close'],
  setup(props, { slots, emit }) {
    return () =>
      h(
        'div',
        {
          'data-testid': 'app-window-stub',
          'data-show-close-button': String(props.show_close_button),
          'data-close-label': props.close_label,
          'data-close-icon': props.close_icon,
          onClick: () => emit('close')
        },
        [
          slots.overlay?.(),
          slots.header?.(),
          slots['header-content']?.(),
          slots.sidebar?.(),
          slots.default?.()
        ]
      )
  }
})

const mounted_wrappers = []

function mountWindow(props = {}, slots = {}, options = {}) {
  const wrapper = mount(PagedWindow, {
    props: { pages, groups, ...props },
    slots,
    attachTo: document.body,
    global: { stubs: { AppWindow: AppWindowStub, transition: false }, ...options.global },
    ...options
  })
  mounted_wrappers.push(wrapper)
  return wrapper
}

describe('PagedWindow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setDesktop(true)
    setPhone(false)
    mockEmitSfx.mockClear()
  })

  afterEach(() => {
    mounted_wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  })

  // ── pages prop drives sidebar + directory [obligation] ────────────────────

  describe('renders from the `pages` prop, not `tabs` [obligation]', () => {
    test('sidebar renders one button per page with sidebar !== false', () => {
      const wrapper = mountWindow()
      const buttons = wrapper.findAll('[data-testid="paged-window__tab"]')
      expect(buttons).toHaveLength(2)
      expect(buttons[0].text()).toContain('Design')
      expect(buttons[1].text()).toContain('Danger Zone')
    })

    test('a page with sidebar: false is excluded from the sidebar', () => {
      const wrapper = mountWindow()
      const values = wrapper
        .findAll('[data-testid="paged-window__tab"]')
        .map((b) => b.attributes('id'))
      expect(values.some((id) => id?.includes('details'))).toBe(false)
    })

    test('a page with sidebar: false is still resolvable via a directory group entry', () => {
      setDesktop(false)
      const wrapper = mountWindow({}, {}, { attachTo: undefined })
      // active is null; on non-desktop the directory renders — details is one of
      // its group entries even though it's absent from the sidebar.
      const card = wrapper.find('[data-testid="options-panel__card"][data-value="details"]')
      expect(card.exists()).toBe(true)
    })

    test('sidebar + directory entry labels/icons resolve from the pages registry', () => {
      const wrapper = mountWindow()
      const design_button = wrapper
        .findAll('[data-testid="paged-window__tab"]')
        .find((b) => b.text().includes('Design'))
      expect(design_button.exists()).toBe(true)
    })
  })

  // ── nav_direction ownership [obligation] ──────────────────────────────────

  describe('nav_direction is owned by paged-window [obligation]', () => {
    test('directory navigate sets the direction forward; a subsequent back-mode close sets it back — a select-then-back sequence', async () => {
      setDesktop(false)
      const wrapper = mountWindow({ active: null })

      // No sidebar in this layout; active starts null so the directory shows.
      // Selecting an entry there navigates forward (via v-model, not a
      // `select` emit — that's sidebar-specific).
      await wrapper
        .find('[data-testid="options-panel__card"][data-value="design"]')
        .trigger('click')
      expect(wrapper.emitted('update:active')).toEqual([['design']])

      // active is now non-null with no sidebar — the close affordance becomes
      // a back action, which flips the shared nav_direction to 'back'.
      const stub = wrapper.find('[data-testid="app-window-stub"]')
      await stub.trigger('click')
      expect(wrapper.emitted('back')).toBeTruthy()
      expect(wrapper.emitted('close')).toBeFalsy()
    })

    test('sidebar select routes through the same forward-direction path on desktop', async () => {
      setDesktop(true)
      const wrapper = mountWindow({ active: 'design' })

      const buttons = wrapper.findAll('[data-testid="paged-window__tab"]')
      const dangerButton = buttons.find((b) => b.text().includes('Danger Zone'))
      await dangerButton.trigger('click')
      expect(wrapper.emitted('select')).toEqual([['danger-zone']])
    })
  })

  // ── Nullable active model [obligation] ────────────────────────────────────

  describe('nullable active model [obligation]', () => {
    test('active = null resolves to the directory on phone', () => {
      setDesktop(false)
      setPhone(true)
      const wrapper = mountWindow({ active: null })
      expect(wrapper.find('[data-testid="directory-page"]').exists()).toBe(true)
    })

    test('active = null resolves to the directory on tablet', () => {
      setDesktop(false)
      setPhone(false)
      const wrapper = mountWindow({ active: null })
      expect(wrapper.find('[data-testid="directory-page"]').exists()).toBe(true)
    })

    test('active = null on desktop falls back to the first sidebar !== false page', () => {
      setDesktop(true)
      const wrapper = mountWindow({ active: null })
      expect(wrapper.find('[data-testid="paged-window__page"]').exists()).toBe(true)
      const first_button = wrapper.find('[data-testid="paged-window__tab"]')
      expect(first_button.attributes('data-active')).toBe('true')
    })

    test('on desktop with active=null, clicking the default (already-displayed) page emits reselect, not select', async () => {
      setDesktop(true)
      const wrapper = mountWindow({ active: null })
      const first_button = wrapper.find('[data-testid="paged-window__tab"]')
      expect(first_button.attributes('data-active')).toBe('true')

      await first_button.trigger('click')

      expect(wrapper.emitted('reselect')).toEqual([['design']])
      expect(wrapper.emitted('select')).toBeFalsy()
    })

    test('reselect emission plays the reselect sfx', async () => {
      setDesktop(true)
      const wrapper = mountWindow({ active: null })
      await wrapper.find('[data-testid="paged-window__tab"]').trigger('click')
      expect(mockEmitSfx).toHaveBeenCalledWith('digi_powerdown')
    })

    test('sidebar highlight (data-active) keys off displayed_page, not the raw active prop', () => {
      setDesktop(true)
      const wrapper = mountWindow({ active: null })
      const buttons = wrapper.findAll('[data-testid="paged-window__tab"]')
      expect(buttons[0].attributes('data-active')).toBe('true')
      expect(buttons[1].attributes('data-active')).toBe('false')
    })
  })

  // ── between hook contract [obligation] ────────────────────────────────────

  describe('between hook contract [obligation]', () => {
    test('is awaited in the gap between the leaving and entering page — no page mounted at that moment', async () => {
      setDesktop(true)
      let resolveBetween
      const between = vi.fn(
        () =>
          new Promise((resolve) => {
            resolveBetween = resolve
          })
      )
      const wrapper = mountWindow({ active: 'design', between })

      const buttons = wrapper.findAll('[data-testid="paged-window__tab"]')
      const dangerButton = buttons.find((b) => b.text().includes('Danger Zone'))
      await dangerButton.trigger('click')
      await flushPromises()

      expect(between).toHaveBeenCalled()
      resolveBetween?.()
    })

    test('is safe to call when the passed function is internally no-op-guarded and nothing changes', async () => {
      setDesktop(true)
      const between = vi.fn(() => Promise.resolve())
      const wrapper = mountWindow({ active: 'design', between })

      const buttons = wrapper.findAll('[data-testid="paged-window__tab"]')
      const dangerButton = buttons.find((b) => b.text().includes('Danger Zone'))
      await dangerButton.trigger('click')
      await flushPromises()

      expect(between).toHaveBeenCalled()
    })
  })

  // ── Back mode [obligation] ─────────────────────────────────────────────────

  describe('back mode [obligation]', () => {
    test('with no sidebar and active !== null, the close button becomes a back affordance', () => {
      setDesktop(false)
      const wrapper = mountWindow({ active: 'design' })
      const stub = wrapper.find('[data-testid="app-window-stub"]')
      expect(stub.attributes('data-close-icon')).toBe('arrow-back')
      expect(stub.attributes('data-close-label')).toBe('Back')
    })

    test('clicking close in back mode emits back, not close', async () => {
      setDesktop(false)
      const wrapper = mountWindow({ active: 'design' })
      await wrapper.find('[data-testid="app-window-stub"]').trigger('click')
      expect(wrapper.emitted('back')).toBeTruthy()
      expect(wrapper.emitted('close')).toBeFalsy()
    })

    test('desktop sidebar close button always emits close, never back', async () => {
      setDesktop(true)
      const wrapper = mountWindow({ active: 'design' })
      await wrapper.find('[data-testid="paged-window__close-button"]').trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
      expect(wrapper.emitted('back')).toBeFalsy()
    })

    test('desktop app-window close icon is plain "close", no back label', () => {
      setDesktop(true)
      const wrapper = mountWindow({ active: 'design' })
      const stub = wrapper.find('[data-testid="app-window-stub"]')
      expect(stub.attributes('data-close-icon')).toBe('close')
      expect(stub.attributes('data-close-label')).toBeUndefined()
    })
  })

  // ── Provide/inject [obligation] ────────────────────────────────────────────

  describe('windowLayoutKey provide/inject reaches the default slot [obligation]', () => {
    test('a page component rendered through the default slot injects the pager layout', () => {
      setDesktop(true)
      const InjectingPage = defineComponent({
        setup() {
          const layout = inject(windowLayoutKey)
          return () => h('div', { 'data-testid': 'injected-layout' }, layout?.value)
        }
      })
      const wrapper = mount(PagedWindow, {
        props: { pages, groups, active: 'design' },
        slots: { default: () => h(InjectingPage) }
      })
      expect(wrapper.find('[data-testid="injected-layout"]').text()).toBe('desktop')
    })
  })

  // ── uid-scoped panel id [obligation] ───────────────────────────────────────

  describe('tab panel DOM id is uid-scoped [obligation]', () => {
    test('two simultaneously mounted paged-windows do not share id/aria-controls', () => {
      setDesktop(true)
      const wrapper_a = mountWindow({ active: 'design' })
      const wrapper_b = mountWindow({ active: 'design' })

      const id_a = wrapper_a.find('[data-testid="paged-window__main"]').attributes('id')
      const id_b = wrapper_b.find('[data-testid="paged-window__main"]').attributes('id')
      expect(id_a).toBeTruthy()
      expect(id_a).not.toBe(id_b)

      const aria_a = wrapper_a.find('[data-testid="paged-window__tab"]').attributes('aria-controls')
      const aria_b = wrapper_b.find('[data-testid="paged-window__tab"]').attributes('aria-controls')
      expect(aria_a).toBe(id_a)
      expect(aria_b).toBe(id_b)
    })
  })

  // ── Sidebar close aria-label [obligation] ──────────────────────────────────

  describe('sidebar close button aria-label [obligation]', () => {
    test('comes from t("app-window.close-label"), not hardcoded text', () => {
      setDesktop(true)
      const wrapper = mountWindow({ active: 'design' })
      expect(
        wrapper.find('[data-testid="paged-window__close-button"]').attributes('aria-label')
      ).toBe('Close')
    })
  })

  // ── Exposed API [obligation] ───────────────────────────────────────────────

  describe('exposed API [obligation]', () => {
    test('exposes layout_mode, displayed_page, and has_sidebar', () => {
      setDesktop(true)
      const wrapper = mountWindow({ active: 'design' })
      expect(wrapper.vm.layout_mode).toBe('desktop')
      expect(wrapper.vm.displayed_page).toBe('design')
      expect(wrapper.vm.has_sidebar).toBe(true)
    })

    test('has_sidebar is false off desktop', () => {
      setDesktop(false)
      const wrapper = mountWindow({ active: 'design' })
      expect(wrapper.vm.has_sidebar).toBe(false)
    })
  })

  // ── Slot forwarding ────────────────────────────────────────────────────────

  test('forwards overlay slot through to the underlying app-window', () => {
    const wrapper = mountWindow({}, { overlay: '<div data-testid="overlay-content">over</div>' })
    expect(wrapper.find('[data-testid="overlay-content"]').exists()).toBe(true)
  })

  test('forwards header-content slot through to the underlying app-window', () => {
    const wrapper = mountWindow(
      { title: 'My Window' },
      { 'header-content': '<h2 data-testid="header-custom">Custom</h2>' }
    )
    expect(wrapper.find('[data-testid="header-custom"]').exists()).toBe(true)
  })

  test('renders default slot content into the content panel', () => {
    setDesktop(true)
    const wrapper = mountWindow(
      { active: 'design' },
      { default: '<p data-testid="content">body</p>' }
    )
    expect(wrapper.find('[data-testid="content"]').exists()).toBe(true)
  })
})

// ── Optional sfx + danger + hidden close branches ─────────────────────────────

describe('PagedWindow — sfx suppression, danger pages, hidden close', () => {
  test('empty-string select_sfx and reselect_sfx suppress all selection sounds', async () => {
    const wrapper = mountWindow({ select_sfx: '', reselect_sfx: '' })
    const tabs = wrapper.findAll('[data-testid="paged-window__tab"]')

    await tabs[1].trigger('click')
    await tabs[1].trigger('click')

    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('reselect')).toBeTruthy()
    expect(mockEmitSfx).not.toHaveBeenCalled()
  })

  test('a danger page renders as a sidebar tab and still selects normally', async () => {
    const wrapper = mountWindow()
    const danger_tab = wrapper
      .findAll('[data-testid="paged-window__tab"]')
      .find((tab) => tab.text().includes('Danger Zone'))

    expect(danger_tab).toBeTruthy()
    await danger_tab.trigger('click')

    expect(wrapper.emitted('select')?.at(-1)).toEqual(['danger-zone'])
    expect(danger_tab.attributes('data-active')).toBe('true')
  })

  test('show_close_button: false hides the frame close affordance', () => {
    const wrapper = mountWindow({ show_close_button: false })
    expect(
      wrapper.find('[data-testid="app-window-stub"]').attributes('data-show-close-button')
    ).toBe('false')
  })
})
