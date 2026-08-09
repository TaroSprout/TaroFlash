import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import generateUID from '@/utils/uid'
import { type SoundKey } from '@/sfx/config'

export type NoticeState = 'success' | 'error' | 'warn' | 'info'
export type NoticeVariant = 'toast' | 'panel'

export type NoticeAction = {
  label: string
  onClick: () => void
  // Dismiss the notice once onClick has run.
  closesOnClick?: boolean
  sfx?: { press?: SoundKey }
}

type NoticeOptions = {
  subMessage?: string
  delay?: number
  persist?: boolean
  variant?: NoticeVariant
  actions?: NoticeAction[]
  onDismiss?: () => void
  // Dims the page behind a panel; a toast ignores it. Defaults to true.
  backdrop?: boolean
  // Show the close (x) button. Defaults to true.
  closable?: boolean
  // Caller-defined sound played once, when the notice opens.
  sfx?: { open?: SoundKey | SoundKey[] }
}

export type Notice = NoticeOptions & {
  message: string
  state: NoticeState
  id: string
}

const DEFAULT_DELAY = 3000

export const useNoticeStore = defineStore('notice', () => {
  const notices = ref<Notice[]>([])

  const toast_notices = computed(() => notices.value.filter((n) => n.variant !== 'panel'))
  const panel_notices = computed(() => notices.value.filter((n) => n.variant === 'panel'))

  /** Returns the created notice so a caller can dismiss it later without waiting
   * for a user action — an action whose own work decides when the notice is done. */
  function addNotice(state: NoticeState, message: string, options?: NoticeOptions): Notice {
    const persist = options?.persist ?? Boolean(options?.actions?.length)
    const variant = options?.variant ?? 'toast'

    // Only one panel notice may be visible at a time; a newer one replaces
    // any existing panel. Toasts are unaffected and may still stack.
    if (variant === 'panel') {
      const existing_panels = notices.value.filter((n) => n.variant === 'panel')
      for (const panel of existing_panels) removeNotice(panel)
    }

    const notice: Notice = {
      variant: 'toast',
      delay: DEFAULT_DELAY,
      closable: true,
      backdrop: true,
      ...options,
      persist,
      message,
      state,
      id: generateUID()
    }

    notices.value.push(notice)

    return notice
  }

  function removeNotice(notice: Notice): void {
    const index = notices.value.findIndex((n) => n.id === notice.id)
    if (index !== -1) notices.value.splice(index, 1)
  }

  function warn(message: string, options?: NoticeOptions): Notice {
    return addNotice('warn', message, {
      ...options,
      sfx: { open: 'etc_error_swipe', ...options?.sfx }
    })
  }

  function success(message: string, options?: NoticeOptions): Notice {
    return addNotice('success', message, {
      ...options,
      sfx: { open: 'success_3', ...options?.sfx }
    })
  }

  function error(message: string, options?: NoticeOptions): Notice {
    return addNotice('error', message, {
      ...options,
      sfx: { open: 'digi_powerdown', ...options?.sfx }
    })
  }

  function info(message: string, options?: NoticeOptions): Notice {
    return addNotice('info', message, {
      ...options,
      sfx: { open: 'chime_ring', ...options?.sfx }
    })
  }

  return {
    notices,
    toast_notices,
    panel_notices,
    removeNotice,
    warn,
    success,
    error,
    info
  }
})
