import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import DirectoryPage from '@/components/layout-kit/paged-window/directory-page.vue'
import { windowLayoutKey } from '@/components/layout-kit/paged-window/layout'

vi.mock('@/composables/ui/media-query', () => ({ useMatchMedia: () => ({ value: false }) }))

const groups = [
  {
    key: 'appearance',
    heading: 'Appearance',
    entries: [
      { value: 'design', label: 'Design', icon: 'paint-brush' },
      { value: 'danger-zone', label: 'Danger Zone', icon: 'delete', danger: true }
    ]
  },
  {
    key: 'review',
    heading: 'Review',
    entries: [{ value: 'review-pacing', label: 'Review Pacing' }]
  }
]

function mountPage(props = {}, options = {}) {
  return mount(DirectoryPage, {
    props: { groups, ...props },
    ...options
  })
}

describe('DirectoryPage', () => {
  // ── Structure ──────────────────────────────────────────────────────────────

  test('renders the directory-page root', () => {
    const wrapper = mountPage()
    expect(wrapper.find('[data-testid="directory-page"]').exists()).toBe(true)
  })

  test('renders one nav-group section per group, keyed by group.key', () => {
    const wrapper = mountPage()
    expect(wrapper.find('[data-testid="directory-page__nav-group--appearance"]').exists()).toBe(
      true
    )
    expect(wrapper.find('[data-testid="directory-page__nav-group--review"]').exists()).toBe(true)
  })

  test('renders each group heading', () => {
    const wrapper = mountPage()
    expect(wrapper.text()).toContain('Appearance')
    expect(wrapper.text()).toContain('Review')
  })

  test('renders every entry across all groups as an options-panel card', () => {
    const wrapper = mountPage()
    const cards = wrapper.findAll('[data-testid="options-panel__card"]')
    expect(cards).toHaveLength(3)
    expect(cards.map((c) => c.attributes('data-value'))).toEqual([
      'design',
      'danger-zone',
      'review-pacing'
    ])
  })

  // ── navigate emit ──────────────────────────────────────────────────────────

  test('clicking an entry emits navigate with its value', async () => {
    const wrapper = mountPage()
    await wrapper.find('[data-testid="options-panel__card"][data-value="design"]').trigger('click')
    expect(wrapper.emitted('navigate')).toEqual([['design']])
  })

  test('clicking a danger entry still emits navigate like any other entry', async () => {
    const wrapper = mountPage()
    await wrapper
      .find('[data-testid="options-panel__card"][data-value="danger-zone"]')
      .trigger('click')
    expect(wrapper.emitted('navigate')).toEqual([['danger-zone']])
  })

  // ── entry fallback [obligation] ────────────────────────────────────────────

  test('an entry value with no matching page in the registry renders its raw value as label [obligation]', () => {
    const wrapper = mountPage({
      groups: [
        {
          key: 'orphan',
          heading: 'Orphan',
          entries: [{ value: 'ghost-page', label: 'ghost-page' }]
        }
      ]
    })
    const card = wrapper.find('[data-testid="options-panel__card"][data-value="ghost-page"]')
    expect(card.text()).toContain('ghost-page')
  })

  // ── footer slot ────────────────────────────────────────────────────────────

  test('renders footer slot content when provided', () => {
    const wrapper = mountPage(
      {},
      {
        slots: { footer: '<div data-testid="footer-content">Save</div>' }
      }
    )
    expect(wrapper.find('[data-testid="footer-content"]').exists()).toBe(true)
  })

  test('omits footer slot content when not provided', () => {
    const wrapper = mountPage()
    expect(wrapper.find('[data-testid="footer-content"]').exists()).toBe(false)
  })

  // ── padding class keyed off injected layout_mode ──────────────────────────

  test('applies the phone padding class when injected layout_mode is "phone"', () => {
    const Host = defineComponent({
      setup() {
        return () => h(DirectoryPage, { groups })
      }
    })
    const wrapper = mount(Host, {
      global: { provide: { [windowLayoutKey]: { value: 'phone' } } }
    })
    const classes = wrapper.find('[data-testid="directory-page"]').classes()
    expect(classes).toContain('px-(--window-px)')
    expect(classes).toContain('pb-(--window-px)')
  })

  test('omits the phone padding class when injected layout_mode is not "phone"', () => {
    const Host = defineComponent({
      setup() {
        return () => h(DirectoryPage, { groups })
      }
    })
    const wrapper = mount(Host, {
      global: { provide: { [windowLayoutKey]: { value: 'desktop' } } }
    })
    const classes = wrapper.find('[data-testid="directory-page"]').classes()
    expect(classes).not.toContain('px-(--window-px)')
  })

  test('does not throw when no layout_mode is injected (standalone render)', () => {
    expect(() => mountPage()).not.toThrow()
  })
})
