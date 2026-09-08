<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import BackButton from '@/views/app-shell/nav-bar/back-button.vue'

const { t } = useI18n()
const nav_bar = useTemplateRef('nav-bar')

onMounted(() => {
  const height = (nav_bar.value?.clientHeight ?? 0) + 24
  document.documentElement.style.setProperty('--nav-height', `${height}px`)
})
</script>

<template>
  <nav
    data-testid="nav-bar-container"
    ref="nav-bar"
    class="w-full sticky top-0 z-50 transform-[translateZ(0)] pt-2 pb-8 sm:pt-4 bg-(--color-accent) wave-bottom-[30px] flex justify-center"
  >
    <div
      data-testid="nav-bar"
      class="flex w-full max-w-(--page-width) items-center gap-4 px-4 sm:px-(--page-px) relative"
    >
      <back-button class="sm:absolute! sm:left-4" />
      <div
        data-testid="nav-bar__logo-lockup"
        class="max-sm:absolute max-sm:left-1/2 max-sm:top-1/2 max-sm:-translate-x-1/2 max-sm:-translate-y-1/2 flex items-center gap-1 min-h-9 text-3xl sm:text-4xl text-(--color-on-accent)"
      >
        <ui-icon src="logo" class="h-8 sm:h-9" />
        <div data-testid="nav-bar__wordmark" class="hidden sm:block">{{ t('app.title') }}</div>
      </div>
    </div>
  </nav>
</template>
