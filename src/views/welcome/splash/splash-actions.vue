<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'

type SplashActionsProps = {
  signup: (payment?: boolean) => void
  seeMore: () => void
}

const { signup, seeMore } = defineProps<SplashActionsProps>()

const { t } = useI18n()
</script>

<template>
  <div data-testid="welcome-hero__actions" class="flex items-center gap-4">
    <ui-button
      size="xl"
      data-theme="brown-100"
      data-theme-dark="stone-700"
      icon-left="arrow-down"
      :sfx="{ press: 'snappy_button_5' }"
      @press="seeMore()"
    >
      {{ t('welcome-view.hero.see-more-button') }}
    </ui-button>

    <ui-button
      size="xl"
      data-theme="blue-500"
      data-theme-dark="blue-650"
      icon-left="account-circle-add"
      @press="signup()"
    >
      {{ t('welcome-view.signup-button') }}
    </ui-button>
  </div>
</template>
