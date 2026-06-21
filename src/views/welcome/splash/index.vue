<script setup lang="ts">
import SplashNav from './splash-nav.vue'
import SplashCopy from './splash-copy.vue'
import SplashPreview from './splash-preview.vue'
import SplashActions from './splash-actions.vue'
import { useWelcomeHeight } from '../welcome-layout'

type SplashProps = {
  signup: (payment?: boolean) => void
  seeMore: () => void
}

const { signup, seeMore } = defineProps<SplashProps>()
const height = useWelcomeHeight()
</script>

<template>
  <div data-testid="welcome-hero__wave-backdrop" class="w-full bg-green-500 dark:bg-grey-800">
    <section
      data-testid="welcome-hero"
      class="flex flex-col w-full h-[90vh] min-h-160 py-7.5 max-h-250 relative bg-brown-300 dark:bg-grey-900 wave-bottom-[30px] bgx-dot-grid bgx-size-15 bgx-opacity-25 dark:bgx-opacity-10 bgx-color-brown-500 bg-center overflow-hidden"
    >
      <splash-nav />

      <div
        data-testid="welcome-hero__content"
        class="w-full max-w-250 mx-auto px-4 sm:px-16 grow grid grid-cols-1 lg:grid-cols-[auto_auto] lg:grid-rows-2 gap-4 lg:gap-x-12 lg:gap-y-7 items-center justify-between max-lg:justify-items-center relative z-3"
        :class="height === 'short' ? 'content-around' : 'content-center'"
      >
        <splash-copy class="order-1 lg:col-start-1 lg:row-start-1 lg:self-end" />
        <splash-preview class="order-2 lg:col-start-2 lg:row-start-1 lg:row-span-2" />
        <splash-actions
          :signup="signup"
          :see-more="seeMore"
          class="order-3 lg:col-start-1 lg:row-start-2 lg:self-start"
        />
      </div>
    </section>
  </div>
</template>
