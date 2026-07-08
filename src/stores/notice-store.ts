import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import generateUID from '@/utils/uid'
import { type SoundKey } from '@/sfx/config'

export type NoticeState = 'success' | 'error' | 'warn' | 'info'
export type NoticeVariant = 'toast' | 'panel'

export type NoticeAction = {
  label: string
  onClick: () => void
  // Also dismiss the notice (through the same path as the close button /
  // auto-dismiss timer) after running onClick.
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
  // Panel-only: dims the page behind the panel. Ignored by the toast variant.
  // Defaults to true.
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

const DEFAULT_DELAY = 2000

export const useNoticeStore = defineStore('notice', () => {
  const notices = ref<Notice[]>([])

  const toast_notices = computed(() => notices.value.filter((n) => n.variant !== 'panel'))
  const panel_notices = computed(() => notices.value.filter((n) => n.variant === 'panel'))

  function addNotice(state: NoticeState, message: string, options?: NoticeOptions): void {
    const persist = options?.persist ?? Boolean(options?.actions?.length)

    notices.value.push({
      variant: 'toast',
      delay: DEFAULT_DELAY,
      closable: true,
      backdrop: true,
      ...options,
      persist,
      message,
      state,
      id: generateUID()
    })
  }

  function removeNotice(notice: Notice): void {
    const index = notices.value.findIndex((n) => n.id === notice.id)
    if (index !== -1) notices.value.splice(index, 1)
  }

  function warn(message: string, options?: NoticeOptions): void {
    addNotice('warn', message, options)
  }

  function success(message: string, options?: NoticeOptions): void {
    addNotice('success', message, options)
  }

  function error(message: string, options?: NoticeOptions): void {
    addNotice('error', message, {
      ...options,
      sfx: { open: 'digi_powerdown', ...options?.sfx }
    })
  }

  function info(message: string, options?: NoticeOptions): void {
    addNotice('info', message, options)
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
