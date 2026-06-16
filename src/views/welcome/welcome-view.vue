<script setup lang="ts">
import router from '@/router'
import { useSessionStore } from '@/stores/session'
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Splash from './splash.vue'
import UiImage from '@/components/ui-kit/image.vue'
import WelcomeFooter from '@/components/welcome-footer.vue'

const { t } = useI18n()
const session = useSessionStore()

onMounted(async () => {
  const authenticated = await session.restoreSession()

  if (authenticated) {
    router.push({ name: 'authenticated' })
  }
})
</script>

<template>
  <splash />
  <section class="w-full py-54.5 flex flex-col gap-80">
    <div class="flex gap-21 justify-center items-center">
      <div class="flex flex-col gap-3 w-152 text-brown-700 dark:text-brown-100">
        <h2 class="text-6xl">
          {{ t('welcome-view.feature.build-decks.heading') }}
        </h2>
        <p class="text-lg">
          {{ t('welcome-view.feature.build-decks.description') }}
        </p>
      </div>
      <ui-image src="deck-example" class="w-100" />
    </div>

    <div class="flex flex-col gap-6 justify-center items-center">
      <div class="flex flex-col gap-3 w-152 items-center text-brown-700 dark:text-brown-100">
        <h2 class="text-6xl">{{ t('welcome-view.feature.study-decks.heading') }}</h2>
        <p class="text-lg text-center">{{ t('welcome-view.feature.study-decks.description') }}</p>
      </div>
      <ui-image src="study-example" class="w-200" />
    </div>
  </section>

  <section
    class="w-full bg-brown-300 dark:bg-grey-800 bgx-bank-note dark:bgx-color-brown-800 dark:bgx-color-brown-300 py-54.5 flex flex-col wave-top-[30px]"
  >
    <div class="flex gap-21 justify-center items-center">
      <ui-image src="phone-example" class="w-60 z-1" />
      <div class="flex flex-col gap-3 w-152 text-brown-700 dark:text-brown-100">
        <h2 class="text-6xl">{{ t('welcome-view.feature.design.heading') }}</h2>
        <p class="text-lg">{{ t('welcome-view.feature.design.description') }}</p>
      </div>
    </div>
  </section>

  <welcome-footer />
</template>
