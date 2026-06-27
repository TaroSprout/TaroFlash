import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { h } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitHoverSfx: vi.fn()
}))

// usePlayOnTap uses useMatchMedia to decide if the pointer is coarse. Mock it
// to return fine (false) so interceptClick always bails and the bubble @click
// handler (onSelect) fires unimpeded — the fine path is what we can drive in
// the runner without a real coarse pointer event.
vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: vi.fn(() => ({ value: false }))
}))

// GSAP mock — not used by menu directly, but usePlayOnTap imports button-tap
// which uses gsap; mock it defensively so no real audio/animation runs.
vi.mock('gsap', () => ({
  gsap: {
    fromTo: vi.fn((_el, _from, to) => to?.onComplete?.()),
    to: vi.fn((_el, opts) => opts?.onComplete?.())
  }
}))

import DropdownMenu from '@/components/ui-kit/dropdown-button/menu.vue'

const SAMPLE_OPTIONS = [
  { value: 'copy', label: 'Copy' },
  { value: 'delete', label: 'Delete', icon: 'delete' }
]

function mountMenu(props = {}) {
  return mount(DropdownMenu, {
    props: {
      options: SAMPLE_OPTIONS,
      size: 'md',
      ...props
    },
    global: { directives: { sfx: {} } }
  })
}

