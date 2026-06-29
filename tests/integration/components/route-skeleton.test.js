import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// ── Stubs ──────────────────────────────────────────────────────────────────────

const DashboardSkeletonStub = defineComponent({
  name: 'DashboardSkeleton',
  setup: () => () => h('div', { 'data-testid': 'dashboard-skeleton' })
})

const DeckSkeletonStub = defineComponent({
  name: 'DeckSkeleton',
  setup: () => () => h('div', { 'data-testid': 'deck-skeleton' })
})

// ── Imports ───────────────────────────────────────────────────────────────────

import RouteSkeleton from '@/components/route-skeleton.vue'

const stubs = {
  DashboardSkeleton: DashboardSkeletonStub,
  DeckSkeleton: DeckSkeletonStub
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RouteSkeleton', () => {
  test('renders DashboardSkeleton when name is "dashboard"', () => {
    const wrapper = shallowMount(RouteSkeleton, {
      props: { name: 'dashboard' },
      global: { stubs }
    })
    expect(wrapper.findComponent(DashboardSkeletonStub).exists()).toBe(true)
    expect(wrapper.findComponent(DeckSkeletonStub).exists()).toBe(false)
  })

  test('renders DeckSkeleton when name is "deck"', () => {
    const wrapper = shallowMount(RouteSkeleton, {
      props: { name: 'deck' },
      global: { stubs }
    })
    expect(wrapper.findComponent(DeckSkeletonStub).exists()).toBe(true)
    expect(wrapper.findComponent(DashboardSkeletonStub).exists()).toBe(false)
  })

  test('renders generic pulse div when name does not match a known route', () => {
    const wrapper = shallowMount(RouteSkeleton, {
      props: { name: 'unknown-route' },
      global: { stubs }
    })
    expect(wrapper.find('[data-testid="route-skeleton"]').exists()).toBe(true)
    expect(wrapper.findComponent(DashboardSkeletonStub).exists()).toBe(false)
    expect(wrapper.findComponent(DeckSkeletonStub).exists()).toBe(false)
  })

  test('renders generic pulse div when name is null', () => {
    const wrapper = shallowMount(RouteSkeleton, {
      props: { name: null },
      global: { stubs }
    })
    expect(wrapper.find('[data-testid="route-skeleton"]').exists()).toBe(true)
  })

  test('renders generic pulse div when name is undefined', () => {
    const wrapper = shallowMount(RouteSkeleton, {
      props: { name: undefined },
      global: { stubs }
    })
    expect(wrapper.find('[data-testid="route-skeleton"]').exists()).toBe(true)
  })
})
