// The assertions below read a real computed style (backdrop-filter), so the
// app's stylesheet has to be present — without it the Tailwind utility
// resolves to nothing and the check passes vacuously. This lives in its own
// file (isolated from panel.test.js's own browser page) so the stylesheet
// import doesn't change layout for the rest of that suite.
import '@/styles/main.css'

import { describe, test, expect, vi, afterEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'

vi.mock('@/sfx/bus', () => ({ emitSfx: vi.fn() }))
vi.mock('@/composables/ui/gestures', () => ({ useGestures: () => ({ register: vi.fn() }) }))
vi.mock('@/composables/ui/media-query', () => ({ useMatchMedia: () => ({ value: false }) }))
vi.mock('@/stores/motion', () => ({ useMotionStore: () => ({ factors: { duration: 1 } }) }))
vi.mock('gsap', () => ({
  gsap: {
    set: vi.fn(),
    to: vi.fn((_el, opts) => opts?.onComplete?.()),
    isTweening: vi.fn(() => false),
    timeline: () => {
      const state = { onComplete: null }
      const tl = {
        to: () => tl,
        fromTo: () => tl,
        call: (fn) => {
          fn?.()
          return tl
        },
        eventCallback: (_name, cb) => {
          state.onComplete = cb
          return tl
        },
        play: () => {
          state.onComplete?.()
          return tl
        },
        progress: () => tl,
        kill: () => tl
      }
      return tl
    }
  }
}))

const UiIconStub = defineComponent({
  name: 'UiIcon',
  props: ['src'],
  setup() {
    return () => h('div', { 'data-testid': 'ui-icon-stub' })
  }
})

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  emits: ['press'],
  setup(_props, { emit, slots }) {
    const attrs = useAttrs()
    return () => h('button', { ...attrs, onClick: () => emit('press') }, slots.default?.())
  }
})

import NoticePanel from '@/components/ui-kit/notice/panel.vue'

function makeNotice(overrides = {}) {
  return {
    id: '1',
    message: 'Hello',
    state: 'info',
    delay: 2000,
    closable: true,
    backdrop: true,
    ...overrides
  }
}

const mounted = []

async function mountPanel(notice) {
  const wrapper = mount(NoticePanel, {
    props: { notice },
    attachTo: document.body,
    global: {
      stubs: { UiIcon: UiIconStub, UiButton: UiButtonStub, Transition: false, transition: false }
    }
  })
  mounted.push(wrapper)
  await flushPromises()
  return wrapper
}

// ── tier gating (data-motion) ─────────────────────────────────────────────
// The full-screen backdrop's blur is a standing effect (never motion),
// tier-gated in CSS only via `:root[data-motion]` — see custom-variants.css's
// `tier-full` variant, whose own structural coverage
// (tests/unit/styles/custom-variants.test.js) proves the gate never folds in
// prefers-reduced-motion. Nothing in this component tree reads that
// preference in JS, so there is no JS-level toggle to re-verify at this layer.
describe('NoticePanel tier gating (data-motion)', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-motion')
    while (mounted.length > 0) mounted.pop().unmount()
  })

  test.each(['lean', 'minimal'])(
    'data-motion="%s": the backdrop dims without blurring',
    async (tier) => {
      document.documentElement.setAttribute('data-motion', tier)
      const wrapper = await mountPanel(makeNotice({ backdrop: true }))

      const style = getComputedStyle(
        wrapper.find('[data-testid="ui-kit-notice-panel-backdrop"]').element
      )
      expect(style.backdropFilter).toBe('none')
      expect(style.backgroundColor).toBe('oklab(0 0 0 / 0.1)')
    }
  )

  test('data-motion="full": the backdrop dims and blurs', async () => {
    document.documentElement.setAttribute('data-motion', 'full')
    const wrapper = await mountPanel(makeNotice({ backdrop: true }))

    const style = getComputedStyle(
      wrapper.find('[data-testid="ui-kit-notice-panel-backdrop"]').element
    )
    expect(style.backdropFilter).toBe('blur(4px)')
    expect(style.backgroundColor).toBe('oklab(0 0 0 / 0.1)')
  })
})
