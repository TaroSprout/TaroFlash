import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockMutateAsync, FakeEdgeFunctionError } = vi.hoisted(() => {
  class FakeEdgeFunctionError extends Error {
    constructor(code) {
      super(code)
      this.code = code
      this.name = 'EdgeFunctionError'
    }
  }
  return { mockMutateAsync: vi.fn(), FakeEdgeFunctionError }
})

vi.mock('@/api/lessons', () => ({
  useStartLessonMutation: () => ({ mutateAsync: mockMutateAsync }),
  EdgeFunctionError: FakeEdgeFunctionError
}))

const UiInputStub = defineComponent({
  name: 'UiInput',
  inheritAttrs: false,
  props: ['value'],
  emits: ['update:value'],
  setup(props, { attrs, emit }) {
    return () =>
      h('input', {
        'data-testid': attrs['data-testid'],
        value: props.value,
        onInput: (e) => emit('update:value', e.target.value)
      })
  }
})

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: { disabled: Boolean, loading: Boolean },
  emits: ['press'],
  setup(props, { slots, attrs, emit }) {
    return () =>
      h(
        'button',
        { ...attrs, disabled: props.disabled, onClick: () => emit('press') },
        slots.default?.()
      )
  }
})

const ScriptSelectStub = defineComponent({
  name: 'ScriptSelect',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup() {
    return () => h('div', { 'data-testid': 'script-select-stub' })
  }
})

import UploadLesson from '@/views/audio-reader/upload-lesson-modal/index.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountModal(close = vi.fn()) {
  return {
    close,
    wrapper: shallowMount(UploadLesson, {
      props: { collection_id: 1, close },
      global: {
        stubs: {
          UiInput: UiInputStub,
          UiButton: UiButtonStub,
          ScriptSelect: ScriptSelectStub,
          MobileSheet: false
        }
      }
    })
  }
}

function actionButtons(wrapper) {
  return wrapper
    .find('[data-testid="upload-lesson__actions"]')
    .findAllComponents({ name: 'UiButton' })
}

