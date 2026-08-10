import { describe, test, expect, vi } from 'vite-plus/test'
import { mount as vueMount } from '@vue/test-utils'
import SkippedLinesDialog from '@/views/deck/card-import/skipped-lines-dialog.vue'
import { vSfx } from '@/sfx/directive'

const { mockEmitSfx, mockEmitHoverSfx } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockEmitHoverSfx: vi.fn()
}))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: mockEmitHoverSfx }))

// Real dialog-card: shallowMount stubs its default slot away entirely, and
// the list of skipped lines is rendered into that slot.
function mount(lines = [], close = vi.fn()) {
  return vueMount(SkippedLinesDialog, {
    props: { lines, close },
    global: { directives: { sfx: vSfx } }
  })
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
})
