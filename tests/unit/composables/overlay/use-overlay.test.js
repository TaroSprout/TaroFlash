import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { setActivePinia, createPinia } from 'pinia'
import { defineComponent } from 'vue'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

import { useOverlay } from '@/composables/overlay/use-overlay'
import { useOverlayStore } from '@/stores/overlay-stack'

const StubComponent = defineComponent({ setup: () => () => null })

describe('useOverlay', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockEmitSfx.mockClear()
  })

  // ── open() pushes onto the stack ──────────────────────────────

  test('open pushes an entry onto the overlay store with the given presentation and props', () => {
    const { open } = useOverlay()
    const store = useOverlayStore()

    open(StubComponent, { props: { foo: 'bar' }, presentation: 'popup' })

    expect(store.entries).toHaveLength(1)
    expect(store.entries[0].props).toEqual({ foo: 'bar' })
    expect(store.entries[0].presentation).toBe('popup')
  })

  test('open defaults presentation to dialog and props to an empty object', () => {
    const { open } = useOverlay()
    const store = useOverlayStore()

    open(StubComponent)

    expect(store.entries[0].presentation).toBe('dialog')
    expect(store.entries[0].props).toEqual({})
  })

  // ── result resolves on close(outcome) ─────────────────────────

  test('result resolves with the outcome passed to close()', async () => {
    const { open } = useOverlay()
    const { result, close } = open(StubComponent)

    close('the-outcome')

    await expect(result).resolves.toBe('the-outcome')
  })

  test('close() removes the entry from the stack', () => {
    const { open } = useOverlay()
    const store = useOverlayStore()
    const { close } = open(StubComponent)

    close(undefined)

    expect(store.entries).toHaveLength(0)
  })

  // ── result also resolves on stack teardown, not just close() ──

  test('result resolves when the stack entry settles via the store directly (e.g. requestClose)', async () => {
    const { open } = useOverlay()
    const store = useOverlayStore()
    const { result } = open(StubComponent)
    const entry = store.entries[0]

    store.remove(entry.id, 'dismissed-via-veto-pipeline')

    await expect(result).resolves.toBe('dismissed-via-veto-pipeline')
  })

  test('result resolves with undefined when the stack is torn down via closeAll', async () => {
    const { open, closeAll } = useOverlay()
    const { result } = open(StubComponent)

    closeAll()

    await expect(result).resolves.toBeUndefined()
  })

  // ── open_sfx / close_sfx timing ────────────────────────────────

  test('open_sfx fires immediately on open', () => {
    const { open } = useOverlay()
    open(StubComponent, { open_sfx: 'dialog.open' })

    expect(mockEmitSfx).toHaveBeenCalledWith('dialog.open')
    expect(mockEmitSfx).toHaveBeenCalledTimes(1)
  })

  test('close_sfx does not fire until result settles', async () => {
    const { open } = useOverlay()
    const { result, close } = open(StubComponent, { close_sfx: 'dialog.close' })

    expect(mockEmitSfx).not.toHaveBeenCalled()

    close(undefined)
    await result

    expect(mockEmitSfx).toHaveBeenCalledWith('dialog.close')
  })

  test('close_sfx fires when the entry is settled via closeAll, not just close()', async () => {
    const { open, closeAll } = useOverlay()
    const { result } = open(StubComponent, { close_sfx: 'dialog.close' })

    closeAll()
    await result

    expect(mockEmitSfx).toHaveBeenCalledWith('dialog.close')
  })

  test('neither open_sfx nor close_sfx fires when omitted', async () => {
    const { open } = useOverlay()
    const { result, close } = open(StubComponent)

    close(undefined)
    await result

    expect(mockEmitSfx).not.toHaveBeenCalled()
  })

  // ── closeAll ────────────────────────────────────────────────────

  test('closeAll empties the store', () => {
    const { open, closeAll } = useOverlay()
    const store = useOverlayStore()
    open(StubComponent)
    open(StubComponent)

    closeAll()

    expect(store.entries).toHaveLength(0)
  })

  // ── multiple opens are independent ─────────────────────────────

  test('two opens resolve their own result independently', async () => {
    const { open } = useOverlay()
    const first = open(StubComponent)
    const second = open(StubComponent)

    second.close('second-outcome')
    first.close('first-outcome')

    await expect(first.result).resolves.toBe('first-outcome')
    await expect(second.result).resolves.toBe('second-outcome')
  })
})
