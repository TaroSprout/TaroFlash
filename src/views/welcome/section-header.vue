<script setup lang="ts">
type SectionHeaderProps = {
  eyebrow: string
  heading: string
  subtitle?: string
}

const { eyebrow, heading, subtitle } = defineProps<SectionHeaderProps>()
</script>

<template>
  <header
    data-testid="welcome-section-header"
    class="flex flex-col items-center gap-2.5 text-center"
  >
    <p
      data-testid="welcome-section-header__eyebrow"
      class="text-base uppercase tracking-widest text-brown-500"
    >
      {{ eyebrow }}
    </p>

    <h2
      data-testid="welcome-section-header__heading"
      class="text-5xl text-brown-700 dark:text-brown-100"
    >
      {{ heading }}
    </h2>

    <p
      v-if="subtitle"
      data-testid="welcome-section-header__subtitle"
      class="text-lg text-brown-500 max-w-160"
    >
      {{ subtitle }}
    </p>

    <span
      data-testid="welcome-section-header__rule"
      aria-hidden="true"
      class="mt-2 h-1.5 w-25 rounded-full bg-orange-700"
    />
  </header>
</template>
