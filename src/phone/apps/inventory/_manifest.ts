import type { TriggerApp } from '@/phone/system/types'

export default {
  id: 'inventory',
  title: 'Inventory',
  type: 'trigger',
  launcher: {
    icon_src: 'inventory',
    hover_icon_src: 'inventory-hover',
    theme: 'blue-400'
  }
} satisfies TriggerApp
