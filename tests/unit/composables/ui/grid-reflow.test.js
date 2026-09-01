import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp, nextTick, ref } from 'vue'
import { GRID_REFLOW_DURATION, useGridReflow } from '@/composables/ui/grid-reflow'

let app

function withSetup(count) {
  let result
  app = createApp({
    setup() {
      result = useGridReflow(count)
      return () => {}
    }
  })
  app.mount(document.createElement('div'))
  return result
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  app?.unmount()
  app = undefined
  vi.useRealTimers()
})

describe('useGridReflow', () => {
  test('a grid that starts empty does not animate the change that fills it', async () => {
    const count = ref(0)
    const { reflowing } = withSetup(count)

    count.value = 3
    await nextTick()

    expect(reflowing.value).toBe(false)
  })

  test('after the list arrives, the next change animates normally', async () => {
    const count = ref(0)
    const { reflowing } = withSetup(count)

    count.value = 3
    await nextTick()
    expect(reflowing.value).toBe(false)

    count.value = 2
    await nextTick()

    expect(reflowing.value).toBe(true)
  })

  test('a grid that already holds items animates its very first change', async () => {
    const count = ref(5)
    const { reflowing } = withSetup(count)

    count.value = 4
    await nextTick()

    expect(reflowing.value).toBe(true)
  })

  test('closes the reflow window once GRID_REFLOW_DURATION elapses', async () => {
    const count = ref(5)
    const { reflowing } = withSetup(count)

    count.value = 4
    await nextTick()
    expect(reflowing.value).toBe(true)

    vi.advanceTimersByTime(GRID_REFLOW_DURATION)
    await nextTick()

    expect(reflowing.value).toBe(false)
  })

  test('a second change within the window restarts the timer instead of closing early', async () => {
    const count = ref(5)
    const { reflowing } = withSetup(count)

    count.value = 4
    await nextTick()

    vi.advanceTimersByTime(GRID_REFLOW_DURATION - 50)
    count.value = 3
    await nextTick()

    vi.advanceTimersByTime(60)
    await nextTick()
    expect(reflowing.value).toBe(true)

    vi.advanceTimersByTime(GRID_REFLOW_DURATION - 60)
    await nextTick()
    expect(reflowing.value).toBe(false)
  })

  test('clears the pending timeout on scope disposal', async () => {
    // The composable also calls clearTimeout on every change (to restart the
    // window), so "was called at all" proves nothing — pin the assertion to
    // the id of the timer still pending at unmount.
    const set_spy = vi.spyOn(window, 'setTimeout')
    const count = ref(5)
    withSetup(count)

    count.value = 4
    await nextTick()

    const pending_id = set_spy.mock.results.at(-1).value
    const clear_spy = vi.spyOn(window, 'clearTimeout')

    app.unmount()
    app = undefined

    expect(clear_spy).toHaveBeenCalledWith(pending_id)
  })
})
