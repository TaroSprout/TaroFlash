import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockMutateAsync } = vi.hoisted(() => ({
  mockMutateAsync: vi.fn()
}))

vi.mock('@/api/lessons', () => ({
  useCreateLessonCollectionMutation: () => ({
    mutateAsync: mockMutateAsync,
    isLoading: { value: false }
  })
}))

const UiInputStub = defineComponent({
  name: 'UiInput',
  inheritAttrs: false,
  props: ['value'],
  emits: ['update:value', 'keyup'],
  setup(props, { attrs, emit }) {
    return () =>
      h('input', {
        'data-testid': attrs['data-testid'],
        value: props.value,
        onInput: (e) => emit('update:value', e.target.value),
        onKeyup: (e) => e.key === 'Enter' && emit('keyup', e)
      })
  }
})

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: { disabled: Boolean },
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

import CollectionCreate from '@/views/audio-reader/collection-create-modal.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountModal(close = vi.fn()) {
  return {
    close,
    wrapper: shallowMount(CollectionCreate, {
      props: { close },
      global: {
        stubs: { UiInput: UiInputStub, UiButton: UiButtonStub, AppWindow: false }
      }
    })
  }
}

function actionButtons(wrapper) {
  return wrapper
    .find('[data-testid="collection-create__actions"]')
    .findAllComponents({ name: 'UiButton' })
}

beforeEach(() => {
  mockMutateAsync.mockReset()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CollectionCreate (index.vue)', () => {
  test('renders the title input and actions', () => {
    const { wrapper } = mountModal()
    expect(wrapper.find('[data-testid="collection-create__title"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="collection-create__actions"]').exists()).toBe(true)
  })

  test('submit button is disabled while the title is empty', () => {
    const { wrapper } = mountModal()
    const submit = actionButtons(wrapper)[1]
    expect(submit.props('disabled')).toBe(true)
  })

  test('submit button enables once a non-empty title is entered', async () => {
    const { wrapper } = mountModal()
    await wrapper.find('[data-testid="collection-create__title"]').setValue('My Collection')

    expect(actionButtons(wrapper)[1].props('disabled')).toBe(false)
  })

  test('cancel button calls close(undefined)', async () => {
    const { wrapper, close } = mountModal()
    await actionButtons(wrapper)[0].vm.$emit('press')
    expect(close).toHaveBeenCalledWith(undefined)
  })

  test('submitting calls the mutation with the trimmed title and closes with the result', async () => {
    const collection = { id: 1, title: 'My Collection' }
    mockMutateAsync.mockResolvedValue(collection)
    const { wrapper, close } = mountModal()

    await wrapper.find('[data-testid="collection-create__title"]').setValue('  My Collection  ')
    await actionButtons(wrapper)[1].vm.$emit('press')
    await flushPromises()

    expect(mockMutateAsync).toHaveBeenCalledWith('My Collection')
    expect(close).toHaveBeenCalledWith(collection)
  })

  test('submitting with an empty/whitespace-only title does not call the mutation', async () => {
    const { wrapper } = mountModal()
    await wrapper.find('[data-testid="collection-create__title"]').setValue('   ')

    await actionButtons(wrapper)[1].vm.$emit('press')

    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  test('shows an error message when the mutation rejects', async () => {
    mockMutateAsync.mockRejectedValue(new Error('boom'))
    const { wrapper } = mountModal()

    await wrapper.find('[data-testid="collection-create__title"]').setValue('My Collection')
    await actionButtons(wrapper)[1].vm.$emit('press')
    await flushPromises()

    expect(wrapper.find('[data-testid="collection-create__error"]').exists()).toBe(true)
  })

  test('pressing enter in the title input submits', async () => {
    const collection = { id: 1, title: 'My Collection' }
    mockMutateAsync.mockResolvedValue(collection)
    const { wrapper } = mountModal()

    const input = wrapper.find('[data-testid="collection-create__title"]')
    await input.setValue('My Collection')
    await input.trigger('keyup', { key: 'Enter' })
    await flushPromises()

    expect(mockMutateAsync).toHaveBeenCalledWith('My Collection')
  })
})
