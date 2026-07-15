import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { defineComponent, h } from 'vue'
import FeedbackSubmitDialog from '@/components/feedback/feedback-submit-dialog.vue'
import { useNoticeStore } from '@/stores/notice-store'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mutateAsyncMock, emitSfxMock } = vi.hoisted(() => ({
  mutateAsyncMock: vi.fn().mockResolvedValue({ id: 1 }),
  emitSfxMock: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: emitSfxMock
}))

vi.mock('@/api/feedback', () => ({
  useSubmitFeedbackMutation: () => ({ mutateAsync: mutateAsyncMock, isLoading: { value: false } })
}))

// ── Component stubs (render functions only — no runtime compiler) ──────────────

const DialogCardStub = defineComponent({
  name: 'DialogCard',
  props: ['title'],
  emits: ['close'],
  setup(props, { slots, emit }) {
    return () =>
      h('div', { 'data-testid': 'feedback-submit-dialog' }, [
        h('span', { class: 'feedback-submit-dialog__title' }, props.title),
        h('button', {
          'data-testid': 'feedback-submit-dialog__dialog-close',
          onClick: () => emit('close')
        }),
        slots.default?.({ viewport: 'desktop' })
      ])
  }
})

const UiInputStub = defineComponent({
  name: 'UiInput',
  props: ['value', 'placeholder', 'maxLength', 'size'],
  emits: ['update:value'],
  inheritAttrs: false,
  setup(props, { emit, attrs }) {
    return () =>
      h('input', {
        ...attrs,
        'data-testid': 'feedback-submit-dialog__title',
        value: props.value,
        onInput: (e) => emit('update:value', e.target.value)
      })
  }
})

const UiTextareaStub = defineComponent({
  name: 'UiTextarea',
  props: ['value', 'placeholder', 'max_chars', 'rows', 'size'],
  emits: ['update:value'],
  inheritAttrs: false,
  setup(props, { emit, attrs }) {
    return () =>
      h('textarea', {
        ...attrs,
        'data-testid': 'feedback-submit-dialog__body-input',
        value: props.value,
        onInput: (e) => emit('update:value', e.target.value)
      })
  }
})

const UiButtonStub = defineComponent({
  name: 'UiButton',
  props: ['disabled', 'loading', 'iconLeft'],
  emits: ['press'],
  inheritAttrs: false,
  setup(props, { slots, emit, attrs }) {
    return () =>
      h(
        'button',
        {
          ...attrs,
          'data-testid': 'feedback-submit-dialog__submit',
          disabled: props.disabled,
          'data-loading': String(!!props.loading),
          onClick: () => emit('press')
        },
        slots.default?.()
      )
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountDialog(close = vi.fn()) {
  const wrapper = mount(FeedbackSubmitDialog, {
    props: { close },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: false })],
      stubs: {
        DialogCard: DialogCardStub,
        UiInput: UiInputStub,
        UiTextarea: UiTextareaStub,
        UiButton: UiButtonStub
      }
    }
  })
  return { wrapper, close }
}

async function fillTitle(wrapper, value) {
  await wrapper.find('[data-testid="feedback-submit-dialog__title"]').setValue(value)
}

async function fillBody(wrapper, value) {
  await wrapper.find('[data-testid="feedback-submit-dialog__body-input"]').setValue(value)
}

beforeEach(() => {
  mutateAsyncMock.mockReset().mockResolvedValue({ id: 1 })
  emitSfxMock.mockReset()
})

// ── can_submit / submit button state ────────────────────────────────────────

describe('FeedbackSubmitDialog — submit button state', () => {
  test('is disabled when title is empty', () => {
    const { wrapper } = mountDialog()
    expect(
      wrapper.find('[data-testid="feedback-submit-dialog__submit"]').attributes('disabled')
    ).toBeDefined()
  })

  test('is disabled when title is whitespace-only', async () => {
    const { wrapper } = mountDialog()
    await fillTitle(wrapper, '   ')
    expect(
      wrapper.find('[data-testid="feedback-submit-dialog__submit"]').attributes('disabled')
    ).toBeDefined()
  })

  test('is enabled when title is non-empty', async () => {
    const { wrapper } = mountDialog()
    await fillTitle(wrapper, 'Add dark mode')
    expect(
      wrapper.find('[data-testid="feedback-submit-dialog__submit"]').attributes('disabled')
    ).toBeUndefined()
  })
})

