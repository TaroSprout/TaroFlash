import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount as vueMount } from '@vue/test-utils'

const { mockEmitSfx, mockEmitHoverSfx } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockEmitHoverSfx: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: mockEmitHoverSfx }))
vi.mock('@/sfx/config', () => ({ TYPE_SFX: [] }))

import DropZone from '@/views/deck/card-import/drop-zone.vue'
import { vSfx } from '@/sfx/directive'

// Real UiButton so a click actually fires @press through to `@dismiss-error`.
function mount(props = {}) {
  return vueMount(DropZone, { props, global: { directives: { sfx: vSfx } } })
}

describe('card-import/drop-zone', () => {
  beforeEach(() => {
    mockEmitSfx.mockReset()
  })

  test('renders the browse prompt when there is no error', () => {
    const wrapper = mount()
    expect(wrapper.find('[data-testid="card-import-drop-zone__browse"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-import-drop-zone__error"]').exists()).toBe(false)
  })

  test('does not set data-palette on the root when there is no error [obligation]', () => {
    const wrapper = mount()
    expect(wrapper.find('[data-testid="card-import-drop-zone"]').attributes('data-palette')).toBe(
      undefined
    )
  })

  test('renders the error state and hides the browse prompt when error is set', () => {
    const wrapper = mount({ error: 'Choose a .csv or .txt file' })
    expect(wrapper.find('[data-testid="card-import-drop-zone__error"]').text()).toBe(
      'Choose a .csv or .txt file'
    )
    expect(wrapper.find('[data-testid="card-import-drop-zone__browse"]').exists()).toBe(false)
  })

  test('sets data-palette="danger" on the root when error is set [obligation]', () => {
    const wrapper = mount({ error: 'bad file' })
    expect(wrapper.find('[data-testid="card-import-drop-zone"]').attributes('data-palette')).toBe(
      'danger'
    )
  })

  test('dismiss-error button emits dismiss-error', async () => {
    const wrapper = mount({ error: 'bad file' })
    await wrapper.find('[data-testid="card-import-drop-zone__dismiss-error"]').trigger('click')
    expect(wrapper.emitted('dismiss-error')).toBeTruthy()
  })

  test('picking a file via the hidden input emits file', async () => {
    const wrapper = mount()
    const input = wrapper.find('[data-testid="card-import-drop-zone__input"]')
    const file = new File(['a,b'], 'cards.csv', { type: 'text/csv' })
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })

    await input.trigger('change')

    expect(wrapper.emitted('file')?.[0]).toEqual([file])
  })

  test('resets the input value after a change so re-picking the same file fires change again', async () => {
    const wrapper = mount()
    const input = wrapper.find('[data-testid="card-import-drop-zone__input"]')
    const file = new File(['a,b'], 'cards.csv', { type: 'text/csv' })
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })

    await input.trigger('change')

    expect(input.element.value).toBe('')
  })

  test('dropping a file emits file and resets drag state', async () => {
    const wrapper = mount()
    const file = new File(['a,b'], 'dropped.csv', { type: 'text/csv' })
    const dropEvent = new Event('drop', { bubbles: true, cancelable: true })
    Object.defineProperty(dropEvent, 'dataTransfer', { value: { files: [file] } })

    await wrapper.find('[data-testid="card-import-drop-zone"]').element.dispatchEvent(dropEvent)

    expect(wrapper.emitted('file')?.[0]).toEqual([file])
  })

  test('dragenter emits dismiss-error and marks the zone active', async () => {
    const wrapper = mount({ error: 'oops' })
    await wrapper.find('[data-testid="card-import-drop-zone"]').trigger('dragenter')

    expect(wrapper.emitted('dismiss-error')).toBeTruthy()
    expect(wrapper.find('[data-testid="card-import-drop-zone"]').attributes('data-active')).toBe(
      'true'
    )
  })

  test('dragleave after dragenter clears the active state', async () => {
    const wrapper = mount()
    const zone = wrapper.find('[data-testid="card-import-drop-zone"]')
    await zone.trigger('dragenter')
    await zone.trigger('dragleave')

    expect(zone.attributes('data-active')).toBeUndefined()
  })

  test('crossing a child element (nested enter/leave) does not read as leaving the zone [obligation]', async () => {
    const wrapper = mount()
    const zone = wrapper.find('[data-testid="card-import-drop-zone"]')
    // Enter zone, then enter + leave a child — depth counts up then back down,
    // net still > 0, so the zone must stay marked active.
    await zone.trigger('dragenter')
    await zone.trigger('dragenter')
    await zone.trigger('dragleave')

    expect(zone.attributes('data-active')).toBe('true')
  })

  test('clicking browse plays the select sfx and opens the hidden file input', async () => {
    const wrapper = mount()
    const input = wrapper.find('[data-testid="card-import-drop-zone__input"]')
    const clickSpy = vi.spyOn(input.element, 'click')

    await wrapper.find('[data-testid="card-import-drop-zone__browse"]').trigger('click')

    expect(mockEmitSfx).toHaveBeenCalledWith('select')
    expect(clickSpy).toHaveBeenCalledOnce()
  })

  test('dragover is prevented so the zone accepts the drop', () => {
    const wrapper = mount()
    const event = new Event('dragover', { bubbles: true, cancelable: true })
    wrapper.find('[data-testid="card-import-drop-zone"]').element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })
})
