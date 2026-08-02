<script setup lang="ts">
import NavBar from '@/views/app-shell/nav-bar/index.vue'
import TaroPhone from '@/components/taro-phone/index.vue'
import MobileDockHost from '@/components/mobile-dock/mobile-dock-host.vue'
import RouteSkeleton from '@/views/app-shell/route-skeleton.vue'
import { computed, watch } from 'vue'
import { useRouteTransition } from '@/composables/ui/route-transition'
import { useResumeStudySession } from '@/views/study-session/composables/session-resume'
import { useMemberStore } from '@/stores/member'
import { usePendingDeletionNotice } from '@/composables/member/pending-deletion-notice'

const { show_skeleton_overlay, onSuspensePending, onSuspenseResolve, onLeave, onEnter } =
  useRouteTransition()
const member = useMemberStore()

useResumeStudySession()

// The skeleton overlay masks the real route while it's mid-transition, and also
// for the whole time a member is pending-deletion — so their account/profile
// never paints behind the restore dialog. Same visual state as a cold load.
const show_skeleton = computed(() => show_skeleton_overlay.value || member.pending_deletion)

// A suspended (pending-deletion) member is admitted to the shell and sees the
// route skeleton — the checkpoint no longer diverts them to welcome. The
// restore dialog opens over that skeleton once the member row confirms the
// pending state. `immediate` so a cold load on an already-suspended member
// still fires when the row resolves.
watch(
  () => member.pending_deletion,
  (pending) => {
    if (pending) usePendingDeletionNotice().open()
  },
  { immediate: true }
)
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
              <component :is="Component" :class="{ invisible: show_skeleton }" />
              <template #fallback>
                <route-skeleton :name="route.name" />
              </template>
            </suspense>
            <div v-if="show_skeleton" data-testid="route-skeleton-overlay" class="absolute inset-0">
              <route-skeleton :name="route.name" />
            </div>
          </div>
        </transition>
      </router-view>
    </main>

    <mobile-dock-host />
  </div>
</template>
