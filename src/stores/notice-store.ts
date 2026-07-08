import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import generateUID from '@/utils/uid'

export type NoticeState = 'success' | 'error' | 'warn' | 'info'
export type NoticeVariant = 'toast' | 'panel'

export type NoticeAction = {
  label: string
  onClick: () => void
}

type NoticeOptions = {
  subMessage?: string
  delay?: number
  persist?: boolean
  variant?: NoticeVariant
  actions?: NoticeAction[]
  onDismiss?: () => void
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

  function addNotice(state: NoticeState, message: string, options?: NoticeOptions): void {
    const persist = options?.persist ?? Boolean(options?.actions?.length)

    notices.value.push({
      variant: 'toast',
      delay: DEFAULT_DELAY,
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
    addNotice('error', message, options)
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
