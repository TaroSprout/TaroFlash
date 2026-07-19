<script setup lang="ts">
type DashboardSectionProps = {
  label: string
  loading?: boolean
}

const { loading = false } = defineProps<DashboardSectionProps>()

defineSlots<{
  default(): any
  /** Optional content rendered directly below the label (e.g. a filter toggle). */
  subheader?(): any
}>()
</script>

<template>
  <section data-testid="dashboard-section" class="flex flex-col gap-6">
    <div data-testid="dashboard-section__heading" class="flex flex-col gap-1.5">
      <h2
        data-testid="dashboard-section__label"
        class="text-3xl"
        :class="loading ? 'text-brown-300 dark:text-stone-700' : 'text-ink'"
      >
        {{ label }}
      </h2>
      <div v-if="$slots.subheader" data-testid="dashboard-section__subheader">
        <slot name="subheader"></slot>
      </div>
    </div>

    <div data-testid="dashboard-section__content">
      <slot></slot>
    </div>
  </section>
</template>
