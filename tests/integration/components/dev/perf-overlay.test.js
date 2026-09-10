import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import PerfOverlay from '@/components/dev/perf-overlay.vue'
import { PERF_BUDGET } from '@/utils/motion/perf-budget'
import '@/styles/main.css'

const mockState = reactive({
  frameMs: 0,
  droppedFrames: 0,
  onScreenElementCount: 0,
  standingEffectAreaRatio: 0
})

vi.mock('@/composables/dev/use-perf-overlay', () => ({
  usePerfOverlay: () => ({ state: mockState, budget: PERF_BUDGET })
}))

const RED_500_RGB = 'rgb(230, 96, 97)'

function resetState() {
  mockState.frameMs = 0
  mockState.droppedFrames = 0
  mockState.onScreenElementCount = 0
  mockState.standingEffectAreaRatio = 0
}

beforeEach(resetState)

describe('PerfOverlay', () => {
  test('reads black-on-plain colour for every metric while all readings sit under budget', () => {
    const wrapper = mount(PerfOverlay, { attachTo: document.body })

    const frame = wrapper.get('[data-testid="perf-overlay__frame"]').element
    const elements = wrapper.get('[data-testid="perf-overlay__elements"]').element
    const standing = wrapper.get('[data-testid="perf-overlay__standing-effects"]').element

    expect(getComputedStyle(frame).color).not.toBe(RED_500_RGB)
    expect(getComputedStyle(elements).color).not.toBe(RED_500_RGB)
    expect(getComputedStyle(standing).color).not.toBe(RED_500_RGB)
    wrapper.unmount()
  })

  test('flags only the frame metric red once frameMs exceeds the frame budget', async () => {
    const wrapper = mount(PerfOverlay, { attachTo: document.body })

    mockState.frameMs = PERF_BUDGET.frameMs + 1
    await wrapper.vm.$nextTick()

    const frame = wrapper.get('[data-testid="perf-overlay__frame"]').element
    const elements = wrapper.get('[data-testid="perf-overlay__elements"]').element

    expect(getComputedStyle(frame).color).toBe(RED_500_RGB)
    expect(getComputedStyle(elements).color).not.toBe(RED_500_RGB)
    wrapper.unmount()
  })

  test('does not flag the frame metric red when frameMs sits exactly at the budget', async () => {
    const wrapper = mount(PerfOverlay, { attachTo: document.body })

    mockState.frameMs = PERF_BUDGET.frameMs
    await wrapper.vm.$nextTick()

    const frame = wrapper.get('[data-testid="perf-overlay__frame"]').element
    expect(getComputedStyle(frame).color).not.toBe(RED_500_RGB)
    wrapper.unmount()
  })

  test('flags only the elements metric red once onScreenElementCount exceeds the budget', async () => {
    const wrapper = mount(PerfOverlay, { attachTo: document.body })

    mockState.onScreenElementCount = PERF_BUDGET.maxOnScreenElements + 1
    await wrapper.vm.$nextTick()

    const frame = wrapper.get('[data-testid="perf-overlay__frame"]').element
    const elements = wrapper.get('[data-testid="perf-overlay__elements"]').element
    const standing = wrapper.get('[data-testid="perf-overlay__standing-effects"]').element

    expect(getComputedStyle(elements).color).toBe(RED_500_RGB)
    expect(getComputedStyle(frame).color).not.toBe(RED_500_RGB)
    expect(getComputedStyle(standing).color).not.toBe(RED_500_RGB)
    wrapper.unmount()
  })

  test('flags only the standing-effects metric red once standingEffectAreaRatio exceeds the budget', async () => {
    const wrapper = mount(PerfOverlay, { attachTo: document.body })

    mockState.standingEffectAreaRatio = PERF_BUDGET.maxStandingEffectAreaRatio + 0.01
    await wrapper.vm.$nextTick()

    const standing = wrapper.get('[data-testid="perf-overlay__standing-effects"]').element
    const elements = wrapper.get('[data-testid="perf-overlay__elements"]').element

    expect(getComputedStyle(standing).color).toBe(RED_500_RGB)
    expect(getComputedStyle(elements).color).not.toBe(RED_500_RGB)
    wrapper.unmount()
  })
})
