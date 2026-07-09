import type { InjectionKey } from 'vue'
import type { MobileCardEditor } from './use-mobile-card-editor'

export const mobileCardEditorKey = Symbol('mobileCardEditor') as InjectionKey<MobileCardEditor>
