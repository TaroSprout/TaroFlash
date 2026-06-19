import type { WidgetApp } from '@/phone/system/types'
import component from './component.vue'

export default {
  id: 'darkmode',
  title: 'Darkmode',
  type: 'widget',
  component,
  launcher: {
    icon_src: 'darkmode',
    theme: 'purple-500'
  }
} satisfies WidgetApp
