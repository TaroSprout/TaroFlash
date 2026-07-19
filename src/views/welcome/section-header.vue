<script setup lang="ts">
type SectionHeaderProps = {
  heading: string
  subtitle?: string
  // Set when the header sits on an accent-filled section (e.g. pricing): text
  // reads as on-accent and the rule as accent-muted. Otherwise the header sits
  // on a neutral surface and reads as ink.
  onAccent?: boolean
}

const { heading, subtitle, onAccent = false } = defineProps<SectionHeaderProps>()
</script>

<template>
  <header
    data-testid="welcome-section-header"
    class="flex flex-col items-center gap-2.5 text-center"
    :class="onAccent ? 'text-(--color-on-accent)' : 'text-ink'"
  >
    <h2 data-testid="welcome-section-header__heading" class="text-5xl">
      {{ heading }}
    </h2>

    <p v-if="subtitle" data-testid="welcome-section-header__subtitle" class="text-lg max-w-160">
      {{ subtitle }}
    </p>

    <svg
      data-testid="welcome-section-header__rule"
      aria-hidden="true"
      class="mt-2 h-2.5 w-25"
      :class="onAccent ? 'text-(--color-on-accent)' : 'text-ink-muted'"
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
