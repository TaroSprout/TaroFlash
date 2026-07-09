<script setup lang="ts">
import NavBar from '@/components/nav-bar.vue'
import TaroPhone from '@/components/taro-phone/index.vue'
import MobileDockHost from '@/components/mobile-dock/mobile-dock-host.vue'
import RouteSkeleton from '@/components/route-skeleton.vue'
import { useRouteTransition } from '@/composables/ui/route-transition'
import { useResumeStudySession } from '@/components/flashcard-session/composables/session-resume'

const { show_skeleton_overlay, onSuspensePending, onSuspenseResolve, onLeave, onEnter } =
  useRouteTransition()

useResumeStudySession()
</script>

<template>
  <div
    class="flex flex-col min-h-dvh w-full shrink-0 md:items-center [--page-px:1rem] sm:[--page-px:4rem] [--page-pt:1.5rem]"
  >
    <nav-bar />
    <taro-phone />

    <main class="relative overflow-clip w-full max-w-(--page-width)">
      <router-view v-slot="{ Component, route }">
        <transition :css="false" @leave="onLeave" @enter="onEnter">
          <div :key="route.name as string" data-testid="route-container" class="relative">
            <suspense @pending="onSuspensePending" @resolve="onSuspenseResolve">
              <component :is="Component" :class="{ invisible: show_skeleton_overlay }" />
              <template #fallback>
                <route-skeleton :name="route.name" />
              </template>
            </suspense>
            <div v-if="show_skeleton_overlay" class="absolute inset-0">
              <route-skeleton :name="route.name" />
            </div>
          </div>
        </transition>
      </router-view>
    </main>

    <mobile-dock-host />
  </div>
</template>
