import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, markRaw } from 'vue'
import { createTestingPinia } from '@pinia/testing'

import OverlayEntry from '@/components/overlay/overlay-entry.vue'

const EntryComponent = defineComponent({
  name: 'EntryComponent',
  setup() {
    return () => h('div', { 'data-testid': 'entry-content' })
  }
})

function makeEntry(overrides = {}) {
  return {
    id: 'e1',
    component: markRaw(EntryComponent),
    props: {},
    presentation: 'dialog',
    settle: vi.fn(),
    markEntered: vi.fn(),
    ...overrides
  }
}

function mountEntry(props = {}) {
  return mount(OverlayEntry, {
    props: {
      entry: makeEntry(),
      inert: false,
      receded: false,
      requestClose: vi.fn(),
      ...props
    },
    global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
  })
}

describe('OverlayEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('receded=true stamps data-receded="true" on the rendered surface', () => {
    const wrapper = mountEntry({ receded: true })

    expect(wrapper.find('[data-testid="entry-content"]').attributes('data-receded')).toBe('true')
    wrapper.unmount()
  })

  test('receded=false stamps data-receded="false" on the rendered surface', () => {
    const wrapper = mountEntry({ receded: false })

    expect(wrapper.find('[data-testid="entry-content"]').attributes('data-receded')).toBe('false')
    wrapper.unmount()
  })
})
