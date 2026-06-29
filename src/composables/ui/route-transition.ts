import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { routeSlideEnter, routeSlideLeave } from '@/utils/animations/route-slide'

export function useRouteTransition() {
  const router = useRouter()
  const going_to_dashboard = ref(false)
  const is_initial = ref(true)
  const animation_done = ref(true)
  const suspense_resolved = ref(false)
  const fallback_shown = ref(false)

  const show_skeleton_overlay = computed(
    () => !animation_done.value && suspense_resolved.value && fallback_shown.value
  )

  router.beforeEach((to) => {
    going_to_dashboard.value = to.name === 'dashboard'
    animation_done.value = false
    suspense_resolved.value = false
    fallback_shown.value = false
  })

  router.afterEach(() => {
    is_initial.value = false
  })

  function onSuspensePending() {
    fallback_shown.value = true
  }

  function onSuspenseResolve() {
    suspense_resolved.value = true
  }

  const onLeave = routeSlideLeave(going_to_dashboard)
  const onEnter = routeSlideEnter(going_to_dashboard, is_initial, animation_done)

  return { show_skeleton_overlay, onSuspensePending, onSuspenseResolve, onLeave, onEnter }
}
