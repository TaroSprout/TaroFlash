<script setup lang="ts">
type LabeledSectionProps = {
  label: string
  description?: string
}

defineProps<LabeledSectionProps>()

defineSlots<{
  default(): any
  /** Trailing controls aligned with the label (e.g. "Reset", "Help"). */
  actions?(): any
}>()
</script>

<template>
  <section
    data-testid="labeled-section"
    class="flex flex-col"
    :class="description ? 'gap-3' : 'gap-2.5'"
  >
    <div data-testid="labeled-section__heading" class="flex flex-col">
      <div data-testid="labeled-section__label-row" class="flex items-center justify-between gap-2">
        <h3 data-testid="labeled-section__label" class="text-xl text-brown-700 dark:text-brown-100">
          {{ label }}
        </h3>
        <div v-if="$slots.actions" data-testid="labeled-section__actions">
          <slot name="actions"></slot>
        </div>
      </div>
      <p
        v-if="description"
        data-testid="labeled-section__description"
        class="text-sm text-brown-500"
      >
        {{ description }}
      </p>
    </div>
    <div data-testid="labeled-section__content" class="flex flex-col gap-2">
      <slot></slot>
    </div>
  </section>
</template>
