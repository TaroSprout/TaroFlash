import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import PerfOverlay from '@/components/dev/perf-overlay.vue'
import { PERF_BUDGET } from '@/utils/motion/perf-budget'
import '@/styles/main.css'

const mockState = reactive({
  fps: 60,
  droppedFrames: 0,
  onScreenElementCount: 0
})

vi.mock('@/composables/dev/use-perf-overlay', () => ({
  usePerfOverlay: () => ({ state: mockState, budget: PERF_BUDGET })
}))

function resetState() {
  mockState.fps = 60
  mockState.droppedFrames = 0
  mockState.onScreenElementCount = 0
}

beforeEach(resetState)

describe('PerfOverlay', () => {
  test('renders exactly the framerate and elements rows', () => {
    const wrapper = mount(PerfOverlay, { attachTo: document.body })

    expect(wrapper.find('[data-testid="perf-overlay__framerate"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="perf-overlay__elements"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="perf-overlay__frame"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="perf-overlay__standing-effects"]').exists()).toBe(false)
    wrapper.unmount()
  })

  test('shows the rounded fps and dropped-frame count in the framerate row', () => {
    mockState.fps = 59.6
    mockState.droppedFrames = 3
    const wrapper = mount(PerfOverlay, { attachTo: document.body })

    expect(wrapper.get('[data-testid="perf-overlay__framerate"]').text()).toBe(
      'framerate: 60fps · dropped 3'
    )
    wrapper.unmount()
  })

  test('shows the on-screen element count in the elements row', () => {
    mockState.onScreenElementCount = 42
    const wrapper = mount(PerfOverlay, { attachTo: document.body })

    expect(wrapper.get('[data-testid="perf-overlay__elements"]').text()).toBe('elements: 42')
    wrapper.unmount()
  })

  test('the framerate row reads its default colour while fps sits at or above the warn threshold', async () => {
    const wrapper = mount(PerfOverlay, { attachTo: document.body })

    const framerate = wrapper.get('[data-testid="perf-overlay__framerate"]').element
    const default_color = getComputedStyle(framerate).color

    mockState.fps = 55
    await wrapper.vm.$nextTick()
    expect(getComputedStyle(framerate).color).toBe(default_color)
    wrapper.unmount()
  })

  test('the framerate row flips to a warn colour, then a distinct danger colour, as fps drops', async () => {
    const wrapper = mount(PerfOverlay, { attachTo: document.body })
    const framerate = wrapper.get('[data-testid="perf-overlay__framerate"]').element
    const default_color = getComputedStyle(framerate).color

    mockState.fps = 50
    await wrapper.vm.$nextTick()
    const warn_color = getComputedStyle(framerate).color
    expect(warn_color).not.toBe(default_color)

    mockState.fps = 40
    await wrapper.vm.$nextTick()
    const danger_color = getComputedStyle(framerate).color
    expect(danger_color).not.toBe(default_color)
    expect(danger_color).not.toBe(warn_color)
    wrapper.unmount()
  })

  test('the elements row reads its default colour while the on-screen count sits under budget', () => {
    const wrapper = mount(PerfOverlay, { attachTo: document.body })

    const elements = wrapper.get('[data-testid="perf-overlay__elements"]').element
    const framerate = wrapper.get('[data-testid="perf-overlay__framerate"]').element
    expect(getComputedStyle(elements).color).toBe(getComputedStyle(framerate).color)
    wrapper.unmount()
  })

  test('the elements row flips to a warn colour, then a distinct danger colour, as the count rises past budget', async () => {
    const wrapper = mount(PerfOverlay, { attachTo: document.body })
    const elements = wrapper.get('[data-testid="perf-overlay__elements"]').element
    const default_color = getComputedStyle(elements).color

    mockState.onScreenElementCount = Math.ceil(PERF_BUDGET.maxOnScreenElements * 0.5) // ratio 0.5 — warn
    await wrapper.vm.$nextTick()
    const warn_color = getComputedStyle(elements).color
    expect(warn_color).not.toBe(default_color)

    mockState.onScreenElementCount = Math.ceil(PERF_BUDGET.maxOnScreenElements * 0.75) // ratio 0.75 — danger
    await wrapper.vm.$nextTick()
    const danger_color = getComputedStyle(elements).color
    expect(danger_color).not.toBe(default_color)
    expect(danger_color).not.toBe(warn_color)
    wrapper.unmount()
  })
})