function pickFile(wrapper, file) {
  const input = wrapper.find('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  return input.trigger('change')
}

beforeEach(() => {
  mockMutateAsync.mockReset()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('UploadLesson (index.vue)', () => {
  test('renders the title input, file picker, and script select', () => {
    const { wrapper } = mountModal()
    expect(wrapper.find('[data-testid="upload-lesson__title"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="upload-lesson__file"]').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'ScriptSelect' }).exists()).toBe(true)
  })

  test('submit button is disabled while no title/file is set', () => {
    const { wrapper } = mountModal()
    expect(actionButtons(wrapper)[1].props('disabled')).toBe(true)
  })

  test('picking a file below the size cap sets the file name and defaults the title', async () => {
    const { wrapper } = mountModal()
    const file = new File(['audio'], 'my-lesson.mp3', { type: 'audio/mpeg' })
    await pickFile(wrapper, file)

    expect(wrapper.find('[data-testid="upload-lesson__file-name"]').text()).toBe('my-lesson.mp3')
    expect(wrapper.find('[data-testid="upload-lesson__title"]').element.value).toBe('my-lesson')
  })

  test('picking a file does not overwrite an already-typed title', async () => {
    const { wrapper } = mountModal()
    await wrapper.find('[data-testid="upload-lesson__title"]').setValue('Custom Title')

    const file = new File(['audio'], 'my-lesson.mp3', { type: 'audio/mpeg' })
    await pickFile(wrapper, file)

    expect(wrapper.find('[data-testid="upload-lesson__title"]').element.value).toBe('Custom Title')
  })

  test('picking a file over MAX_BYTES rejects it and shows the too-large error', async () => {
    const { wrapper } = mountModal()
    const big_file = new File(['audio'], 'huge.mp3', { type: 'audio/mpeg' })
    Object.defineProperty(big_file, 'size', { value: 629145601 })
    await pickFile(wrapper, big_file)

    expect(wrapper.find('[data-testid="upload-lesson__error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="upload-lesson__file-name"]').text()).not.toBe('huge.mp3')
  })

  test('submit button enables once both title and file are set', async () => {
    const { wrapper } = mountModal()
    await wrapper.find('[data-testid="upload-lesson__title"]').setValue('My Lesson')
    await pickFile(wrapper, new File(['audio'], 'a.mp3', { type: 'audio/mpeg' }))

    expect(actionButtons(wrapper)[1].props('disabled')).toBe(false)
  })

  test('cancel button calls close(undefined)', async () => {
    const { wrapper, close } = mountModal()
    await actionButtons(wrapper)[0].vm.$emit('press')
    expect(close).toHaveBeenCalledWith(undefined)
  })

  test('submitting calls the mutation with the trimmed title, file, and script, and closes with the lesson', async () => {
    const lesson = { id: 1, title: 'My Lesson' }
    mockMutateAsync.mockResolvedValue(lesson)
    const { wrapper, close } = mountModal()

    const file = new File(['audio'], 'a.mp3', { type: 'audio/mpeg' })
    await wrapper.find('[data-testid="upload-lesson__title"]').setValue('  My Lesson  ')
    await pickFile(wrapper, file)
    await actionButtons(wrapper)[1].vm.$emit('press')
    await flushPromises()

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ collection_id: 1, title: 'My Lesson', file })
    )
    expect(close).toHaveBeenCalledWith(lesson)
  })

  test('shows the progress bar while submitting', async () => {
    let resolveMutation
    mockMutateAsync.mockReturnValue(
      new Promise((resolve) => {
        resolveMutation = resolve
      })
    )
    const { wrapper } = mountModal()

    await wrapper.find('[data-testid="upload-lesson__title"]').setValue('My Lesson')
    await pickFile(wrapper, new File(['audio'], 'a.mp3', { type: 'audio/mpeg' }))
    await actionButtons(wrapper)[1].vm.$emit('press')
    await flushPromises()

    expect(wrapper.find('[data-testid="upload-lesson__progress"]').exists()).toBe(true)

    resolveMutation({ id: 1 })
    await flushPromises()
    expect(wrapper.find('[data-testid="upload-lesson__progress"]').exists()).toBe(false)
  })

  test('maps EdgeFunctionError file_too_large to the too-large error key', async () => {
    mockMutateAsync.mockRejectedValue(new FakeEdgeFunctionError('file_too_large'))
    const { wrapper } = mountModal()

    await wrapper.find('[data-testid="upload-lesson__title"]').setValue('My Lesson')
    await pickFile(wrapper, new File(['audio'], 'a.mp3', { type: 'audio/mpeg' }))
    await actionButtons(wrapper)[1].vm.$emit('press')
    await flushPromises()

    expect(wrapper.find('[data-testid="upload-lesson__error"]').exists()).toBe(true)
  })

  test('maps a generic/unknown submit failure to the generic error key without throwing', async () => {
    mockMutateAsync.mockRejectedValue(new Error('network down'))
    const { wrapper } = mountModal()

    await wrapper.find('[data-testid="upload-lesson__title"]').setValue('My Lesson')
    await pickFile(wrapper, new File(['audio'], 'a.mp3', { type: 'audio/mpeg' }))
    await actionButtons(wrapper)[1].vm.$emit('press')
    await flushPromises()

    expect(wrapper.find('[data-testid="upload-lesson__error"]').exists()).toBe(true)
  })

  test('maps EdgeFunctionError invalid_audio to the invalid-audio error key', async () => {
    mockMutateAsync.mockRejectedValue(new FakeEdgeFunctionError('invalid_audio'))
    const { wrapper } = mountModal()

    await wrapper.find('[data-testid="upload-lesson__title"]').setValue('My Lesson')
    await pickFile(wrapper, new File(['audio'], 'a.mp3', { type: 'audio/mpeg' }))
    await actionButtons(wrapper)[1].vm.$emit('press')
    await flushPromises()

    expect(wrapper.find('[data-testid="upload-lesson__error"]').exists()).toBe(true)
  })

  test('mobile-sheet close event calls close(undefined)', async () => {
    const { wrapper, close } = mountModal()
    await wrapper.findComponent({ name: 'MobileSheet' }).vm.$emit('close')
    expect(close).toHaveBeenCalledWith(undefined)
  })

  test('script-select v-model updates the script sent to the mutation', async () => {
    const lesson = { id: 1 }
    mockMutateAsync.mockResolvedValue(lesson)
    const { wrapper } = mountModal()

    await wrapper.find('[data-testid="upload-lesson__title"]').setValue('My Lesson')
    await pickFile(wrapper, new File(['audio'], 'a.mp3', { type: 'audio/mpeg' }))
    await wrapper.findComponent({ name: 'ScriptSelect' }).vm.$emit('update:modelValue', 'romaji')
    await actionButtons(wrapper)[1].vm.$emit('press')
    await flushPromises()

    expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ script: 'romaji' }))
  })

  test('progress bar reflects transcoding/slicing/uploading stages via onProgress', async () => {
    let resolveMutation
    let onProgress
    mockMutateAsync.mockImplementation(
      (args) =>
        new Promise((resolve) => {
          onProgress = args.onProgress
          resolveMutation = () => resolve({ id: 1 })
        })
    )
    const { wrapper } = mountModal()

    await wrapper.find('[data-testid="upload-lesson__title"]').setValue('My Lesson')
    await pickFile(wrapper, new File(['audio'], 'a.mp3', { type: 'audio/mpeg' }))
    await actionButtons(wrapper)[1].vm.$emit('press')

    const progressBar = () => wrapper.findComponent({ name: 'UiProgressBar' })

    onProgress({ stage: 'transcoding', ratio: 0.5 })
    await nextTick()
    expect(progressBar().props('value')).toBe(5 + 0.5 * 55)

    onProgress({ stage: 'slicing', ratio: 0.5 })
    await nextTick()
    expect(progressBar().props('value')).toBe(60 + 0.5 * 15)

    onProgress({ stage: 'uploading', ratio: 0.5 })
    await nextTick()
    expect(progressBar().props('value')).toBe(75 + 0.5 * 25)

    resolveMutation()
    await flushPromises()
  })
})
