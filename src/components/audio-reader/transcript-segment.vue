<script setup lang="ts">
const { segment, active, index } = defineProps<{
  segment: TranscriptSegment
  active: boolean
  index: number
}>()

const emit = defineEmits<{
  (e: 'seek', index: number): void
}>()

// A click seeks; a drag that leaves a text selection should NOT seek (the parent
// turns that selection into the translate popover instead).
function onClick() {
  const selection = window.getSelection()
  if (selection && !selection.isCollapsed) return
  emit('seek', index)
}
</script>

<template>
  <span
    data-testid="transcript-segment"
    :data-index="index"
    :data-active="active"
    class="cursor-pointer rounded-2 px-0.5 transition-colors data-[active=true]:bg-blue-200 dark:data-[active=true]:bg-blue-650/40"
    @click="onClick"
  >
    {{ segment.text }}
  </span>
</template>
