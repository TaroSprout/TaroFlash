<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div
    data-testid="welcome-hero__copy"
    class="flex flex-col gap-2 max-w-80 text-brown-700 dark:text-brown-100 text-center lg:text-left"
  >
    <h1 class="text-7xl font-bold">
      {{ t('welcome-view.hero.heading') }}
    </h1>

    <p class="text-lg">{{ t('welcome-view.hero.subheading') }}</p>
  </div>
</template>
