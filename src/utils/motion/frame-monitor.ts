import { PERF_BUDGET } from './perf-budget'

const ROLLING_WINDOW_MS = 1000

export interface FrameSnapshot {
  fps: number
  droppedFrames: number
}

/** Tracks frame durations over a rolling 1s window, exposing the average fps and dropped-frame count the dev overlay reads. */
export class FrameMonitor {
  private durations: { timestamp: number; duration: number }[] = []
  private lastTimestamp: number | null = null
  private rafId: number | null = null

  start() {
    if (this.rafId !== null) return

    this.rafId = requestAnimationFrame(this.tick)
  }

  stop() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId)

    this.rafId = null
    this.lastTimestamp = null
  }

  snapshot(): FrameSnapshot {
    const droppedFrames = this.durations.filter(
      (frame) => frame.duration > PERF_BUDGET.frameMs
    ).length
    const totalDuration = this.durations.reduce((sum, frame) => sum + frame.duration, 0)
    const fps = totalDuration > 0 ? (this.durations.length / totalDuration) * 1000 : 0

    return { fps, droppedFrames }
  }

  private tick = (timestamp: number) => {
    if (this.lastTimestamp !== null) {
      this.durations.push({ timestamp, duration: timestamp - this.lastTimestamp })

      const cutoff = timestamp - ROLLING_WINDOW_MS
      while (this.durations.length && this.durations[0].timestamp < cutoff) {
        this.durations.shift()
      }
    }

    this.lastTimestamp = timestamp
    this.rafId = requestAnimationFrame(this.tick)
  }
}
