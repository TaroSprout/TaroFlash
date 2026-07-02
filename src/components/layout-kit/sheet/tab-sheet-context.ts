import { computed, inject, type ComputedRef, type InjectionKey, type Ref } from 'vue'

export const activeTabKey: InjectionKey<Ref<string>> = Symbol('tab-sheet-active')

/**
 * Inside a tab pane, get a reactive boolean for whether this tab is the
 * active one. Drives independent overlay v-if/Transition lifecycles so the
 * overlay can leave/enter in parallel with tab-sheet's body Transition.
 */
export function useTabActive(my_value: string): ComputedRef<boolean> {
  const active = inject(activeTabKey)
  return computed(() => active?.value === my_value)
}
