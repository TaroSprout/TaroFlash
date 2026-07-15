import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import DeckShell from '@/views/deck/deck-shell.vue'

function mountShell(slots) {
  return mount(DeckShell, { slots })
}

describe('DeckShell (views/deck/deck-shell.vue)', () => {
  test('renders the hero slot content', () => {
    const wrapper = mountShell({ hero: () => h('div', { 'data-testid': 'hero-content' }) })
    expect(wrapper.find('[data-testid="hero-content"]').exists()).toBe(true)
  })

  test('renders the main slot content', () => {
    const wrapper = mountShell({ main: () => h('div', { 'data-testid': 'main-content' }) })
    expect(wrapper.find('[data-testid="main-content"]').exists()).toBe(true)
  })

  test('renders hero before main within the shell root', () => {
    const wrapper = mountShell({
      hero: () => h('div', { 'data-testid': 'hero-content' }),
      main: () => h('div', { 'data-testid': 'main-content' })
    })
    const root = wrapper.find('[data-testid="deck-shell"]')
    const children = root.element.children
    expect(children[0].getAttribute('data-testid')).toBe('hero-content')
    expect(children[1].getAttribute('data-testid')).toBe('main-content')
  })
})
