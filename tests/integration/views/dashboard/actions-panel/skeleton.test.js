import '@/styles/main.css'
import { describe, test, expect, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import DashboardActionsPanelSkeleton from '@/views/dashboard/actions-panel/skeleton.vue'
import MemberPolaroid from '@/components/member/member-polaroid.vue'

let wrapper
let page_probe
let container

function mountSkeleton() {
  // A bare page-station swatch, sibling in the document, stands in for "the
  // page behind" the panel — the ambient surface with no station override.
  page_probe = document.createElement('div')
  page_probe.className = 'bg-surface'
  document.body.appendChild(page_probe)

  // Offset the mount point away from the viewport's own (0, 0) corner — the
  // polaroid overhangs past the shell's top-left edge, and a point at a
  // negative viewport coordinate is off-screen, not merely clipped, so
  // `elementFromPoint` returns null there regardless of what actually paints.
  container = document.createElement('div')
  container.style.paddingLeft = '100px'
  container.style.paddingTop = '100px'
  document.body.appendChild(container)

  wrapper = mount(DashboardActionsPanelSkeleton, { attachTo: container })
  return wrapper
}

afterEach(() => {
  wrapper?.unmount()
  page_probe?.remove()
  container?.remove()
  wrapper = undefined
  page_probe = undefined
  container = undefined
})

describe('DashboardActionsPanelSkeleton (views/dashboard/actions-panel/skeleton.vue)', () => {
  test('renders the root skeleton with data-testid="dashboard-actions-panel-skeleton"', () => {
    mountSkeleton()
    expect(wrapper.find('[data-testid="dashboard-actions-panel-skeleton"]').exists()).toBe(true)
  })

  test('renders the polaroid placeholder', () => {
    mountSkeleton()
    expect(
      wrapper.find('[data-testid="dashboard-actions-panel-skeleton__polaroid"]').exists()
    ).toBe(true)
  })

  test('the polaroid placeholder stamps the constant data-station="float"', () => {
    mountSkeleton()
    expect(
      wrapper
        .find(
          '[data-testid="dashboard-actions-panel-skeleton__polaroid"] [data-testid="member-polaroid__frame"]'
        )
        .attributes('data-station')
    ).toBe('float')
  })

  test('renders inside the shared shell header and body wrappers', () => {
    mountSkeleton()
    expect(wrapper.find('[data-testid="dashboard-actions-panel-shell__header"]').exists()).toBe(
      true
    )
    expect(wrapper.find('[data-testid="dashboard-actions-panel-shell__body"]').exists()).toBe(true)
  })

  // ── real member-polaroid, not a hand-rolled copy ──────────────
  // The regression is a duplicated offset drifting from the real component —
  // guard that this call site renders the actual MemberPolaroid instance, not
  // a div reproducing its geometry.

  test('renders the polaroid through the real MemberPolaroid component', () => {
    mountSkeleton()
    const polaroid = wrapper.findComponent(MemberPolaroid)
    expect(polaroid.exists()).toBe(true)
    expect(polaroid.find('[data-testid="member-polaroid__frame"]').exists()).toBe(true)
  })

  test('the photo placeholder fills the real member-polaroid photo slot', () => {
    mountSkeleton()
    const photo_container = wrapper.find('[data-testid="member-polaroid__photo"]')
    expect(
      photo_container.find('[data-testid="dashboard-actions-panel-skeleton__photo"]').exists()
    ).toBe(true)
  })

  // ── shimmer clipping ───────────────────────────────────────────
  // The shimmer utility clips its own host via overflow:hidden. The polaroid
  // overhangs the shell's top-left corner and must not be clipped by it.

  test('the shimmer host actually clips its own overflow', () => {
    mountSkeleton()
    const host = wrapper.find('[data-testid="dashboard-actions-panel-skeleton"]').element
    expect(getComputedStyle(host).overflow).toBe('hidden')
  })

  test('the polaroid is not a DOM descendant of the shimmer-clipping shell', () => {
    mountSkeleton()
    const nested = wrapper.find(
      '[data-testid="dashboard-actions-panel-skeleton"] [data-testid="dashboard-actions-panel-skeleton__polaroid"]'
    )
    expect(nested.exists()).toBe(false)
    expect(
      wrapper.find('[data-testid="dashboard-actions-panel-skeleton__polaroid"]').exists()
    ).toBe(true)
  })

  test('the polaroid geometrically overhangs past the shell edge and is actually painted there', () => {
    mountSkeleton()
    const shell_rect = wrapper
      .find('[data-testid="dashboard-actions-panel-skeleton"]')
      .element.getBoundingClientRect()
    const polaroid_rect = wrapper
      .find('[data-testid="dashboard-actions-panel-skeleton__polaroid"]')
      .element.getBoundingClientRect()

    expect(polaroid_rect.left).toBeLessThan(shell_rect.left)

    // The polaroid is rotated (-rotate-12), so its silhouette doesn't fill its
    // own axis-aligned bounding box — sample a strip of points in the overhang
    // zone (past the shell's left edge) rather than a single fixed corner.
    const overhang_x = shell_rect.left - 4
    let painted = null
    for (let y = polaroid_rect.top; y <= polaroid_rect.bottom; y += 4) {
      const hit = document.elementFromPoint(overhang_x, y)
      if (hit?.closest('[data-testid="dashboard-actions-panel-skeleton__polaroid"]')) {
        painted = hit
        break
      }
    }
    expect(painted).toBeTruthy()
  })

  // ── header stripes below the fill ──────────────────────────────

  test('the header text placeholder has no stripe mask on itself, so its own fill is visible', () => {
    mountSkeleton()
    const header = wrapper.find(
      '[data-testid="dashboard-actions-panel-skeleton__header-block"]'
    ).element
    expect(getComputedStyle(header, '::before').content).toBe('none')
  })

  test('the shell carries the stripe mask, painted below the header text placeholder', () => {
    mountSkeleton()
    const shell = wrapper.find('[data-testid="dashboard-actions-panel-skeleton"]').element
    expect(getComputedStyle(shell, '::before').content).toBe('""')
  })

  // ── distinguishable colours ────────────────────────────────────

  test('the actions-panel surface is a different resolved colour than the page behind it', () => {
    mountSkeleton()
    const shell = wrapper.find('[data-testid="dashboard-actions-panel-skeleton"]').element
    const panel_color = getComputedStyle(shell).backgroundColor
    const page_color = getComputedStyle(page_probe).backgroundColor

    expect(panel_color).not.toBe(page_color)
  })

  test('the actions-panel surface is a different resolved colour than its own skeleton placeholders', () => {
    mountSkeleton()
    const shell = wrapper.find('[data-testid="dashboard-actions-panel-skeleton"]').element
    const header = wrapper.find(
      '[data-testid="dashboard-actions-panel-skeleton__header-block"]'
    ).element

    expect(getComputedStyle(shell).backgroundColor).not.toBe(
      getComputedStyle(header).backgroundColor
    )
  })

  test('the polaroid overhang is a different resolved colour than the panel it overhangs onto', () => {
    mountSkeleton()
    const shell = wrapper.find('[data-testid="dashboard-actions-panel-skeleton"]').element
    const frame = wrapper.find('[data-testid="member-polaroid__frame"]').element

    expect(getComputedStyle(frame).backgroundColor).not.toBe(
      getComputedStyle(shell).backgroundColor
    )
  })
})
