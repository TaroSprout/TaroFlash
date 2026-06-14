import type { ViewApp } from '@/phone/system/types'
import component from './component/index.vue'

export default {
  title: 'Settings',
  type: 'view',
  display: 'full',
  component,
  modal_options: {
    mode: 'mobile-sheet',
    mobile_below_width: 'md',
    mobile_below_height: 'md'
  },
  launcher: {
    icon_src: 'settings',
    hover_icon_src: 'settings-hover',
    theme: 'pink-400'
  }
} satisfies Omit<ViewApp, 'id'>
