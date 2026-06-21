<script setup lang="ts">
import SplashNav from './splash-nav.vue'
import SplashCopy from './splash-copy.vue'
import SplashPreview from './splash-preview.vue'

type SplashProps = {
  signup: (payment?: boolean) => void
  seeMore: () => void
}

const { signup, seeMore } = defineProps<SplashProps>()
</script>

<template>
  <div data-testid="welcome-hero__wave-backdrop" class="w-full bg-green-500 dark:bg-grey-800">
    <section
      data-testid="welcome-hero"
      class="flex flex-col w-full h-[90vh] min-h-135 max-h-250 py-7.5 relative bg-brown-300 dark:bg-grey-900 wave-bottom-[30px] bgx-dot-grid bgx-size-15 bgx-opacity-25 dark:bgx-opacity-10 bgx-color-brown-500 bg-center overflow-hidden"
    >
      <splash-nav />

      <div
        data-testid="welcome-hero__content"
        class="w-full max-w-250 mx-auto px-4 sm:px-16 grow grid grid-cols-1 md:grid-cols-[auto_auto] gap-12 items-center content-center justify-between relative z-3"
      >
        <splash-copy :signup="signup" :see-more="seeMore" />
        <splash-preview />
      </div>
    </section>
  </div>
</template>
