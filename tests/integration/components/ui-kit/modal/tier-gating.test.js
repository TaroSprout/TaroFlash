// The assertions below read real computed styles (backdrop-filter, filter),
// so the app's stylesheet has to be present — without it every Tailwind
// utility resolves to nothing and those checks pass vacuously. This lives in
// its own file (isolated from index.test.js's own browser page) so the
// stylesheet import doesn't change layout/geometry for the scroll-lock tests
// over there, which assert against unstyled box heights.
import '@/styles/main.css'

import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import ModalUiKit from '@/components/ui-kit/modal/index.vue'
import { useModal, request_close_handlers } from '@/composables/modal'

vi.mock('@/composables/shortcuts', () => ({
  useShortcuts: vi.fn(() => ({ register: vi.fn(), dispose: vi.fn(), clearScope: vi.fn() }))
}))

// gsap is imported transitively via modal-mode-config → animations/modal.
// The mock must call onComplete so transition-group JS hooks finish in browser mode.
vi.mock('gsap', () => ({
  gsap: {
    set: vi.fn(),
    fromTo: vi.fn((_el, _from, to) => to?.onComplete?.()),
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
          state.onComplete?.() // recede/restore drive gsap.timeline, which completes synchronously on play() within the triggering tick
          return tl
        },
        progress: () => tl,
        kill: () => tl
      }
      return tl
    }
  }
}))

vi.mock('@/stores/motion', () => ({ useMotionStore: () => ({ factors: { duration: 1 } }) }))
vi.mock('@/composables/ui/media-query', () => ({ useMatchMedia: () => ({ value: false }) }))

const ModalStub = defineComponent({
  render() {
    return h('div', { 'data-testid': 'modal-stub' })
  }
})

const mounted = []

function mountModal() {
  const wrapper = mount(ModalUiKit, { attachTo: document.body })
  mounted.push(wrapper)
  return wrapper
}

// ── tier gating (data-motion) ─────────────────────────────────────────────
// The full-screen backdrop's blur and the modal-recede blur are both standing
// effects (never motion), tier-gated in CSS only via `:root[data-motion]` —
// see custom-variants.css's `tier-full` variant, whose own structural
// coverage (tests/unit/styles/custom-variants.test.js) proves the gate never
// folds in prefers-reduced-motion. Nothing in this component tree reads that
// preference in JS, so there is no JS-level toggle to re-verify at this layer.
describe('modal.vue tier gating (data-motion)', () => {
  let transition_override

  beforeEach(() => {
    const { modal_stack, pop } = useModal()
    while (modal_stack.value.length > 0) pop()
    request_close_handlers.clear()

    // The recede filter transitions over 400ms in real CSS; disable it here so
    // the target value reads synchronously instead of needing a real-time wait.
    transition_override = document.createElement('style')
    transition_override.textContent =
      "[data-testid='ui-kit-modal'] { transition: none !important; }"
    document.head.appendChild(transition_override)
  })

  afterEach(() => {
    document.documentElement.removeAttribute('data-motion')
    transition_override.remove()
    while (mounted.length > 0) mounted.pop().unmount()
  })

  test.each(['lean', 'minimal'])(
    'data-motion="%s": the modal-stack backdrop dims without blurring',
    async (tier) => {
      document.documentElement.setAttribute('data-motion', tier)
      const { open } = useModal()
      open(ModalStub, { backdrop: true })

      const wrapper = mountModal()
      await nextTick()

      const style = getComputedStyle(wrapper.find('[data-testid="ui-kit-modal-backdrop"]').element)
      expect(style.backdropFilter).toBe('none')
      expect(style.backgroundColor).toBe('oklab(0 0 0 / 0.1)')
    }
  )

  test('data-motion="full": the modal-stack backdrop dims and blurs', async () => {
    document.documentElement.setAttribute('data-motion', 'full')
    const { open } = useModal()
    open(ModalStub, { backdrop: true })

    const wrapper = mountModal()
    await nextTick()

    const style = getComputedStyle(wrapper.find('[data-testid="ui-kit-modal-backdrop"]').element)
    expect(style.backdropFilter).toBe('blur(4px)')
    expect(style.backgroundColor).toBe('oklab(0 0 0 / 0.1)')
  })

  test.each(['lean', 'minimal'])(
    'data-motion="%s": a receded modal dims without blurring',
    async (tier) => {
      document.documentElement.setAttribute('data-motion', tier)
      const { open } = useModal()
      const wrapper = mountModal()

      open(ModalStub)
      await nextTick()
      open(ModalStub)
      await nextTick()

      const receded = wrapper.findAll('[data-testid="ui-kit-modal"]')[0].element
      expect(getComputedStyle(receded).filter).toBe('brightness(0.8)')
    }
  )

  test('data-motion="full": a receded modal dims and blurs', async () => {
    document.documentElement.setAttribute('data-motion', 'full')
    const { open } = useModal()
    const wrapper = mountModal()

    open(ModalStub)
    await nextTick()
    open(ModalStub)
    await nextTick()

    const receded = wrapper.findAll('[data-testid="ui-kit-modal"]')[0].element
    expect(getComputedStyle(receded).filter).toBe('brightness(0.8) blur(2px)')
  })
})
