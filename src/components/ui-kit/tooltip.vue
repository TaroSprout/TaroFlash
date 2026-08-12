<script setup lang="ts">
import { computed, ref, useTemplateRef, watch, onBeforeUnmount } from 'vue'
import { useFloating, flip, autoUpdate, offset, type Placement } from '@floating-ui/vue'
import { useMatchMedia } from '@/composables/ui/media-query'

const {
  text,
  position = 'top',
  gap = 0,
  fallback_placements = ['right', 'left', 'top', 'bottom'],
  element = 'div',
  visible = false,
  suppress = false,
  max_chars = 32
} = defineProps<{
  text?: string
  position?: Placement
  gap?: number
  fallback_placements?: Placement[]
  element?: 'div' | 'span' | 'button' | 'label'
  visible?: boolean
  suppress?: boolean
  // Wraps the tooltip body at roughly this many characters per line, using
  // `ch` units so it scales with the font instead of a fixed pixel width.
  max_chars?: number
}>()

const triggerRef = useTemplateRef<HTMLElement>('ui-tooltip-trigger')
const popoverRef = useTemplateRef<HTMLElement>('ui-tooltip')

const is_active = ref(false)
const is_coarse_pointer = useMatchMedia('coarse')

// Gates both DOM mount and autoUpdate, so unused tooltips stay out of the DOM.
// Coarse pointers never show one — there's no hover, only a tap-driven focus.
const should_show = computed(
  () => !suppress && !is_coarse_pointer.value && (visible || is_active.value)
)

// Rough heuristic — good enough to tell whether `text` will wrap onto more
// than one line at `max_chars`, so we can give wrapped tooltips extra breathing room.
const is_multiline = computed(() => (text?.length ?? 0) > max_chars)

const { floatingStyles, update } = useFloating(triggerRef, popoverRef, {
  placement: position,
  strategy: 'fixed',
  middleware: [
    offset(() => gap),
    flip({
      fallbackPlacements: fallback_placements
    })
  ]
})

let stop_auto_update: (() => void) | null = null

watch(
  () => ({
    show: should_show.value,
    trigger: triggerRef.value,
    popover: popoverRef.value
  }),
  ({ show, trigger, popover }) => {
    stop_auto_update?.()
    stop_auto_update = null
    if (show && trigger && popover) {
      stop_auto_update = autoUpdate(trigger, popover, update)
    }
  },
  { flush: 'post' }
)

onBeforeUnmount(() => stop_auto_update?.())

function onPointerEnter(e: PointerEvent) {
  if (e.pointerType !== 'mouse') return
  is_active.value = true
}

function onPointerLeave(e: PointerEvent) {
  if (e.pointerType !== 'mouse') return
  is_active.value = false
}
</script>

<template>
  <component
    :is="element"
    ref="ui-tooltip-trigger"
    class="ui-tooltip-trigger"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
    @focusin="is_active = true"
    @focusout="is_active = false"
  >
    <slot></slot>
    <Teleport v-if="should_show" to="body">
      <div
        ref="ui-tooltip"
        data-testid="ui-tooltip"
        data-station="float"
        :data-multiline="is_multiline"
        :style="{ ...floatingStyles, maxWidth: `${max_chars}ch` }"
        class="ui-tooltip ui-tooltip--visible rounded-4 text-sm text-center pointer-events-none z-102 select-none"
        :class="[is_multiline ? 'py-3 px-3' : 'py-1.5 px-2', 'bg-surface text-ink']"
      >
        <slot name="tooltip">{{ text }}</slot>
      </div>
    </Teleport>
  </component>
</template>

<style>
.ui-tooltip {
  display: none;
}

.ui-tooltip--visible {
  display: block;
}
</style>
