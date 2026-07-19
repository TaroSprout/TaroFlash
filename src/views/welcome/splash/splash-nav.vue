<script setup lang="ts">
import LoginDialogue from '@/views/welcome/login/index.vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiTooltip from '@/components/ui-kit/tooltip.vue'
import { useWelcomeHeight, useWelcomeWidth } from '../welcome-layout'

const { t } = useI18n()
const height = useWelcomeHeight()
const width = useWelcomeWidth()
</script>

<template>
  <nav
    v-if="height !== 'short' || width === 'desktop'"
    data-testid="welcome-hero__nav"
    class="w-full max-w-(--page-width) mx-auto px-4 sm:px-16 flex justify-between items-center relative z-5"
  >
    <div data-testid="welcome-hero__brand" class="flex items-center gap-1">
      <ui-icon src="logo" class="size-9 text-ink" />
      <span class="text-3xl text-ink">{{ t('app.title') }}</span>
      <ui-tooltip
        element="span"
        position="bottom"
        data-testid="welcome-hero__beta"
        :text="t('welcome-view.hero.beta-tooltip')"
        class="ml-1 rounded-3 bg-pink-400 dark:bg-pink-700 px-2.5 py-0.5 text-lg text-brown-100 cursor-default"
      >
        {{ t('welcome-view.hero.beta-pill') }}
      </ui-tooltip>
    </div>

    <LoginDialogue />
  </nav>
</template>
