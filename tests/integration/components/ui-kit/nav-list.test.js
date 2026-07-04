import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: vi.fn() }))

import NavList from '@/components/ui-kit/nav-list.vue'

const IconStub = defineComponent({
  name: 'UiIcon',
  props: { src: { type: String, required: true } },
  setup(props) {
    return () => h('span', { 'data-testid': 'ui-icon', 'data-src': props.src })
  }
})

const ENTRIES = [
  { value: 'profile', icon: 'user-sticker-square', label: 'Profile' },
  { value: 'subscription', icon: 'piggy-bank', label: 'Subscription' }
]

function makeList(entries = ENTRIES) {
  return mount(NavList, {
    props: { entries },
    global: { stubs: { UiIcon: IconStub }, directives: { sfx: {} } }
  })
}

describe('NavList', () => {
  beforeEach(() => mockEmitSfx.mockClear())

  test('renders one row per entry with its icon, label, and a trailing chevron', () => {
    const wrapper = makeList()
    const cards = wrapper.findAll('[data-testid="nav-list__card"]')
    expect(cards).toHaveLength(2)

    cards.forEach((card, i) => {
      expect(card.attributes('data-value')).toBe(ENTRIES[i].value)
      expect(card.text()).toContain(ENTRIES[i].label)

      const icons = card.findAll('[data-testid="ui-icon"]')
      expect(icons[0].attributes('data-src')).toBe(ENTRIES[i].icon)
      expect(icons[1].attributes('data-src')).toBe('line-arrow-right')
    })
  })

  test('emits navigate with the tapped entry value, not the whole entry object', async () => {
    const wrapper = makeList()
    await wrapper.find('[data-testid="nav-list__card"][data-value="subscription"]').trigger('click')
    expect(wrapper.emitted('navigate')).toEqual([['subscription']])
  })

  test('does not play a hardcoded sfx when a row is tapped [obligation]', async () => {
    const wrapper = makeList()
    await wrapper.find('[data-testid="nav-list__card"][data-value="profile"]').trigger('click')
    expect(mockEmitSfx).not.toHaveBeenCalled()
  })

  test('a caller-supplied sfx prop reaches the tappable press sound [obligation]', () => {
    const TappableStub = defineComponent({
      name: 'UiTappable',
      props: { sfx: { type: Object, default: () => ({}) } },
      setup(props, { slots }) {
        return () =>
          h(
            'button',
            { 'data-testid': 'nav-list__card', 'data-press-sfx': props.sfx.press },
            slots.default?.()
          )
      }
    })
    const wrapper = mount(NavList, {
      props: { entries: ENTRIES, sfx: { press: 'ui.confirm' } },
      global: { stubs: { UiIcon: IconStub, UiTappable: TappableStub }, directives: { sfx: {} } }
    })

    const cards = wrapper.findAll('[data-testid="nav-list__card"]')
    cards.forEach((card) => expect(card.attributes('data-press-sfx')).toBe('ui.confirm'))
  })

  test('omits the leading icon when entry.icon is not provided [obligation]', () => {
    const wrapper = makeList([{ value: 'no-icon', label: 'No Icon' }])
    const card = wrapper.find('[data-testid="nav-list__card"]')
    expect(card.findAll('[data-testid="ui-icon"]')).toHaveLength(1)
  })

  test('renders the entry trailingIcon when provided instead of the fallback [obligation]', () => {
    const wrapper = makeList([
      { value: 'custom', icon: 'user-sticker-square', label: 'Custom', trailingIcon: 'line-check' }
    ])
    const card = wrapper.find('[data-testid="nav-list__card"]')
    const icons = card.findAll('[data-testid="ui-icon"]')
    expect(icons[1].attributes('data-src')).toBe('line-check')
  })

  test("opts every row into tappable's hover-active state [obligation]", () => {
    const TappableStub = defineComponent({
      name: 'UiTappable',
      props: { active_on_hover: { type: Boolean, default: false } },
      setup(props, { slots, attrs }) {
        return () =>
          h(
            'button',
            { ...attrs, 'data-active-on-hover': props.active_on_hover },
            slots.default?.()
          )
      }
    })
    const wrapper = mount(NavList, {
      props: { entries: ENTRIES },
      global: { stubs: { UiIcon: IconStub, UiTappable: TappableStub }, directives: { sfx: {} } }
    })

    const cards = wrapper.findAll('[data-testid="nav-list__card"]')
    expect(cards).toHaveLength(2)
    cards.forEach((card) => expect(card.attributes('data-active-on-hover')).toBe('true'))
  })
})
