import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import MemberCard from '@/components/member/member-card.vue'
import { MEMBER_CARD_COVER_DEFAULTS } from '@/utils/member/defaults'

vi.mock('gsap', () => ({
  gsap: {
    to: vi.fn((_el, opts) => opts?.onComplete?.()),
    fromTo: vi.fn((_el, _from, to) => to?.onComplete?.())
  }
}))

const AvatarImageStub = defineComponent({
  name: 'AvatarImage',
  props: { avatar: { type: String, default: undefined } },
  setup(props) {
    return () => h('div', { 'data-testid': 'avatar-image-stub', 'data-avatar': props.avatar ?? '' })
  }
})

function mountCard(props = {}) {
  return shallowMount(MemberCard, {
    props: {
      createdAt: '2024-04-15T00:00:00Z',
      cardTitle: 'Apprentice',
      ...props
    },
    global: {
      stubs: { AvatarImage: AvatarImageStub },
      mocks: { $t: (key, params) => (params ? `${key}:${JSON.stringify(params)}` : key) }
    }
  })
}

describe('MemberCard', () => {
  test('renders the card root', () => {
    const wrapper = mountCard()
    expect(wrapper.find('[data-testid="member-card"]').exists()).toBe(true)
  })

  test('applies cover-derived data-palette on the body', () => {
    const wrapper = mountCard({
      cover: { palette: 'red', pattern: 'wave' }
    })
    const body = wrapper.find('[data-testid="member-card__body"]')
    expect(body.attributes('data-palette')).toBe('red')
    expect(body.classes()).toContain('pattern-mask')
  })

  test('falls back to MEMBER_CARD_COVER_DEFAULTS when cover omitted', () => {
    const wrapper = mountCard()
    const body = wrapper.find('[data-testid="member-card__body"]')
    expect(body.attributes('data-palette')).toBe(MEMBER_CARD_COVER_DEFAULTS.palette)
    expect(body.classes()).toContain('pattern-mask')
  })

  test('renders displayName in the header', () => {
    const wrapper = mountCard({ displayName: 'Nina' })
    expect(wrapper.find('[data-testid="member-card__header"]').text()).toContain('Nina')
  })

  test('shows the name-placeholder fallback when displayName is omitted [obligation]', () => {
    const wrapper = mountCard()
    expect(wrapper.find('h1').text()).toBe('Member Name')
  })

  test('shows the name-placeholder fallback when displayName is an empty string [obligation]', () => {
    const wrapper = mountCard({ displayName: '' })
    expect(wrapper.find('h1').text()).toBe('Member Name')
  })

  test('renders displayName as-is when provided, not the fallback [obligation]', () => {
    const wrapper = mountCard({ displayName: 'Nina' })
    expect(wrapper.find('h1').text()).toBe('Nina')
  })

  test('renders cardComment when provided', () => {
    const wrapper = mountCard({ cardComment: 'Hello there' })
    expect(wrapper.find('[data-testid="member-card__comment"]').text()).toContain('Hello there')
  })

  test('falls back to description-fallback when cardComment omitted', () => {
    const wrapper = mountCard()
    expect(wrapper.find('[data-testid="member-card__comment"]').text().length).toBeGreaterThan(0)
  })

  test('renders the formatted registration date in the registration row', () => {
    const wrapper = mountCard({ createdAt: '2024-04-15T00:00:00Z' })
    const row = wrapper.find('[data-testid="member-card__registration"]').text()
    expect(row).toMatch(/\d{4}|\d{1,2}/)
  })

  test('body never carries a border style — memberCoverBindings enforces border:false [obligation]', () => {
    const wrapper = mountCard({ cover: { palette: 'red', pattern: 'saw' } })
    const style = wrapper.find('[data-testid="member-card__body"]').attributes('style') ?? ''
    expect(style).not.toContain('border:')
  })

  test('still applies cover-derived bindings via memberCoverBindings after extraction refactor [obligation]', () => {
    const wrapper = mountCard({
      cover: { palette: 'teal', pattern: 'aztec' }
    })
    const body = wrapper.find('[data-testid="member-card__body"]')
    expect(body.attributes('data-palette')).toBe('teal')
    expect(body.classes()).toContain('pattern-mask')
  })

  test('forwards cover.avatar to avatar-image', () => {
    const wrapper = mountCard({ cover: { palette: 'teal', pattern: 'aztec', avatar: 'panda' } })
    expect(wrapper.find('[data-testid="avatar-image-stub"]').attributes('data-avatar')).toBe(
      'panda'
    )
  })

  // ── name truncation title ──────────────────────────────────────────────────

  describe('name truncation title', () => {
    test('exposes the full displayName via the title attribute', () => {
      const wrapper = mountCard({ displayName: 'An Extremely Long Member Display Name' })
      expect(wrapper.find('[data-testid="member-card__name"]').attributes('title')).toBe(
        'An Extremely Long Member Display Name'
      )
    })

    test('omits the title attribute when displayName is absent', () => {
      const wrapper = mountCard()
      expect(wrapper.find('[data-testid="member-card__name"]').attributes('title')).toBeUndefined()
    })
  })

  // ── editable / edit-avatar [obligation] ────────────────────────────────────

  describe('editable [obligation]', () => {
    test('the avatar-edit button is absent when editable is unset', () => {
      const wrapper = mountCard()
      expect(wrapper.find('[data-testid="member-card__avatar-edit"]').exists()).toBe(false)
    })

    test('the avatar-edit button is absent when editable is explicitly false', () => {
      const wrapper = mountCard({ editable: false })
      expect(wrapper.find('[data-testid="member-card__avatar-edit"]').exists()).toBe(false)
    })

    test('the avatar-edit button renders when editable is true', () => {
      const wrapper = mountCard({ editable: true })
      expect(wrapper.find('[data-testid="member-card__avatar-edit"]').exists()).toBe(true)
    })

    test('pressing the avatar-edit button emits edit-avatar', async () => {
      const wrapper = mount(MemberCard, {
        props: { createdAt: '2024-04-15T00:00:00Z', cardTitle: 'Apprentice', editable: true },
        global: { stubs: { AvatarImage: AvatarImageStub }, directives: { sfx: {} } }
      })

      await wrapper.find('[data-testid="member-card__avatar-edit"]').trigger('click')

      expect(wrapper.emitted('edit-avatar')).toHaveLength(1)
    })
  })
})
