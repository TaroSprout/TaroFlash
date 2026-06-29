<script setup lang="ts">
import NavBar from '@/components/nav-bar.vue'
import Phone from '@/phone/phone.vue'
import MobileDockHost from '@/components/mobile-dock/mobile-dock-host.vue'
import DashboardSkeleton from '@/views/dashboard/skeleton.vue'
import DeckSkeleton from '@/views/deck/skeleton.vue'
import { routeSlideEnter, routeSlideLeave } from '@/utils/animations/route-slide'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

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
</script>

<template>
  <div
    class="flex flex-col min-h-dvh w-full shrink-0 md:items-center [--page-px:1rem] sm:[--page-px:4rem] [--page-pt:1.5rem]"
  >
    <nav-bar />
    <phone />

    <main class="relative overflow-clip w-full max-w-(--page-width)">
      <router-view v-slot="{ Component, route }">
        <transition :css="false" @leave="onLeave" @enter="onEnter">
          <div :key="route.name as string" class="relative">
            <suspense @pending="onSuspensePending" @resolve="onSuspenseResolve">
              <component :is="Component" :class="{ invisible: show_skeleton_overlay }" />
              <template #fallback>
                <dashboard-skeleton v-if="route.name === 'dashboard'" />
                <deck-skeleton v-else-if="route.name === 'deck'" />
                <div v-else data-testid="route-skeleton" class="h-full w-full animate-pulse" />
              </template>
            </suspense>
            <template v-if="show_skeleton_overlay">
              <dashboard-skeleton v-if="route.name === 'dashboard'" class="absolute inset-0" />
              <deck-skeleton v-else-if="route.name === 'deck'" class="absolute inset-0" />
            </template>
          </div>
        </transition>
      </router-view>
    </main>

    <mobile-dock-host />
  </div>
</template>
