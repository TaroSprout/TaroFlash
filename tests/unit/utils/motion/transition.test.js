import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { motionTransition } from '@/utils/motion/transition'

function makeHandle() {
  let resolve
  const done = new Promise((r) => {
    resolve = r
  })
  return { done, resolve, cancel: vi.fn(), finish: vi.fn(), mark: vi.fn() }
}

let enter_handles
let leave_handles
let enter
let leave

beforeEach(() => {
  enter_handles = []
  leave_handles = []
  enter = vi.fn(() => {
    const handle = makeHandle()
    enter_handles.push(handle)
    return handle
  })
  leave = vi.fn(() => {
    const handle = makeHandle()
    leave_handles.push(handle)
    return handle
  })
})

describe('motionTransition', () => {
  test('onEnter invokes the enter motion on the element and calls done once it settles', async () => {
    const { onEnter } = motionTransition(enter, leave)
    const el = document.createElement('div')
    const done = vi.fn()

    onEnter(el, done)

    expect(enter).toHaveBeenCalledWith(el)
    expect(done).not.toHaveBeenCalled()

    enter_handles[0].resolve()
    await enter_handles[0].done

    expect(done).toHaveBeenCalledOnce()
  })

  test('onLeave invokes the leave motion on the element and calls done once it settles', async () => {
    const { onLeave } = motionTransition(enter, leave)
    const el = document.createElement('div')
    const done = vi.fn()

    onLeave(el, done)

    expect(leave).toHaveBeenCalledWith(el)

    leave_handles[0].resolve()
    await leave_handles[0].done

    expect(done).toHaveBeenCalledOnce()
  })

  test('re-invoking a motion on the same element kills the in-flight one instead of stacking', () => {
    const { onEnter } = motionTransition(enter, leave)
    const el = document.createElement('div')

    onEnter(el, vi.fn())
    onEnter(el, vi.fn())

    expect(enter).toHaveBeenCalledTimes(2)
    expect(enter_handles[0].cancel).toHaveBeenCalledOnce()
    expect(enter_handles[1].cancel).not.toHaveBeenCalled()
  })

  test('an enter followed by a leave on the same element cancels the enter in flight', () => {
    const { onEnter, onLeave } = motionTransition(enter, leave)
    const el = document.createElement('div')

    onEnter(el, vi.fn())
    onLeave(el, vi.fn())

    expect(enter_handles[0].cancel).toHaveBeenCalledOnce()
  })

  test('a fresh element is unaffected by another element already in flight', () => {
    const { onEnter } = motionTransition(enter, leave)
    const first = document.createElement('div')
    const second = document.createElement('div')

    onEnter(first, vi.fn())
    onEnter(second, vi.fn())

    expect(enter_handles[0].cancel).not.toHaveBeenCalled()
  })
})
