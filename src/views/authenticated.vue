<script setup lang="ts">
import NavBar from '@/components/nav-bar.vue'
import Phone from '@/phone/phone.vue'
import UiLoader from '@/components/ui-kit/loader/index.vue'
import DashboardSkeleton from '@/views/dashboard/skeleton.vue'
import DeckSkeleton from '@/views/deck/skeleton.vue'
import { useSessionStore } from '@/stores/session'
import { clearStaticLoader } from '@/utils/static-loader'

const session = useSessionStore()
</script>

<template>
  <ui-loader
    :loading="session.isLoading"
    :delay-ms="1000"
    loading-image="logo"
    size="lg"
    theme="blue-500"
    theme-dark="grey-900"
    class="absolute inset-0 text-white"
    @finish="clearStaticLoader"
  >
    <div class="flex flex-col min-h-dvh w-full shrink-0 md:items-center">
      <nav-bar />
      <phone />

      <main class="w-full max-w-(--page-width) px-4 sm:px-16">
        <router-view v-slot="{ Component, route }">
          <suspense>
            <component :is="Component" />
            <template #fallback>
              <dashboard-skeleton v-if="route.name === 'dashboard'" />
              <deck-skeleton v-else-if="route.name === 'deck'" />
              <div v-else data-testid="route-skeleton" class="h-full w-full animate-pulse"></div>
            </template>
          </suspense>
        </router-view>
      </main>
    </div>
  </ui-loader>
</template>
