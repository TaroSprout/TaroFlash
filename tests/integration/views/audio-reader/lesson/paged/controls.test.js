import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: vi.fn() }))

import PagedControls from '@/views/audio-reader/lesson/paged/controls.vue'

const UiIconStub = defineComponent({
  name: 'UiIcon',
  props: ['src'],
  setup(props) {
    return () => h('span', { 'data-testid': 'ui-icon', 'data-src': props.src })
  }
})

const ScrubberStub = defineComponent({
  name: 'Scrubber',
  props: ['player', 'layout'],
  setup(props) {
    return () => h('div', { 'data-testid': 'scrubber-stub', 'data-layout': props.layout })
  }
})

function makePlayer(overrides = {}) {
  return {
    current_time: ref(0),
    duration: ref(120),
    is_playing: ref(false),
    play: vi.fn(),
    pause: vi.fn(),
    skip: vi.fn(),
    ...overrides
  }
}

function mountControls(props = {}) {
  return shallowMount(PagedControls, {
    props: { player: makePlayer(), ...props },
    global: { stubs: { UiIcon: UiIconStub, Scrubber: ScrubberStub } }
  })
}

describe('PagedControls', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
  })

  test('renders the transport controls and the scrubber', () => {
    const wrapper = mountControls()

    expect(wrapper.find('[data-testid="paged-controls__toggle"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="paged-controls__skip-forward"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="paged-controls__skip-back"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="paged-controls__settings"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="scrubber-stub"]').attributes('data-layout')).toBe('inline')
  })

  test('toggle calls player.play() when paused, and emits ui.press', async () => {
    const player = makePlayer({ is_playing: ref(false) })
    const wrapper = mountControls({ player })

    await wrapper.find('[data-testid="paged-controls__toggle"]').trigger('click')

    expect(player.play).toHaveBeenCalledOnce()
    expect(player.pause).not.toHaveBeenCalled()
    expect(mockEmitSfx).toHaveBeenCalledWith('ui.press')
  })

  test('toggle calls player.pause() when playing, and emits dialog.open', async () => {
    const player = makePlayer({ is_playing: ref(true) })
    const wrapper = mountControls({ player })

    await wrapper.find('[data-testid="paged-controls__toggle"]').trigger('click')

    expect(player.pause).toHaveBeenCalledOnce()
    expect(player.play).not.toHaveBeenCalled()
    expect(mockEmitSfx).toHaveBeenCalledWith('dialog.open')
  })

  test('skip-forward calls player.skip(10)', async () => {
    const player = makePlayer()
    const wrapper = mountControls({ player })

    await wrapper.find('[data-testid="paged-controls__skip-forward"]').trigger('click')

    expect(player.skip).toHaveBeenCalledWith(10)
    expect(mockEmitSfx).toHaveBeenCalledWith('ui.press')
  })

  test('skip-back calls player.skip(-10)', async () => {
    const player = makePlayer()
    const wrapper = mountControls({ player })

    await wrapper.find('[data-testid="paged-controls__skip-back"]').trigger('click')

    expect(player.skip).toHaveBeenCalledWith(-10)
  })

  test('settings button emits open-settings', async () => {
    const wrapper = mountControls()

    await wrapper.find('[data-testid="paged-controls__settings"]').trigger('click')

    expect(wrapper.emitted('open-settings')).toHaveLength(1)
  })
})
