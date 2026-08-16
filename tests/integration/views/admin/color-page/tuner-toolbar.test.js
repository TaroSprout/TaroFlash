import { describe, test, expect, beforeEach, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import TunerToolbar from '@/views/admin/color-page/tuner-toolbar.vue'
import { colorTunerKey, useColorTuner } from '@/views/admin/color-page/use-color-tuner'

const wrappers = []

function mountToolbar() {
  const tuner = useColorTuner()
  const Host = defineComponent({
    setup() {
      return () => h(TunerToolbar)
    }
  })

  const wrapper = mount(Host, {
    global: { provide: { [colorTunerKey]: tuner } },
    attachTo: document.body
  })
  wrappers.push(wrapper)
  return { wrapper, tuner }
}

describe('TunerToolbar', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    wrappers.forEach((w) => w.unmount())
    wrappers.length = 0
    document.body.innerHTML = ''
  })

  test('undo is disabled with no history and enabled once a change lands', async () => {
    const { wrapper, tuner } = mountToolbar()
    expect(wrapper.find('[data-testid="tuner-toolbar__undo"]').attributes('aria-disabled')).toBe(
      'true'
    )

    tuner.resetAll()
    await nextTick()

    expect(
      wrapper.find('[data-testid="tuner-toolbar__undo"]').attributes('aria-disabled')
    ).toBeUndefined()
  })

  test('clicking undo reverts the last change', async () => {
    const { wrapper, tuner } = mountToolbar()
    tuner.setRole('light', 'page', 'surface', null)
    await nextTick()
    expect(tuner.roleId('light', 'page', 'surface')).toBeNull()

    await wrapper.find('[data-testid="tuner-toolbar__undo"]').trigger('click')

    expect(tuner.roleId('light', 'page', 'surface')).not.toBeNull()
  })

  test('redo is disabled until something has been undone, then replays it', async () => {
    const { wrapper, tuner } = mountToolbar()
    tuner.resetAll()
    await nextTick()
    expect(wrapper.find('[data-testid="tuner-toolbar__redo"]').attributes('aria-disabled')).toBe(
      'true'
    )

    tuner.undo()
    await nextTick()
    expect(
      wrapper.find('[data-testid="tuner-toolbar__redo"]').attributes('aria-disabled')
    ).toBeUndefined()

    await wrapper.find('[data-testid="tuner-toolbar__redo"]').trigger('click')
    expect(wrapper.find('[data-testid="tuner-toolbar__redo"]').attributes('aria-disabled')).toBe(
      'true'
    )
  })

  test('reset-all restores the shipped defaults', async () => {
    const { wrapper, tuner } = mountToolbar()
    tuner.setRole('light', 'page', 'surface', null)
    await nextTick()
    expect(tuner.roleId('light', 'page', 'surface')).toBeNull()

    await wrapper.find('[data-testid="tuner-toolbar__reset-all"]').trigger('click')

    expect(tuner.roleId('light', 'page', 'surface')).not.toBeNull()
  })

  test('Cmd+Z anywhere outside a text field triggers undo', async () => {
    const { tuner } = mountToolbar()
    tuner.resetAll()
    await nextTick()
    expect(tuner.undo_label.value).not.toBeNull()

    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', metaKey: true, bubbles: true })
    )
    await nextTick()

    expect(tuner.undo_label.value).toBeNull()
  })

  test('Cmd+Z while typing in a text field is left to the field, not routed to undo', async () => {
    const { tuner } = mountToolbar()
    tuner.resetAll()
    await nextTick()
    expect(tuner.undo_label.value).not.toBeNull()

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true, bubbles: true }))
    await nextTick()

    expect(tuner.undo_label.value).not.toBeNull()
    input.remove()
  })

  test('the export panel is hidden until the export button is pressed, then toggles closed on a second press', async () => {
    const { wrapper } = mountToolbar()
    expect(document.body.querySelector('[data-testid="tuner-toolbar__export-panel"]')).toBeNull()

    await wrapper.find('[data-testid="tuner-toolbar__export"]').trigger('click')
    expect(
      document.body.querySelector('[data-testid="tuner-toolbar__export-panel"]')
    ).not.toBeNull()

    await wrapper.find('[data-testid="tuner-toolbar__export"]').trigger('click')
    expect(document.body.querySelector('[data-testid="tuner-toolbar__export-panel"]')).toBeNull()
  })

  test('the export panel text contains the Stations export section', async () => {
    const { wrapper } = mountToolbar()
    await wrapper.find('[data-testid="tuner-toolbar__export"]').trigger('click')

    const text_el = document.body.querySelector('[data-testid="tuner-toolbar__export-text"]')
    expect(text_el.textContent).toContain('Stations')
  })
})
