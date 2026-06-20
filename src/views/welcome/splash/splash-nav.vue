<script setup lang="ts">
import LoginDialogue from '@/views/welcome/login-dialog.vue'
import { useI18n } from 'vue-i18n'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiTooltip from '@/components/ui-kit/tooltip.vue'
import UiDropdownButton from '@/components/ui-kit/dropdown-button/index.vue'

const { t } = useI18n()
</script>

<template>
  <nav
    data-testid="welcome-hero__nav"
    class="w-full max-w-(--page-width) mx-auto px-4 sm:px-16 flex justify-between items-center relative z-5"
  >
    <div data-testid="welcome-hero__brand" class="flex items-center gap-1">
      <ui-icon src="logo" class="size-9 text-brown-100" />
      <span class="text-3xl text-brown-100">{{ t('app.title') }}</span>
      <ui-tooltip
        element="span"
        position="bottom"
        data-testid="welcome-hero__beta"
        :text="t('welcome-view.hero.beta-tooltip')"
        class="ml-1 rounded-3 bg-pink-400 px-2.5 py-0.5 text-lg text-brown-100 cursor-default"
      >
        {{ t('welcome-view.hero.beta-pill') }}
      </ui-tooltip>
    </div>

    <ui-dropdown-button
      size="lg"
      data-theme="brown-300"
      position="bottom-end"
      open-on-trigger
      hide-trigger
      data-testid="welcome-hero__login-trigger"
    >
      {{ t('welcome-view.login-button') }}

      <template #panel>
        <LoginDialogue />
      </template>
    </ui-dropdown-button>
  </nav>
</template>
