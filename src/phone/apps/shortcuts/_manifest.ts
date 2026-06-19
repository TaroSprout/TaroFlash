import type { ViewApp } from '@/phone/system/types'
import component from './component.vue'

export default {
  id: 'shortcuts',
  title: 'Shortcuts',
  type: 'view',
  display: 'panel',
  component,
  launcher: {
    icon_src: 'shortcuts',
    hover_icon_src: 'shortcuts-hover',
    theme: 'yellow-500'
  }
} satisfies ViewApp
