import type { Component } from 'vue'
import { createPhoneRuntime } from './runtime'
import { useI18n } from 'vue-i18n'

export type TransitionPreset = 'slide-left' | 'slide-right' | 'pop-up' | 'pop-down' | 'none'
export type PhoneAppDisplay = 'full' | 'panel'
export type MountPolicy = 'immediate' | 'lazy'

// Internal type — passed to controller factories and used by the runtime
export type PhoneContext = PhoneOS & {
  t: ReturnType<typeof useI18n>['t']
}

export type NotifyPayload = {
  count?: number
}

export type PhoneNotification = NotifyPayload & {
  app_id: string
}

export type AppContext = PhoneContext & {
  notify: (payload: NotifyPayload) => void
  clearNotification: () => void
}

// The shape injected via APP_CTX_KEY — available to all phone descendants
export type AppContextInjection = PhoneContext & {
  controller: AppController | undefined
}

export const APP_CTX_KEY = 'app-context'

type LauncherConfig = {
  icon_src: string
  hover_icon_src?: string
  theme: Theme
}

type BaseApp<TController extends AppController = AppController> = {
  id: string
  title: string
  mount_policy?: MountPolicy
  clear_notifications_on_open?: boolean
  controller?: (ctx: AppContext) => TController
}

export type ViewAppModalOptions = {
  mode: 'dialog' | 'mobile-sheet'
  mobile_below_width?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  mobile_below_height?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

export type ViewApp = BaseApp & {
  type: 'view'
  display: PhoneAppDisplay
  launcher: LauncherConfig
  component: Component
  // When set, full-display apps open with this mode instead of 'dialog'
  modal_options?: ViewAppModalOptions
}

export type WidgetApp = BaseApp & {
  type: 'widget'
  component?: Component
}

export type TriggerApp = BaseApp & {
  type: 'trigger'
  launcher: LauncherConfig
}

export type AppController = {
  onOpen?: () => void | Promise<void>
  onTrigger?: () => void | Promise<void>
}

export type PhoneApp = ViewApp | WidgetApp | TriggerApp
export type PhoneRuntime = ReturnType<typeof createPhoneRuntime>
export type PhoneOS = PhoneRuntime['phoneOS']

export type AppProps = {
  close: () => void
}

export type AppEmits = {
  (e: 'close'): void
}
