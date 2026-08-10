import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { ref } from 'vue'

const { coarseRef, narrowRef } = vi.hoisted(() => ({
  coarseRef: { value: false },
  narrowRef: { value: false }
}))

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: (query) => (query === 'coarse' ? coarseRef : narrowRef)
}))

import SourcePanel from '@/views/deck/card-import/source-panel.vue'
import { cardImportKey } from '@/views/deck/composables/card-import'

function makeDraft(overrides = {}) {
  return {
    source: ref('file'),
    file_name: ref(null),
    pasted_text: ref(''),
    refusal_message: ref(null),
    skipped: ref([]),
    setSource: vi.fn(),
    loadFile: vi.fn(),
    loadText: vi.fn(),
    dismissRefusal: vi.fn(),
    clear: vi.fn(),
    openSkippedLines: vi.fn(),
    ...overrides
  }
}

function mount(draft = makeDraft()) {
  return shallowMount(SourcePanel, {
    global: { provide: { [cardImportKey]: draft }, renderStubDefaultSlot: true }
  })
}

function findButton(wrapper, testid) {
  return wrapper
    .findAllComponents({ name: 'UiButton' })
    .find((c) => c.attributes('data-testid') === testid)
}

describe('card-import/source-panel', () => {
  beforeEach(() => {
    coarseRef.value = false
    narrowRef.value = false
  })

  // ── text-option disabled: coarse AND narrow only [obligation] ─────────────

  describe('text option disabled state [obligation]', () => {
    test('enabled when the pointer is fine, even on a narrow viewport [obligation]', () => {
      coarseRef.value = false
      narrowRef.value = true
      const wrapper = mount(makeDraft())
      const options = wrapper.findComponent({ name: 'UiOptionGroup' }).props('options')
      expect(options.find((o) => o.value === 'text').disabled).toBe(false)
    })

    test('enabled when the viewport is wide, even with a coarse pointer [obligation]', () => {
      coarseRef.value = true
      narrowRef.value = false
      const wrapper = mount(makeDraft())
      const options = wrapper.findComponent({ name: 'UiOptionGroup' }).props('options')
      expect(options.find((o) => o.value === 'text').disabled).toBe(false)
    })

    test('disabled only when the pointer is coarse AND the viewport is narrow [obligation]', () => {
      coarseRef.value = true
      narrowRef.value = true
      const wrapper = mount(makeDraft())
      const options = wrapper.findComponent({ name: 'UiOptionGroup' }).props('options')
      expect(options.find((o) => o.value === 'text').disabled).toBe(true)
    })
  })

  test('shows the drop-zone when source is file and no file is loaded', () => {
    const wrapper = mount(makeDraft({ source: ref('file'), file_name: ref(null) }))
    expect(wrapper.findComponent({ name: 'DropZone' }).exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-import-source__file-chip"]').exists()).toBe(false)
  })

  test('shows the file chip instead of the drop-zone once a file is loaded', () => {
    const wrapper = mount(makeDraft({ source: ref('file'), file_name: ref('cards.csv') }))
    expect(wrapper.find('[data-testid="card-import-source__file-chip"]').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'DropZone' }).exists()).toBe(false)
    expect(wrapper.find('[data-testid="card-import-source__file-chip"]').text()).toContain(
      'cards.csv'
    )
  })

  test('shows the paste textarea when source is text', () => {
    const wrapper = mount(makeDraft({ source: ref('text') }))
    expect(wrapper.find('[data-testid="card-import-source__text"]').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'DropZone' }).exists()).toBe(false)
  })

  test('clicking clear-file calls draft.clear', async () => {
    const draft = makeDraft({ source: ref('file'), file_name: ref('cards.csv') })
    const wrapper = mount(draft)
    await findButton(wrapper, 'card-import-source__clear-file').vm.$emit('press')
    expect(draft.clear).toHaveBeenCalledOnce()
  })

  test('drop-zone file event calls draft.loadFile', async () => {
    const draft = makeDraft({ source: ref('file'), file_name: ref(null) })
    const wrapper = mount(draft)
    const file = new File(['a,b'], 'cards.csv', { type: 'text/csv' })
    await wrapper.findComponent({ name: 'DropZone' }).vm.$emit('file', file)
    expect(draft.loadFile).toHaveBeenCalledWith(file)
  })

  test('drop-zone dismiss-error event calls draft.dismissRefusal', async () => {
    const draft = makeDraft({ source: ref('file'), file_name: ref(null) })
    const wrapper = mount(draft)
    await wrapper.findComponent({ name: 'DropZone' }).vm.$emit('dismiss-error')
    expect(draft.dismissRefusal).toHaveBeenCalledOnce()
  })

  test('the source choice group calls draft.setSource on update', async () => {
    const draft = makeDraft()
    const wrapper = mount(draft)
    await wrapper.findComponent({ name: 'UiOptionGroup' }).vm.$emit('update:value', 'text')
    expect(draft.setSource).toHaveBeenCalledWith('text')
  })

  test('typing in the textarea calls draft.loadText with the new value', async () => {
    const draft = makeDraft({ source: ref('text') })
    const wrapper = mount(draft)
    await wrapper.findComponent({ name: 'UiTextarea' }).vm.$emit('update:value', 'front,back')
    expect(draft.loadText).toHaveBeenCalledWith('front,back')
  })

  test('does not show the skipped-lines button when nothing was skipped', () => {
    const wrapper = mount(makeDraft({ skipped: ref([]) }))
    expect(wrapper.find('[data-testid="card-import-source__skipped-notice"]').exists()).toBe(false)
  })

  test('shows the skipped-lines button when lines were skipped, and clicking opens them [obligation]', async () => {
    const draft = makeDraft({ skipped: ref([{ line: 1, text: 'bad' }]) })
    const wrapper = mount(draft)
    const button = findButton(wrapper, 'card-import-source__skipped-notice')
    expect(button.exists()).toBe(true)
    await button.vm.$emit('press')
    expect(draft.openSkippedLines).toHaveBeenCalledOnce()
  })
})