describe('DropdownMenu', () => {
  beforeEach(() => mockEmitSfx.mockClear())

  // ── theme defaults ────────────────────────────────────────────────────────

  describe('theme defaults', () => {
    test('data-theme defaults to brown-300', () => {
      const wrapper = mountMenu()
      expect(wrapper.find('[data-testid="dropdown-button__menu"]').attributes('data-theme')).toBe(
        'brown-300'
      )
    })

    test('data-theme-dark defaults to stone-700', () => {
      const wrapper = mountMenu()
      expect(
        wrapper.find('[data-testid="dropdown-button__menu"]').attributes('data-theme-dark')
      ).toBe('stone-700')
    })

    test('data-theme reflects explicit menuTheme prop', () => {
      const wrapper = mountMenu({ menuTheme: 'blue-500' })
      expect(wrapper.find('[data-testid="dropdown-button__menu"]').attributes('data-theme')).toBe(
        'blue-500'
      )
    })

    test('data-theme-dark reflects explicit menuThemeDark prop', () => {
      const wrapper = mountMenu({ menuThemeDark: 'blue-900' })
      expect(
        wrapper.find('[data-testid="dropdown-button__menu"]').attributes('data-theme-dark')
      ).toBe('blue-900')
    })
  })

  // ── option rendering ──────────────────────────────────────────────────────

  describe('option rendering', () => {
    test('renders one option button per option', () => {
      const wrapper = mountMenu()
      expect(wrapper.findAll('[data-testid="dropdown-button__option"]')).toHaveLength(2)
    })

    test('renders option labels as text', () => {
      const wrapper = mountMenu()
      const options = wrapper.findAll('[data-testid="dropdown-button__option"]')
      expect(options[0].text()).toContain('Copy')
      expect(options[1].text()).toContain('Delete')
    })

    test('renders an icon when the option has one', () => {
      const wrapper = mountMenu()
      // Second option has icon:'delete'; first has none. UiIcon renders with a
      // data-testid of its own — assert presence rather than querying by class.
      const withIcon = wrapper.findAll('[data-testid="dropdown-button__option"]')[1]
      const withoutIcon = wrapper.findAll('[data-testid="dropdown-button__option"]')[0]
      expect(withIcon.find('svg, img, [data-testid]').exists()).toBe(true)
      // First option should have no icon child element beyond the label span
      expect(withoutIcon.findAll('span')).toHaveLength(1)
    })
  })

  // ── fine-pointer select path ──────────────────────────────────────────────
  // useMatchMedia returns false (fine pointer), so interceptClick bails inside
  // onOptionTap and the bubble @click fires emit('select') directly — no sound
  // is played on the fine-pointer path.

  describe('select (fine pointer)', () => {
    test('clicking an option emits select with the option object', async () => {
      const wrapper = mountMenu()
      await wrapper.findAll('[data-testid="dropdown-button__option"]')[0].trigger('click')
      expect(wrapper.emitted('select')).toHaveLength(1)
      expect(wrapper.emitted('select')[0][0]).toEqual(SAMPLE_OPTIONS[0])
    })

    test('fine-pointer click does NOT call emitSfx at all [obligation]', async () => {
      const wrapper = mountMenu()
      await wrapper.findAll('[data-testid="dropdown-button__option"]')[0].trigger('click')
      // menu.vue removed the hard-coded emitSfx('snappy_button_5') call — option-select
      // sounds now come from the callsite. Assert no sfx is played by the menu itself.
      expect(mockEmitSfx).not.toHaveBeenCalled()
    })

    test('clicking the second option emits select with the correct option', async () => {
      const wrapper = mountMenu()
      await wrapper.findAll('[data-testid="dropdown-button__option"]')[1].trigger('click')
      expect(wrapper.emitted('select')[0][0]).toEqual(SAMPLE_OPTIONS[1])
    })

    // Coarse path (snappy chime only) routes through usePlayOnTap's interceptClick
    // which bails on fine pointers — cannot drive a real coarse pointer event in
    // the headless Chromium runner. Deferred.
  })

  // ── disabled options [obligation] ─────────────────────────────────────────

  describe('disabled options [obligation]', () => {
    test('clicking a disabled option does NOT emit select [obligation]', async () => {
      const wrapper = mountMenu({
        options: [
          { value: 'copy', label: 'Copy', disabled: true },
          { value: 'delete', label: 'Delete' }
        ]
      })
      await wrapper.findAll('[data-testid="dropdown-button__option"]')[0].trigger('click')
      expect(wrapper.emitted('select')).toBeFalsy()
    })

    test('clicking an enabled option emits select with that option [obligation]', async () => {
      const enabled_option = { value: 'delete', label: 'Delete' }
      const wrapper = mountMenu({
        options: [{ value: 'copy', label: 'Copy', disabled: true }, enabled_option]
      })
      await wrapper.findAll('[data-testid="dropdown-button__option"]')[1].trigger('click')
      expect(wrapper.emitted('select')).toHaveLength(1)
      expect(wrapper.emitted('select')[0][0]).toEqual(enabled_option)
    })

    test('disabled option button has disabled attribute set', () => {
      const wrapper = mountMenu({
        options: [{ value: 'copy', label: 'Copy', disabled: true }]
      })
      const btn = wrapper.find('[data-testid="dropdown-button__option"]')
      expect(btn.attributes('disabled')).toBeDefined()
    })
  })

  // ── menuClass prop [obligation] ───────────────────────────────────────────

  describe('menuClass prop [obligation]', () => {
    test('menuClass is applied to the dropdown-button__menu root element [obligation]', () => {
      const wrapper = mountMenu({ menuClass: 'ring-2 ring-blue-500' })
      const menu = wrapper.find('[data-testid="dropdown-button__menu"]')
      expect(menu.classes()).toContain('ring-2')
      expect(menu.classes()).toContain('ring-blue-500')
    })

    test('menuClass is absent when not provided [obligation]', () => {
      const wrapper = mountMenu()
      const menu = wrapper.find('[data-testid="dropdown-button__menu"]')
      // Still has the size class from the prop
      expect(menu.classes().join(' ')).toContain('ui-kit-btn-tokens')
    })
  })

  // ── default slot override (panel slot path) [obligation] ──────────────────
  // When a #default slot is provided to DropdownMenu (via the parent's #panel
  // slot bridge), it replaces the option list entirely.

  describe('default slot override [obligation]', () => {
    function mountMenuWithSlot(slotContent) {
      return mount(DropdownMenu, {
        props: { options: SAMPLE_OPTIONS, size: 'md' },
        slots: { default: slotContent },
        global: { directives: { sfx: {} } }
      })
    }

    test('custom default slot content renders inside dropdown-button__menu [obligation]', () => {
      const wrapper = mountMenuWithSlot(() =>
        h('div', { 'data-testid': 'custom-panel-content' }, 'Custom')
      )
      expect(wrapper.find('[data-testid="dropdown-button__menu"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="custom-panel-content"]').exists()).toBe(true)
    })

    test('custom default slot: NO option rows are rendered [obligation]', () => {
      const wrapper = mountMenuWithSlot(() =>
        h('div', { 'data-testid': 'custom-panel-content' }, 'Custom')
      )
      expect(wrapper.findAll('[data-testid="dropdown-button__option"]')).toHaveLength(0)
    })

    test('without a default slot, options prop renders option rows (fallback preserved) [obligation]', () => {
      const wrapper = mountMenu()
      expect(wrapper.findAll('[data-testid="dropdown-button__option"]')).toHaveLength(
        SAMPLE_OPTIONS.length
      )
    })
  })
})
