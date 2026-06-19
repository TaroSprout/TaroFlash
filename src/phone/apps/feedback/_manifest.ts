import type { TriggerApp } from '@/phone/system/types'

export default {
  id: 'feedback',
  title: 'Feedback',
  type: 'trigger',
  launcher: {
    icon_src: 'feedback',
    hover_icon_src: 'feedback-hover',
    theme: 'green-400'
  }
} satisfies TriggerApp