// ── Submit payload ───────────────────────────────────────────────────────────

describe('FeedbackSubmitDialog — submit payload [obligation]', () => {
  test('always submits type: "other", regardless of input, since users do not categorize their own feedback', async () => {
    const { wrapper } = mountDialog()
    await fillTitle(wrapper, 'Add dark mode')
    await wrapper.find('[data-testid="feedback-submit-dialog__submit"]').trigger('click')
    expect(mutateAsyncMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'other' }))
  })

  test('submits body: undefined when body is empty', async () => {
    const { wrapper } = mountDialog()
    await fillTitle(wrapper, 'Add dark mode')
    await wrapper.find('[data-testid="feedback-submit-dialog__submit"]').trigger('click')
    expect(mutateAsyncMock).toHaveBeenCalledWith(expect.objectContaining({ body: undefined }))
  })

  test('submits body: undefined when body is whitespace-only', async () => {
    const { wrapper } = mountDialog()
    await fillTitle(wrapper, 'Add dark mode')
    await fillBody(wrapper, '   ')
    await wrapper.find('[data-testid="feedback-submit-dialog__submit"]').trigger('click')
    expect(mutateAsyncMock).toHaveBeenCalledWith(expect.objectContaining({ body: undefined }))
  })

  test('submits trimmed title and body when both are filled in', async () => {
    const { wrapper } = mountDialog()
    await fillTitle(wrapper, '  Add dark mode  ')
    await fillBody(wrapper, '  Would love this  ')
    await wrapper.find('[data-testid="feedback-submit-dialog__submit"]').trigger('click')
    expect(mutateAsyncMock).toHaveBeenCalledWith({
      title: 'Add dark mode',
      body: 'Would love this',
      type: 'other'
    })
  })
})

// ── Success / failure wiring ─────────────────────────────────────────────────

describe('FeedbackSubmitDialog — success wiring [obligation]', () => {
  test('calls close(true) after a successful submit', async () => {
    const { wrapper, close } = mountDialog()
    await fillTitle(wrapper, 'Add dark mode')
    await wrapper.find('[data-testid="feedback-submit-dialog__submit"]').trigger('click')
    expect(close).toHaveBeenCalledWith(true)
  })

  test('shows the feedback-submitted success toast', async () => {
    const { wrapper } = mountDialog()
    await fillTitle(wrapper, 'Add dark mode')
    await wrapper.find('[data-testid="feedback-submit-dialog__submit"]').trigger('click')

    const notice = useNoticeStore()
    expect(notice.notices).toHaveLength(1)
    expect(notice.notices[0].state).toBe('success')
  })
})

describe('FeedbackSubmitDialog — failure wiring [obligation]', () => {
  test('shows the feedback-submit-failed error toast when the mutation rejects', async () => {
    mutateAsyncMock.mockRejectedValue(new Error('network down'))
    const { wrapper } = mountDialog()
    await fillTitle(wrapper, 'Add dark mode')
    await wrapper.find('[data-testid="feedback-submit-dialog__submit"]').trigger('click')

    const notice = useNoticeStore()
    expect(notice.notices).toHaveLength(1)
    expect(notice.notices[0].state).toBe('error')
  })

  test('does not call close when the mutation rejects, so the draft is not lost', async () => {
    mutateAsyncMock.mockRejectedValue(new Error('network down'))
    const { wrapper, close } = mountDialog()
    await fillTitle(wrapper, 'Add dark mode')
    await wrapper.find('[data-testid="feedback-submit-dialog__submit"]').trigger('click')

    expect(close).not.toHaveBeenCalled()
  })
})

// ── Close wiring ──────────────────────────────────────────────────────────────

describe('FeedbackSubmitDialog — close wiring', () => {
  test('dialog-card close calls close with false', async () => {
    const { wrapper, close } = mountDialog()
    await wrapper.find('[data-testid="feedback-submit-dialog__dialog-close"]').trigger('click')
    expect(close).toHaveBeenCalledWith(false)
  })

  test('dialog-card close emits pop_up_close', async () => {
    const { wrapper } = mountDialog()
    await wrapper.find('[data-testid="feedback-submit-dialog__dialog-close"]').trigger('click')
    expect(emitSfxMock).toHaveBeenCalledWith('pop_up_close')
  })
})
