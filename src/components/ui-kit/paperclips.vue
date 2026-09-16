<script setup lang="ts">
import UiIcon from './icon.vue'

type PaperclipsProps = {
  amount: number
  signed?: boolean
}

const { amount, signed = false } = defineProps<PaperclipsProps>()
</script>

<template>
  <span
    data-testid="ui-kit-paperclips"
    data-palette="brand"
    class="inline-flex items-center gap-1 text-(--color-accent)"
  >
    <ui-icon data-testid="ui-kit-paperclips__icon" src="paperclip" class="size-4" />
    <span data-testid="ui-kit-paperclips__amount">{{ signed ? `+${amount}` : amount }}</span>
  </span>
</template>
