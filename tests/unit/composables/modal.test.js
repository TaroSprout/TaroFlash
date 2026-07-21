import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import {
  useModal,
  closeAll,
  useModalRequestClose,
  useModalAfterEnter,
  resolveModalAfterEnter,
  request_close_handlers,
  MODAL_ID_KEY
} from '@/composables/modal'

// ── Helpers ───────────────────────────────────────────────────────────────────

// Module-level state persists across tests — reset both structures before each one.
beforeEach(() => {
  const { modal_stack, pop } = useModal()
  while (modal_stack.value.length > 0) pop()
  request_close_handlers.clear()
})

const FakeComponent = defineComponent({ template: '<div />' })

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useModal', () => {
  describe('open – context', () => {
    test('stores context on the entry when provided', () => {
      const { open, modal_stack } = useModal()
      const ctx = { key: 'my-key', value: { foo: 'bar' } }

      open(FakeComponent, { context: ctx })

      expect(modal_stack.value[0].context).toEqual(ctx)
    })

    test('context is undefined when not provided', () => {
      const { open, modal_stack } = useModal()

      open(FakeComponent)

      expect(modal_stack.value[0].context).toBeUndefined()
    })
  })

  describe('open', () => {
    test('pushes an entry onto modal_stack', () => {
      const { open, modal_stack } = useModal()

      open(FakeComponent)

      expect(modal_stack.value).toHaveLength(1)
    })

    test('defaults mode to dialog', () => {
      const { open, modal_stack } = useModal()

      open(FakeComponent)

      expect(modal_stack.value[0].mode).toBe('dialog')
    })

    test('stores the given mode on the entry', () => {
      const { open, modal_stack } = useModal()

      open(FakeComponent, { mode: 'mobile-sheet' })

      expect(modal_stack.value[0].mode).toBe('mobile-sheet')
    })

    test('stores popup mode', () => {
      const { open, modal_stack } = useModal()

      open(FakeComponent, { mode: 'popup' })

      expect(modal_stack.value[0].mode).toBe('popup')
    })

    test('defaults backdrop to false', () => {
      const { open, modal_stack } = useModal()

      open(FakeComponent)

      expect(modal_stack.value[0].backdrop).toBe(false)
    })

    test('stores the given backdrop option', () => {
      const { open, modal_stack } = useModal()

      open(FakeComponent, { backdrop: true })

      expect(modal_stack.value[0].backdrop).toBe(true)
    })

    test('injects a close function into componentProps', () => {
      const { open, modal_stack } = useModal()

      open(FakeComponent)

      expect(typeof modal_stack.value[0].componentProps.close).toBe('function')
    })

    test('merges extra props into componentProps', () => {
      const { open, modal_stack } = useModal()

      open(FakeComponent, { props: { deck: { id: 42 } } })

      expect(modal_stack.value[0].componentProps.deck).toEqual({ id: 42 })
    })

    test('returns a Promise as response', () => {
      const { open } = useModal()

      const { response } = open(FakeComponent)

      expect(response).toBeInstanceOf(Promise)
    })

    test('returns a close function', () => {
      const { open } = useModal()

      const { close } = open(FakeComponent)

      expect(typeof close).toBe('function')
    })

    test('stacks multiple entries in order', () => {
      const { open, modal_stack } = useModal()

      open(FakeComponent, { mode: 'dialog' })
      open(FakeComponent, { mode: 'popup' })

      expect(modal_stack.value).toHaveLength(2)
      expect(modal_stack.value[0].mode).toBe('dialog')
      expect(modal_stack.value[1].mode).toBe('popup')
    })
  })

  describe('close (via returned close fn)', () => {
    test('removes the entry from modal_stack', () => {
      const { open, modal_stack } = useModal()
      const { close } = open(FakeComponent)

      close()

      expect(modal_stack.value).toHaveLength(0)
    })

    test('only removes the matching entry when multiple are open', () => {
      const { open, modal_stack } = useModal()
      open(FakeComponent, { mode: 'dialog' })
      const { close } = open(FakeComponent, { mode: 'popup' })

      close()

      expect(modal_stack.value).toHaveLength(1)
      expect(modal_stack.value[0].mode).toBe('dialog')
    })

    test('resolves the response promise with the given value', async () => {
      const { open } = useModal()
      const { close, response } = open(FakeComponent)

      close('my-result')

      await expect(response).resolves.toBe('my-result')
    })

    test('resolves the response promise with undefined when called with no value', async () => {
      const { open } = useModal()
      const { close, response } = open(FakeComponent)

      close()

      await expect(response).resolves.toBeUndefined()
    })
  })

  describe('closeAll', () => {
    test('empties the modal_stack', () => {
      const { open, modal_stack } = useModal()
      open(FakeComponent)
      open(FakeComponent)

      closeAll()

      expect(modal_stack.value).toHaveLength(0)
    })

    test('resolves every pending response promise so awaiting callers do not hang', async () => {
      const { open } = useModal()
      const first = open(FakeComponent)
      const second = open(FakeComponent)

      closeAll()

      await expect(first.response).resolves.toBeUndefined()
      await expect(second.response).resolves.toBeUndefined()
    })

    test('is a no-op when the stack is already empty', () => {
      const { modal_stack } = useModal()

      expect(() => closeAll()).not.toThrow()
      expect(modal_stack.value).toHaveLength(0)
    })
  })

  describe('pop', () => {
    test('removes the top (last) entry', () => {
      const { open, pop, modal_stack } = useModal()
      open(FakeComponent, { mode: 'dialog' })
      open(FakeComponent, { mode: 'popup' })

      pop()

      expect(modal_stack.value).toHaveLength(1)
      expect(modal_stack.value[0].mode).toBe('dialog')
    })

    test('is a no-op when the stack is empty', () => {
      const { pop, modal_stack } = useModal()

      expect(() => pop()).not.toThrow()
      expect(modal_stack.value).toHaveLength(0)
    })
  })
})

