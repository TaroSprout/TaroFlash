<script setup lang="ts">
import { computed, useTemplateRef, onUnmounted, watch } from 'vue'
import {
  useFloating,
  shift,
  flip,
  autoUpdate,
  arrow,
  offset,
  hide,
  type Placement,
  type Strategy,
  type Padding,
  type VirtualElement
} from '@floating-ui/vue'
import uid from '@/utils/uid'

type PopoverProps = {
  mode?: 'click' | 'hover'
  open?: boolean
  position?: Placement
  gap?: number
  strategy?: Strategy
  transition_duration?: number
  clip_margin?: Padding
  padding?: Padding
  fallback_placements?: Placement[]
  shadow?: boolean
  use_arrow?: boolean
  clip?: boolean
  anchor_rect?: DOMRect | null
}

const {
  mode = 'click',
  open = false,
  position = 'top',
  gap = 14,
  strategy = 'fixed',
  transition_duration = 100,
  clip_margin = 0,
  padding = 24,
  fallback_placements = ['right', 'left', 'top', 'bottom'],
  shadow = false,
  use_arrow = true,
  clip = true,
  anchor_rect = null
} = defineProps<PopoverProps>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const ARROW_SIZE = 10

const triggerRef = useTemplateRef('triggerRef')
const popoverRef = useTemplateRef('popoverRef')
const arrowRef = useTemplateRef('arrowRef')
const id = uid()

// Anchor against a selection rect (virtual element) when one is provided —
// text-selection popovers have no DOM trigger to wrap. Falls back to the
// wrapped trigger element otherwise.
const reference = computed(() =>
  anchor_rect ? ({ getBoundingClientRect: () => anchor_rect } as VirtualElement) : triggerRef.value
)

const { placement, middlewareData, floatingStyles } = useFloating(reference, popoverRef, {
  placement: position,
  strategy: strategy,
  whileElementsMounted: autoUpdate,
  middleware: [
    offset(() => (use_arrow ? ARROW_SIZE + gap : gap)),
    shift({ padding }),
    flip({
      fallbackPlacements: fallback_placements
    }),
    ...(use_arrow ? [arrow({ element: arrowRef })] : []),
    ...(clip ? [hide({ padding: clip_margin })] : [])
  ]
})

onUnmounted(() => {
  if (mode === 'click') {
    document.removeEventListener('click', onPageClick, true)
  }
})

const side = computed(() => placement.value.split('-')[0] as 'top' | 'right' | 'bottom' | 'left')

const staticSideMap = { top: 'bottom', right: 'left', bottom: 'top', left: 'right' } as const

const arrowStyle = computed(() => {
  const { x, y } = middlewareData.value.arrow ?? {}
  const staticSide = staticSideMap[side.value]

  return {
    position: 'absolute' as const,
    left: x != null ? `${x}px` : '',
    top: y != null ? `${y}px` : '',
    right: '',
    bottom: '',
    [staticSide]: `-${ARROW_SIZE}px`
  }
})

function onPageClick(e: Event): void {
  const target = e.target as HTMLElement

  if (!target.closest(`[data-id="${id}"]`)) {
    emit('close')
    document.removeEventListener('click', onPageClick, true)
  }
}

watch(
  () => open,
  (new_open, prev_open) => {
    if (new_open && !prev_open) {
      document.addEventListener('click', onPageClick, true)
    } else if (!new_open && prev_open) {
      document.removeEventListener('click', onPageClick, true)
    }
  }
)
</script>

<template>
  <div
    data-testid="ui-kit-popover-container"
    :data-id="id"
    ref="triggerRef"
    class="ui-kit-popover-container"
    :class="[`ui-kit-popover-container--${mode}`, { 'ui-kit-popover-container--open': open }]"
  >
    <slot name="trigger"></slot>

    <Transition
      :duration="transition_duration"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      enter-active-class="transition-opacity duration-100 ease-in-out"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
      leave-active-class="transition-opacity duration-100 ease-in-out"
    >
      <div
        v-if="open || mode === 'hover'"
        v-show="!middlewareData.hide?.referenceHidden"
        ref="popoverRef"
        data-testid="ui-kit-popover"
        class="ui-kit-popover"
        :class="`ui-kit-popover--${side} ${shadow ? 'ui-kit-popover--shadow' : ''}`"
        :style="floatingStyles"
      >
        <span data-testid="ui-kit-popover__bridge" class="ui-kit-popover__bridge"></span>
        <slot></slot>
        <div
          v-if="use_arrow"
          ref="arrowRef"
          data-testid="ui-kit-popover__arrow"
          class="ui-kit-popover__arrow"
          :style="arrowStyle"
        >
          <slot name="arrow" :side="side">
            <div class="ui-kit-popover__arrow-default" />
          </slot>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style>
.ui-kit-popover {
  display: none;
  position: relative;
  z-index: 60;
  border-radius: var(--radius-7);
  pointer-events: auto;
}

.ui-kit-popover-container--click.ui-kit-popover-container--open .ui-kit-popover,
.ui-kit-popover-container--hover:hover .ui-kit-popover,
.ui-kit-popover-container--hover .ui-kit-popover:hover {
  display: block;
}

.ui-kit-popover--shadow {
  filter: drop-shadow(var(--drop-shadow-sm));
}

.ui-kit-popover__arrow {
  width: 20px;
  height: 20px;
  z-index: -10;
}

.ui-kit-popover__arrow-default {
  width: 100%;
  height: 100%;
  background-color: var(--popover-arrow-color, var(--color-brown-300));
  border-radius: var(--radius-1);
  rotate: 45deg;
}

.ui-kit-popover__bridge {
  position: absolute;
  inset: 0;
}

.ui-kit-popover--top .ui-kit-popover__bridge {
  top: 100%;
  bottom: calc(var(--popover-gap) * -1);
}

.ui-kit-popover--bottom .ui-kit-popover__bridge {
  top: calc(var(--popover-gap) * -1);
  bottom: 100%;
}

.ui-kit-popover--left .ui-kit-popover__bridge {
  right: calc(var(--popover-gap) * -1);
  left: 100%;
}

.ui-kit-popover--right .ui-kit-popover__bridge {
  right: 100%;
  left: calc(var(--popover-gap) * -1);
}
</style>
