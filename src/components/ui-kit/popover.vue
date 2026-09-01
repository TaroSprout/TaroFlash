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
  size,
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
  anchor_el?: HTMLElement | null
  teleport?: boolean
  match_reference_width?: boolean
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
  anchor_rect = null,
  anchor_el = null,
  teleport = false,
  match_reference_width = false
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
    // Floor the floating element at the reference's width; its own content can
    // still push it wider.
    ...(match_reference_width
      ? [
          size({
            apply({ rects, elements }) {
              elements.floating.style.minWidth = `${rects.reference.width}px`
            }
          })
        ]
      : []),
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

// Teleporting to <body> severs DOM inheritance, so restate the trigger's
// resolved palette on the teleported node; the in-place path inherits it.
const inherited_context = computed(() => {
  if (!teleport || !open) return {}

  const trigger = triggerRef.value
  if (!trigger) return {}

  return { 'data-palette': trigger.closest<HTMLElement>('[data-palette]')?.dataset.palette }
})

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

// Only the watcher below disarms, on the edge back out of `open`. Disarming here
// instead would strand a caller that answers `close` by reopening on another
// anchor in the same tick: the prop never leaves `open`, so no edge ever re-arms
// the listener and the popover becomes undismissable.
function onPageClick(e: Event): void {
  const target = e.target as HTMLElement

  if (target.closest(`[data-id="${id}"]`)) return
  // An external anchor's own click decides open or closed; counting it as outside flashes the popover.
  if (anchor_el?.contains(target)) return

  emit('close')
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

    <Teleport to="body" :disabled="!teleport">
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
          :data-id="id"
          data-testid="ui-kit-popover"
          v-bind="inherited_context"
          class="ui-kit-popover"
          :class="[
            `ui-kit-popover--${side}`,
            {
              'ui-kit-popover--shadow': shadow,
              'ui-kit-popover--open': open,
              'ui-kit-popover--teleported': teleport
            }
          ]"
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
    </Teleport>
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
.ui-kit-popover-container--hover .ui-kit-popover:hover,
.ui-kit-popover--open {
  display: block;
}

/* In place, z-60 competes inside whatever ancestor owns the stacking context.
   Teleporting to <body> takes the popover out of that ancestor entirely, so it
   is compared against the body-level overlay sections in index.html instead —
   and a popover opened from inside a modal lands under the modal container
   (z-100) that its own trigger lives in. On the body it joins that same layer:
   appended after the static sections, it paints above the modal, while the
   notice panel (z-101) and tooltips (z-102) still win over it. */
.ui-kit-popover--teleported {
  z-index: 100;
}

/* This box is a transparent positioning wrapper — the background and the corner
   radius that a shadow has to trace both live on the slotted panel, whose radius
   is the caller's choice and is not `--radius-7`. So the shadow is a
   `drop-shadow`, which follows the alpha shape of whatever the slot actually
   paints, rather than a `box-shadow` tracing this wrapper's own rectangle. It
   covers the arrow in the same pass — the arrow pokes out past the panel's edge
   and is part of that silhouette, so it needs no rule of its own.
   A panel that already casts its own shadow (`bevel-drop-*`) must not also ask
   for `shadow`: the two compound into one shadow at twice the offset. */
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
  background-color: var(--popover-arrow-color, var(--color-surface));
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
