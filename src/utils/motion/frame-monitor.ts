import { PERF_BUDGET } from './perf-budget'

const ROLLING_WINDOW_MS = 1000

export interface FrameSnapshot {
  frameMs: number
  droppedFrames: number
}

/** Counts frames that miss the frame budget over a rolling 1s window, via `requestAnimationFrame`. */
export class FrameMonitor {
  private durations: { timestamp: number; duration: number }[] = []
  private lastTimestamp: number | null = null
  private latestDuration = 0
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

    return { frameMs: this.latestDuration, droppedFrames }
  }

  private tick = (timestamp: number) => {
    if (this.lastTimestamp !== null) {
      this.latestDuration = timestamp - this.lastTimestamp
      this.durations.push({ timestamp, duration: this.latestDuration })

      const cutoff = timestamp - ROLLING_WINDOW_MS
      while (this.durations.length && this.durations[0].timestamp < cutoff) {
        this.durations.shift()
      }
    }

    this.lastTimestamp = timestamp
    this.rafId = requestAnimationFrame(this.tick)
  }
}
