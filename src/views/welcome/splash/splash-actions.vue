<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import { useLoginModal } from '../login/login-modal'
import { useWelcomeWidth, useWelcomeHeight } from '../welcome-layout'

type SplashActionsProps = {
  signup: (payment?: boolean) => void
  seeMore: () => void
}

const { signup, seeMore } = defineProps<SplashActionsProps>()

const { t } = useI18n()
const { open: openLogin } = useLoginModal()
const width = useWelcomeWidth()
const height = useWelcomeHeight()
</script>

<template>
  <div data-testid="welcome-hero__actions" class="flex items-center gap-2">
    <ui-button
      neutral
      v-if="width === 'desktop' || height === 'tall'"
      size="xl"
      icon-left="arrow-down"
      :sfx="{ press: 'snappy_button_5' }"
      @press="seeMore()"
    >
      {{ t('welcome-view.hero.see-more-button') }}
    </ui-button>

    <ui-button
      neutral
      v-if="height === 'short' && width !== 'desktop'"
      size="xl"
      icon-left="user-sticker-square"
      data-testid="welcome-hero__login"
      @press="openLogin()"
    >
      {{ t('welcome-view.login-button') }}
    </ui-button>

    <ui-button
      size="xl"
      data-theme="blue-500"
      data-theme-dark="blue-650"
      icon-left="account-circle-add"
      @press="signup()"
    >
      {{
        width === 'desktop'
          ? t('welcome-view.signup-button')
          : t('welcome-view.signup-button-short')
      }}
    </ui-button>
  </div>
</template>
