<script setup lang="ts">
import NavBar from '@/components/nav-bar.vue'
import Phone from '@/phone/phone.vue'
import MobileDockHost from '@/components/mobile-dock/mobile-dock-host.vue'
import DashboardSkeleton from '@/views/dashboard/skeleton.vue'
import DeckSkeleton from '@/views/deck/skeleton.vue'
import { routeSlideEnter, routeSlideLeave } from '@/utils/animations/route-slide'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const going_to_dashboard = ref(false)

router.beforeEach((to) => {
  going_to_dashboard.value = to.name === 'dashboard'
})

const onLeave = routeSlideLeave(going_to_dashboard)
const onEnter = routeSlideEnter(going_to_dashboard)
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
          <suspense :key="route.name">
            <component :is="Component" />
            <template #fallback>
              <dashboard-skeleton v-if="route.name === 'dashboard'" />
              <deck-skeleton v-else-if="route.name === 'deck'" />
              <div v-else data-testid="route-skeleton" class="h-full w-full animate-pulse"></div>
            </template>
          </suspense>
        </transition>
      </router-view>
    </main>

    <mobile-dock-host />
  </div>
</template>
