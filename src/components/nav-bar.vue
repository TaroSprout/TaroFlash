<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import BackButton from '@/components/back-button.vue'

const { t } = useI18n()
const nav_bar = useTemplateRef('nav-bar')

onMounted(() => {
  const height = (nav_bar.value?.clientHeight ?? 0) + 24
  document.documentElement.style.setProperty('--nav-height', `${height}px`)
})
</script>

<template>
  <!-- translateZ(0) pins this sticky bar to its own compositor layer; without it,
       iOS standalone lags it during scroll. -->
  <nav
    data-testid="nav-bar-container"
    ref="nav-bar"
    class="w-full sticky top-0 z-50 transform-[translateZ(0)] pt-4 pb-8 bg-blue-500 dark:bg-blue-650 wave-bottom-[30px] flex justify-center"
  >
    <div
      data-testid="nav-bar"
      class="flex w-full max-w-(--page-width) items-center max-sm:justify-center gap-4 sm:px-(--page-px) relative"
    >
      <back-button class="absolute! left-4" />
      <div class="flex items-center gap-1 text-4xl text-brown-100">
        <ui-icon src="logo" class="h-9" />
        <div>{{ t('app.title') }}</div>
      </div>
    </div>
  </nav>
</template>
