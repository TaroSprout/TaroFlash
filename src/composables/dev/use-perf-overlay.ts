import { onBeforeUnmount, onMounted, reactive } from 'vue'
import { FrameMonitor } from '@/utils/motion/frame-monitor'
import { PERF_BUDGET } from '@/utils/motion/perf-budget'
import { scanPerf } from '@/utils/motion/perf-scan'

const SCAN_INTERVAL_MS = 500

export interface PerfOverlayState {
  frameMs: number
  droppedFrames: number
  onScreenElementCount: number
  standingEffectAreaRatio: number
}

/** Drives the dev perf overlay: a rolling frame monitor plus a periodic DOM scan, both read against `PERF_BUDGET`. */
export function usePerfOverlay() {
  const state = reactive<PerfOverlayState>({
    frameMs: 0,
    droppedFrames: 0,
    onScreenElementCount: 0,
    standingEffectAreaRatio: 0
  })

  const monitor = new FrameMonitor()
  let intervalId: ReturnType<typeof setInterval> | null = null

  onMounted(() => {
    monitor.start()

    intervalId = setInterval(() => {
      const frame = monitor.snapshot()
      const scan = scanPerf()

      state.frameMs = frame.frameMs
      state.droppedFrames = frame.droppedFrames
      state.onScreenElementCount = scan.onScreenElementCount
      state.standingEffectAreaRatio = scan.standingEffectAreaRatio
    }, SCAN_INTERVAL_MS)
  })

  onBeforeUnmount(() => {
    monitor.stop()
    if (intervalId !== null) clearInterval(intervalId)
  })

  return { state, budget: PERF_BUDGET }
}
