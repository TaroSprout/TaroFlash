import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'

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

    test('fine-pointer click does NOT call emitSfx [obligation]', async () => {
      const wrapper = mountMenu()
      await wrapper.findAll('[data-testid="dropdown-button__option"]')[0].trigger('click')
      expect(mockEmitSfx).not.toHaveBeenCalledWith('ui.select')
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
})
