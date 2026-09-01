import { describe, test, expect, vi, afterEach } from 'vite-plus/test'
import { mount as vueMount } from '@vue/test-utils'
import SkippedLinesDialog from '@/views/deck/card-import/skipped-lines-dialog.vue'
import { vSfx } from '@/sfx/directive'
import { waitForScrollSettle } from '../../../../helpers/scroll-settle'

const { mockEmitSfx, mockEmitHoverSfx } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockEmitHoverSfx: vi.fn()
}))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: mockEmitHoverSfx }))

// Real dialog-card: shallowMount stubs its default slot away entirely, and
// the list of skipped lines is rendered into that slot.
function mount(lines = [], close = vi.fn(), options = {}) {
  return vueMount(SkippedLinesDialog, {
    props: { lines, close },
    global: { directives: { sfx: vSfx } },
    ...options
  })
}

// ── Overflow geometry helper ─────────────────────────────────────────────────
// Tailwind utilities aren't compiled here, so the scroll-region scroller's own
// flex/min-h-0 can't be trusted to clip it — force real geometry directly, the
// same way scroll-region's own tests do.

let _activeWrappers = []

afterEach(() => {
  for (const w of _activeWrappers) w.unmount()
  _activeWrappers = []
})

const waitForUpdate = waitForScrollSettle

function mountOverflowing(height = 60) {
  const lines = Array.from({ length: 40 }, (_, i) => ({ line: i + 1, text: `bad row ${i + 1}` }))
  const wrapper = mount(lines, vi.fn(), { attachTo: document.body })
  _activeWrappers.push(wrapper)

  const scroller = wrapper.find('[data-testid="scroll-region__scroller"]').element
  scroller.style.height = `${height}px`
  scroller.style.overflowY = 'auto'
  scroller.style.display = 'block'

  return wrapper
}

describe('card-import/skipped-lines-dialog', () => {
  test('renders one line entry per skipped line, with its number and text', () => {
    const wrapper = mount([
      { line: 3, text: 'bad row 1' },
      { line: 7, text: 'bad row 2' }
    ])
    const entries = wrapper.findAll('[data-testid="skipped-lines-dialog__line"]')
    expect(entries).toHaveLength(2)
    expect(entries[0].find('[data-testid="skipped-lines-dialog__line-number"]').text()).toBe('3')
    expect(entries[0].find('[data-testid="skipped-lines-dialog__line-text"]').text()).toBe(
      'bad row 1'
    )
    expect(entries[1].find('[data-testid="skipped-lines-dialog__line-number"]').text()).toBe('7')
  })

  test('renders no line entries when the list is empty', () => {
    const wrapper = mount([])
    expect(wrapper.findAll('[data-testid="skipped-lines-dialog__line"]')).toHaveLength(0)
  })

  test('clicking the dialog-card close button calls the close prop', async () => {
    const close = vi.fn()
    const wrapper = mount([], close)
    await wrapper.find('[data-testid="dialog-card__close"]').trigger('click')
    expect(close).toHaveBeenCalledOnce()
  })

  test('the list renders a scroll-region handle once its lines overflow', async () => {
    const wrapper = mountOverflowing()
    await waitForUpdate()

    const list = wrapper.find('[data-testid="skipped-lines-dialog__list"]')
    expect(list.attributes('data-scroll')).toBe('self')
    expect(list.find('[data-testid="scroll-region__handle"]').exists()).toBe(true)
  })
})
