import '@/styles/main.css'
import { describe, test, expect, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import DashboardTipCardSkeleton from '@/views/dashboard/tip-card/skeleton.vue'

let wrapper
let container

function mountSkeleton() {
  // Offset away from the viewport's (0, 0) corner — the tape overhangs above
  // the card's top edge, and a negative viewport coordinate is off-screen
  // rather than merely clipped, so `elementFromPoint` returns null there
  // regardless of what actually paints.
  container = document.createElement('div')
  container.style.paddingTop = '100px'
  document.body.appendChild(container)

  wrapper = mount(DashboardTipCardSkeleton, { attachTo: container })
  // The root is `hidden md:flex` — force it visible for geometry assertions
  // instead of depending on the headless viewport crossing the md breakpoint.
  wrapper.element.style.display = 'flex'
  return wrapper
}

afterEach(() => {
  wrapper?.unmount()
  container?.remove()
  wrapper = undefined
  container = undefined
})

describe('DashboardTipCardSkeleton', () => {
  test('renders the root with data-testid="dashboard-tip-card-skeleton"', () => {
    mountSkeleton()
    expect(wrapper.find('[data-testid="dashboard-tip-card-skeleton"]').exists()).toBe(true)
  })

  test('the root is a shimmer host that clips its own overflow [obligation]', () => {
    mountSkeleton()
    const card = wrapper.find('[data-testid="dashboard-tip-card-skeleton"]').element
    expect(getComputedStyle(card).overflow).toBe('hidden')
  })

  test('both text bars carry the diagonal-stripe mask [obligation]', () => {
    mountSkeleton()
    const bars = wrapper.findAll('[data-testid="dashboard-tip-card-skeleton__text-bar"]')
    expect(bars).toHaveLength(2)
    for (const bar of bars) {
      expect(getComputedStyle(bar.element, '::before').content).toBe('""')
    }
  })

  // ── the tape overhangs the shimmer-clipping card [obligation] ──────────────

  test('the tape is not a DOM descendant of the shimmer-clipping card [obligation]', () => {
    mountSkeleton()
    const nested = wrapper.find(
      '[data-testid="dashboard-tip-card-skeleton"] [data-testid="dashboard-tip-card-skeleton__tape"]'
    )
    expect(nested.exists()).toBe(false)
    expect(wrapper.find('[data-testid="dashboard-tip-card-skeleton__tape"]').exists()).toBe(true)
  })

  test('the tape geometrically overhangs above the card and is actually painted there [obligation]', () => {
    mountSkeleton()
    const card_rect = wrapper
      .find('[data-testid="dashboard-tip-card-skeleton"]')
      .element.getBoundingClientRect()
    const tape_rect = wrapper
      .find('[data-testid="dashboard-tip-card-skeleton__tape"]')
      .element.getBoundingClientRect()

    expect(tape_rect.top).toBeLessThan(card_rect.top)

    // The tape is rotated (rotate-3), so its silhouette doesn't fill its own
    // axis-aligned bounding box — sample a strip of points in the overhang
    // zone (above the card's top edge) rather than a single fixed corner.
    const overhang_y = card_rect.top - 4
    let painted = null
    for (let x = tape_rect.left; x <= tape_rect.right; x += 4) {
      const hit = document.elementFromPoint(x, overhang_y)
      if (hit?.closest('[data-testid="dashboard-tip-card-skeleton__tape"]')) {
        painted = hit
        break
      }
    }
    expect(painted).toBeTruthy()
  })

  // ── the tape is distinguishable from the card it overhangs onto [obligation] ─
  // Both share the same `bg-skeleton` role, so the tape's own stripe overlay
  // is what makes it visually distinct from the plain card underneath — not
  // a difference in the base fill colour.

  test('the tape carries its own diagonal-stripe mask, distinguishing it from the plain card underneath [obligation]', () => {
    mountSkeleton()
    const tape = wrapper.find('[data-testid="dashboard-tip-card-skeleton__tape"]').element
    const card = wrapper.find('[data-testid="dashboard-tip-card-skeleton"]').element

    expect(getComputedStyle(tape, '::before').content).toBe('""')
    expect(getComputedStyle(card, '::before').content).toBe('none')
  })

  test('the tape mask fill resolves to a colour different from the tape’s own base fill [obligation]', () => {
    mountSkeleton()
    const tape = wrapper.find('[data-testid="dashboard-tip-card-skeleton__tape"]').element
    const base_color = getComputedStyle(tape).backgroundColor
    const mask_color = getComputedStyle(tape, '::before').backgroundColor

    expect(mask_color).not.toBe(base_color)
  })
})
