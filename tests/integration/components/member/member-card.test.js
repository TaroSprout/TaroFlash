import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import MemberCard from '@/components/member/member-card.vue'
import { MEMBER_CARD_COVER_DEFAULTS } from '@/utils/member/defaults'

const UiImageStub = defineComponent({
  name: 'UiImage',
  setup() {
    return () => h('div', { 'data-testid': 'ui-image-stub' })
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
      stubs: { UiImage: UiImageStub },
      mocks: { $t: (key, params) => (params ? `${key}:${JSON.stringify(params)}` : key) }
    }
  })
}

describe('MemberCard', () => {
  test('renders the card root', () => {
    const wrapper = mountCard()
    expect(wrapper.find('[data-testid="member-card"]').exists()).toBe(true)
  })

  test('applies cover-derived data-theme + data-theme-dark on the body', () => {
    const wrapper = mountCard({
      cover: { theme: 'red-500', theme_dark: 'red-700', pattern: 'wave' }
    })
    const body = wrapper.find('[data-testid="member-card__body"]')
    expect(body.attributes('data-theme')).toBe('red-500')
    expect(body.attributes('data-theme-dark')).toBe('red-700')
    expect(body.classes()).toContain('pattern-mask')
  })

  test('falls back to MEMBER_CARD_COVER_DEFAULTS when cover omitted', () => {
    const wrapper = mountCard()
    const body = wrapper.find('[data-testid="member-card__body"]')
    expect(body.attributes('data-theme')).toBe(MEMBER_CARD_COVER_DEFAULTS.theme)
    expect(body.attributes('data-theme-dark')).toBe(MEMBER_CARD_COVER_DEFAULTS.theme_dark)
    expect(body.classes()).toContain('pattern-mask')
  })

  test('renders displayName when provided', () => {
    const wrapper = mountCard({ displayName: 'Nina' })
    expect(wrapper.find('[data-testid="member-card__name-field"]').text()).toContain('Nina')
  })

  test('falls back to name-placeholder when displayName omitted', () => {
    const wrapper = mountCard()
    expect(wrapper.find('[data-testid="member-card__name-field"]').text()).toContain('Member Name')
  })

  test('renders cardComment when provided', () => {
    const wrapper = mountCard({ cardComment: 'Hello there' })
    expect(wrapper.find('[data-testid="member-card__comment"]').text()).toContain('Hello there')
  })

  test('falls back to description-fallback when cardComment omitted', () => {
    const wrapper = mountCard()
    expect(wrapper.find('[data-testid="member-card__comment"]').text().length).toBeGreaterThan(0)
  })

  test('renders cardTitle in the title field', () => {
    const wrapper = mountCard({ cardTitle: 'Sensei' })
    expect(wrapper.find('[data-testid="member-card__title-field"]').text()).toContain('Sensei')
  })

  test('renders the formatted registration date in the registration row', () => {
    const wrapper = mountCard({ createdAt: '2024-04-15T00:00:00Z' })
    const row = wrapper.find('[data-testid="member-card__registration"]').text()
    expect(row).toMatch(/\d{4}|\d{1,2}/)
  })

  test('body never carries a border style — memberCoverBindings enforces border:false [obligation]', () => {
    const wrapper = mountCard({ cover: { theme: 'red-500', pattern: 'saw' } })
    const style = wrapper.find('[data-testid="member-card__body"]').attributes('style') ?? ''
    expect(style).not.toContain('border:')
  })

  test('still applies cover-derived bindings via memberCoverBindings after extraction refactor [obligation]', () => {
    const wrapper = mountCard({
      cover: { theme: 'teal-400', theme_dark: 'teal-800', pattern: 'aztec' }
    })
    const body = wrapper.find('[data-testid="member-card__body"]')
    expect(body.attributes('data-theme')).toBe('teal-400')
    expect(body.attributes('data-theme-dark')).toBe('teal-800')
    expect(body.classes()).toContain('pattern-mask')
  })
})
