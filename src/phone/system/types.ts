import type { Component } from 'vue'
import type { BreakpointKey } from '@/composables/ui/media-query'

export type TransitionPreset = 'slide-left' | 'slide-right' | 'pop-up' | 'pop-down' | 'none'
export type PhoneAppDisplay = 'full' | 'panel'

export type ViewAppModalOptions = {
  mode: 'dialog' | 'mobile-sheet'
  mobile_below_width?: BreakpointKey
  mobile_below_height?: BreakpointKey
}

type LauncherConfig = {
  icon_src: string
  hover_icon_src?: string
  theme: Theme
}

type BaseApp = {
  id: string
  title: string
  clear_notifications_on_open?: boolean
}

export type ViewApp = BaseApp & {
  type: 'view'
  display: PhoneAppDisplay
  component: Component
  modal_options?: ViewAppModalOptions
  launcher: LauncherConfig
}

export type WidgetApp = BaseApp & {
  type: 'widget'
  component: Component
  launcher: LauncherConfig
}

export type TriggerApp = BaseApp & {
  type: 'trigger'
  onTrigger?: () => void | Promise<void>
  launcher: LauncherConfig
}

export type PhoneApp = ViewApp | WidgetApp | TriggerApp

export type NotifyPayload = { count?: number }
export type PhoneNotification = NotifyPayload & { app_id: string }

export type AppProps = {
  close: () => void
}

export type AppEmits = {
  (e: 'close'): void
}
