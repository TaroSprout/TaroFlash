<script setup lang="ts">
type SectionHeaderProps = {
  heading: string
  subtitle?: string
}

const { heading, subtitle } = defineProps<SectionHeaderProps>()
</script>

<template>
  <header
    data-testid="welcome-section-header"
    class="flex flex-col items-center gap-2.5 text-center"
    data-theme="brown-100"
    data-theme-dark="stone-700"
  >
    <h2 data-testid="welcome-section-header__heading" class="text-5xl text-(--theme-on-primary)">
      {{ heading }}
    </h2>

    <p
      v-if="subtitle"
      data-testid="welcome-section-header__subtitle"
      class="text-lg text-(--theme-neutral) max-w-160"
    >
      {{ subtitle }}
    </p>

    <svg
      data-testid="welcome-section-header__rule"
      aria-hidden="true"
      class="mt-2 h-2.5 w-25 text-(--theme-accent)"
      viewBox="0 0 100 10"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        d="M0 5 q5 -4 10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
      />
    </svg>
  </header>
</template>
