import type { InjectionKey } from 'vue'
import type { usePacingFields } from './use-pacing-fields'

/**
 * The tab root resolves `usePacingFields` once and provides it — the header,
 * the limits column and the scheduling pane all read the same override lens,
 * so a per-component call would fan out duplicate preset subscriptions and
 * duplicate computeds over identical state.
 */
export const pacingFieldsKey: InjectionKey<ReturnType<typeof usePacingFields>> =
  Symbol('pacing-fields')
