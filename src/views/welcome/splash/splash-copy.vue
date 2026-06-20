<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'

type SplashCopyProps = {
  signup: (payment?: boolean) => void
  seeMore: () => void
}

const { signup, seeMore } = defineProps<SplashCopyProps>()

const { t } = useI18n()
</script>

<template>
  <div data-testid="welcome-hero__copy" class="flex flex-col items-start gap-7">
    <h1 class="text-7xl text-brown-100 font-bold leading-none">
      {{ t('welcome-view.hero.heading') }}
    </h1>

    <p class="text-lg text-brown-100 max-w-110">{{ t('welcome-view.hero.subheading') }}</p>

    <div data-testid="welcome-hero__actions" class="flex items-center gap-4">
      <ui-button
        size="xl"
        data-theme="brown-100"
        icon-left="finger-point-down"
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
        @press="signup()"
      >
        {{ t('welcome-view.signup-button') }}
      </ui-button>
    </div>
  </div>
</template>
