import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { h } from 'vue'
import DashboardSection from '@/views/dashboard/dashboard-section.vue'

function mountSection(props, slots) {
  return shallowMount(DashboardSection, { props, slots })
}

describe('DashboardSection — label', () => {
  test('renders the label prop text', () => {
    const wrapper = mountSection({ label: 'Due Decks' })
    expect(wrapper.find('[data-testid="dashboard-section__label"]').text()).toBe('Due Decks')
  })
})

describe('DashboardSection — default slot', () => {
  test('renders default slot content inside the content area', () => {
    const wrapper = mountSection(
      { label: 'All Decks' },
      { default: () => h('div', { 'data-testid': 'stub-content' }, 'content') }
    )
    expect(
      wrapper
        .find('[data-testid="dashboard-section__content"] [data-testid="stub-content"]')
        .exists()
    ).toBe(true)
  })
})

describe('DashboardSection — loading prop [obligation]', () => {
  test('uses the flat loading color classes when loading is true', () => {
    const wrapper = mountSection({ label: 'All Decks', loading: true })
    const label = wrapper.find('[data-testid="dashboard-section__label"]')
    expect(label.classes()).toEqual(
      expect.arrayContaining(['text-brown-300', 'dark:text-stone-700'])
    )
    expect(label.classes()).not.toEqual(
      expect.arrayContaining(['text-brown-700', 'dark:text-brown-300'])
    )
  })

  test('uses the default heading color classes when loading is false', () => {
    const wrapper = mountSection({ label: 'All Decks', loading: false })
    const label = wrapper.find('[data-testid="dashboard-section__label"]')
    expect(label.classes()).toEqual(expect.arrayContaining(['text-ink']))
  })

  test('omitting the loading prop preserves the original non-loading appearance', () => {
    const wrapper = mountSection({ label: 'All Decks' })
    const label = wrapper.find('[data-testid="dashboard-section__label"]')
    expect(label.classes()).toEqual(expect.arrayContaining(['text-ink']))
  })
})

describe('DashboardSection — subheader slot', () => {
  test('does not render the subheader wrapper when the subheader slot is not provided', () => {
    const wrapper = mountSection({ label: 'All Decks' })
    expect(wrapper.find('[data-testid="dashboard-section__subheader"]').exists()).toBe(false)
  })

  test('renders the subheader wrapper with slot content when the subheader slot is provided', () => {
    const wrapper = mountSection(
      { label: 'All Decks' },
      { subheader: () => h('div', { 'data-testid': 'stub-subheader' }, 'filters') }
    )
    const subheader = wrapper.find('[data-testid="dashboard-section__subheader"]')
    expect(subheader.exists()).toBe(true)
    expect(subheader.find('[data-testid="stub-subheader"]').exists()).toBe(true)
  })
})
