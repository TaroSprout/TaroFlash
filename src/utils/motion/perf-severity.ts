import { PERF_DANGER_RATIO, PERF_FPS_DANGER, PERF_FPS_WARN, PERF_WARN_RATIO } from './perf-budget'

/** Text colour for a metric whose ratio to its budget rises with severity — elements. */
export function budgetRatioClass(ratio: number): string {
  if (ratio >= PERF_DANGER_RATIO) return 'text-red-600'
  if (ratio >= PERF_WARN_RATIO) return 'text-yellow-700'
  return ''
}

/** Text colour for fps, which falls with severity instead of rising. */
export function fpsClass(fps: number): string {
  if (fps < PERF_FPS_DANGER) return 'text-red-600'
  if (fps < PERF_FPS_WARN) return 'text-yellow-700'
  return ''
}
