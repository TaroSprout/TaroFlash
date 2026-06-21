<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import { useLoginModal } from '../login/login-modal'

type SplashActionsProps = {
  signup: (payment?: boolean) => void
  seeMore: () => void
}

const { signup, seeMore } = defineProps<SplashActionsProps>()

const { t } = useI18n()
const { open: openLogin } = useLoginModal()
</script>

<template>
  <div data-testid="welcome-hero__actions" class="flex items-center gap-2 lg:gap-4">
    <ui-button
      size="xl"
      data-theme="brown-100"
      data-theme-dark="stone-700"
      icon-left="arrow-down"
      class="max-lg:hidden!"
      :sfx="{ press: 'snappy_button_5' }"
      @press="seeMore()"
    >
      {{ t('welcome-view.hero.see-more-button') }}
    </ui-button>

    <ui-button
      size="xl"
      data-theme="brown-100"
      data-theme-dark="stone-700"
      icon-left="user-sticker-square"
      class="lg:hidden!"
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
      <span class="lg:hidden">{{ t('welcome-view.signup-button-short') }}</span>
      <span class="max-lg:hidden">{{ t('welcome-view.signup-button') }}</span>
    </ui-button>
  </div>
</template>
