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
  <div data-testid="welcome-hero__wave-backdrop" class="w-full bg-brown-200 dark:bg-grey-800">
    <section
      data-testid="welcome-hero"
      class="flex flex-col w-full pt-7.5 pb-44 relative bg-green-400 wave-bottom-[30px] bgx-diagonal-stripes bgx-size-20 bgx-opacity-12 bg-center overflow-hidden"
    >
      <div class="absolute pointer-events-none inset-0 bg-(image:--bgx-stars) bg-center -z-1"></div>

      <splash-nav />

      <div
        data-testid="welcome-hero__content"
        class="w-full max-w-(--page-width) mx-auto px-4 sm:px-16 pt-32 pb-8 grid grid-cols-1 md:grid-cols-[400px_auto] gap-16 items-center justify-center relative z-3"
      >
        <splash-copy :signup="signup" :see-more="seeMore" />
        <splash-preview />
      </div>
    </section>
  </div>
</template>