// ── useModalRequestClose ──────────────────────────────────────────────────────

describe('useModalRequestClose', () => {
  function mountWithHandler(handler, id = 'test-modal-id') {
    return mount(
      defineComponent({
        setup() {
          useModalRequestClose(handler)
        },
        render: () => h('div')
      }),
      { global: { provide: { [MODAL_ID_KEY]: id } } }
    )
  }

  test('registers the handler under the injected modal id', () => {
    const handler = vi.fn()

    const wrapper = mountWithHandler(handler, 'my-modal')

    expect(request_close_handlers.get('my-modal')).toBe(handler)
    wrapper.unmount()
  })

  test('does nothing when MODAL_ID_KEY is not provided', () => {
    const handler = vi.fn()

    mount(
      defineComponent({
        setup() {
          useModalRequestClose(handler)
        },
        render: () => h('div')
      })
    )

    expect(request_close_handlers.size).toBe(0)
  })

  test('removes the handler from the map when the component unmounts', () => {
    const handler = vi.fn()
    const wrapper = mountWithHandler(handler, 'my-modal')

    wrapper.unmount()

    expect(request_close_handlers.has('my-modal')).toBe(false)
  })
})

// ── useModalAfterEnter / resolveModalAfterEnter ───────────────────────────────

describe('useModalAfterEnter', () => {
  function mountWithId(id) {
    let result
    const app = mount(
      defineComponent({
        setup() {
          result = useModalAfterEnter()
          return () => h('div')
        }
      }),
      { global: { provide: { [MODAL_ID_KEY]: id } } }
    )
    return { result, app }
  }

  test('returns an already-resolved promise when called outside a modal context (no injected id) [obligation]', async () => {
    // Mount without providing MODAL_ID_KEY
    let result
    mount(
      defineComponent({
        setup() {
          result = useModalAfterEnter()
          return () => h('div')
        }
      })
    )

    // The returned promise must resolve immediately without any external trigger
    let resolved = false
    result.then(() => {
      resolved = true
    })
    await Promise.resolve()
    expect(resolved).toBe(true)
  })

  test('returns a pending promise when called inside a modal context (id is injected) [obligation]', async () => {
    const { result } = mountWithId('modal-abc')

    let resolved = false
    result.then(() => {
      resolved = true
    })
    // Flush microtasks — should NOT have resolved yet
    await Promise.resolve()
    expect(resolved).toBe(false)
  })

  test('resolveModalAfterEnter resolves the promise registered for the matching id [obligation]', async () => {
    const { result } = mountWithId('modal-xyz')

    let resolved = false
    result.then(() => {
      resolved = true
    })

    resolveModalAfterEnter('modal-xyz')
    await Promise.resolve()
    expect(resolved).toBe(true)
  })

  test('resolveModalAfterEnter does not resolve promises for other ids', async () => {
    const { result } = mountWithId('modal-aaa')

    let resolved = false
    result.then(() => {
      resolved = true
    })

    resolveModalAfterEnter('modal-bbb')
    await Promise.resolve()
    expect(resolved).toBe(false)
  })

  test('resolveModalAfterEnter cleans up the entry after resolving so it does not linger', async () => {
    const { result } = mountWithId('modal-cleanup')

    resolveModalAfterEnter('modal-cleanup')
    await result

    // Calling again should be a no-op (no error and no lingering state)
    expect(() => resolveModalAfterEnter('modal-cleanup')).not.toThrow()
  })
})
