import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { FrameMonitor } from '@/utils/motion/frame-monitor'

let raf_callback

function tick(timestamp) {
  raf_callback(timestamp)
}

beforeEach(() => {
  raf_callback = null
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((cb) => {
      raf_callback = cb
      return 1
    })
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
})

describe('FrameMonitor', () => {
  test('snapshot before any tick reports no duration and no dropped frames', () => {
    const monitor = new FrameMonitor()
    monitor.start()

    expect(monitor.snapshot()).toEqual({ frameMs: 0, droppedFrames: 0 })
  })

  test('start schedules the rAF loop and a second start does not re-schedule it', () => {
    const monitor = new FrameMonitor()
    monitor.start()
    monitor.start()

    expect(requestAnimationFrame).toHaveBeenCalledTimes(1)
  })

  test('counts frames whose duration exceeds the frame budget', () => {
    const monitor = new FrameMonitor()
    monitor.start()

    tick(0)
    tick(10) // 10ms — within budget
    tick(40) // 30ms — dropped
    tick(50) // 10ms — within budget
    tick(90) // 40ms — dropped

    const snapshot = monitor.snapshot()
    expect(snapshot.droppedFrames).toBe(2)
    expect(snapshot.frameMs).toBe(40)
  })

  test('drops a frame from the count once it ages past the rolling 1s window', () => {
    const monitor = new FrameMonitor()
    monitor.start()

    let timestamp = 0
    tick(timestamp)
    timestamp += 40
    tick(timestamp) // 40ms — dropped, recorded at ts=40

    for (let i = 0; i < 65; i++) {
      // on-budget 16ms steps past the 1s window, so nothing else drops
      timestamp += 16
      tick(timestamp)
    }

    expect(monitor.snapshot().droppedFrames).toBe(0)
  })

  test('stop cancels the scheduled rAF and resets the timeline', () => {
    const monitor = new FrameMonitor()
    monitor.start()
    monitor.stop()

    expect(cancelAnimationFrame).toHaveBeenCalledWith(1)
  })

  test('stop is a no-op when the monitor was never started', () => {
    const monitor = new FrameMonitor()
    monitor.stop()

    expect(cancelAnimationFrame).not.toHaveBeenCalled()
  })
})
