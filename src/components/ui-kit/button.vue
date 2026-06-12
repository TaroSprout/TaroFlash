<script setup lang="ts">
import { computed, useAttrs, useSlots } from 'vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiTooltip from '@/components/ui-kit/tooltip.vue'
import { usePlayOnTap } from '@/composables/use-play-on-tap'
import { emitSfx } from '@/sfx/bus'
import type { SfxOptions } from '@/sfx/directive'

defineOptions({ inheritAttrs: false })

export type ButtonProps = {
  size?: 'xl' | 'lg' | 'base' | 'sm'
  variant?: 'solid' | 'outline' | 'ghost'
  inverted?: boolean
  iconOnly?: boolean
  roundedFull?: boolean
  iconRight?: string
  iconLeft?: string
  fancyHover?: boolean
  loading?: boolean
  sfx?: SfxOptions
  fullWidth?: boolean
  mobileTooltip?: boolean
  playOnTap?: boolean
  // With playOnTap, drop the scale/rotate tween so the tap shows only the
  // bgx-slide sweep + sfx. Defaults to true (the full tap bounce).
  tapAnimate?: boolean
  // Inert + muted label region. The trailing slot (a split-button caret) stays
  // live, so only the primary action is disabled — not the whole control.
  disabled?: boolean
}

const {
  size = 'base',
  variant = 'solid',
  iconOnly = false,
  iconRight,
  iconLeft,
  fancyHover = true,
  sfx = {},
  fullWidth = false,
  mobileTooltip = false,
  playOnTap = false,
  tapAnimate = true,
  disabled = false
} = defineProps<ButtonProps>()

const slots = useSlots()
const attrs = useAttrs()

const { playing, interceptClick } = usePlayOnTap({ reset: false, animate: tapAnimate })

const merged_sfx = computed<SfxOptions>(() => {
  if (disabled) return {}
  return {
    ...sfx,
    hover: sfx.hover ?? 'ui.click_07'
  }
})

const tooltip_active = computed(() => iconOnly && !!slots.default)

const has_trailing = computed(() => !!slots.trailing)

function onCaptureClick(e: MouseEvent) {
  // The trailing slot (e.g. a split-button caret) is its own action — a click
  // there shouldn't fire the main button's tap animation, nor be blocked when
  // only the primary action is disabled.
  const in_trailing = !!(e.target as HTMLElement).closest?.('.btn-trailing')

  if (disabled && !in_trailing) {
    e.stopImmediatePropagation()
    e.preventDefault()
    return
  }

  if (!playOnTap || in_trailing) return
  const handler = attrs.onClick as ((ev: MouseEvent) => void) | undefined
  if (!handler) return

  interceptClick(e, {
    beforePlay: emitClickSfx,
    onAfter: handler
  })
}

function emitClickSfx() {
  const click_sfx = merged_sfx.value.click
  if (!click_sfx) return
  emitSfx(click_sfx, {
    debounce: merged_sfx.value.debounce,
    blocking: merged_sfx.value.click_blocking
  })
}
</script>

<template>
  <ui-tooltip
    element="button"
    :gap="-6"
    :suppress="!tooltip_active"
    :static_on_mobile="mobileTooltip"
    data-testid="ui-kit-button"
    class="ui-kit-btn group/btn"
    v-sfx="merged_sfx"
    v-bind="$attrs"
    :data-playing="playing || null"
    :aria-disabled="disabled || undefined"
    @click.capture="onCaptureClick"
    :class="[
      `ui-kit-btn--${size}`,
      `ui-kit-btn--${variant}`,
      {
        'ui-kit-btn--icon-only': iconOnly,
        'ui-kit-btn--inverted': inverted,
        'ui-kit-btn--split': has_trailing,
        'ui-kit-btn--quiet-tap': playOnTap && !tapAnimate,
        'ui-kit-btn--disabled': disabled,
        'rounded-full!': roundedFull,
        'w-full!': fullWidth
      }
    ]"
  >
    <div class="btn-content" data-testid="ui-kit-button__content">
      <ui-icon v-if="iconLeft" class="btn-icon btn-icon--left" :src="iconLeft" />
      <div v-if="!iconOnly" class="btn-label">
        <slot></slot>
      </div>
      <ui-icon v-if="iconRight" class="btn-icon btn-icon--right" :src="iconRight" />
    </div>

    <div v-if="has_trailing" class="btn-trailing" data-testid="ui-kit-button__trailing">
      <slot name="trailing"></slot>
    </div>

    <div
      class="absolute inset-0 bgx-diagonal-stripes animation-safe:bgx-slide rounded-(--btn-border-radius) pointer-events-none"
      :class="{
        'bg-(--theme-primary) flex items-center justify-center': loading,
        hidden: !loading,
        'group-hover/btn:block group-data-[playing=true]/btn:block':
          !loading && !disabled && fancyHover && variant !== 'ghost',
        'bgx-color-[var(--theme-neutral)]': variant === 'solid',
        'bgx-color-[var(--theme-on-neutral)]': inverted
      }"
    >
      <ui-icon v-if="loading" src="loading-dots" class="h-12 w-12" />
    </div>

    <template v-if="tooltip_active" #tooltip>
      <slot></slot>
    </template>
  </ui-tooltip>
</template>

<style>
/* Base button styles */
.ui-kit-btn {
  position: relative;

  background-color: var(--btn-bg-color);
  color: var(--btn-text-color);
  font-size: var(--btn-font-size);
  line-height: var(--btn-font-size--line-height);

  outline: var(--btn-outline-width, 0) solid var(--btn-outline-color);
  border-radius: var(--btn-border-radius);
  height: var(--btn-height, max-content);
  width: max-content;

  flex-grow: 0;

  display: flex;
  align-items: stretch;
  user-select: none;
  cursor: pointer;
  /* Suppress the double-tap-to-zoom gesture so a quick double tap fires two
     clicks instead of zooming the page. */
  touch-action: manipulation;
}

/* Disabled mutes + inerts only the primary label region; a split-button's
   trailing caret stays fully live and lit. */
.ui-kit-btn--disabled {
  cursor: not-allowed;
}

.ui-kit-btn--disabled .btn-content {
  opacity: 0.5;
}

/* Inner container carries the padding + gap so the trailing slot can sit flush
   in the raw, unpadded button and style itself freely. */
.ui-kit-btn .btn-content {
  flex: 1;

  display: flex;
  gap: var(--btn-gap);
  align-items: center;
  justify-content: center;

  padding: var(--btn-padding);
}

.ui-kit-btn--solid {
  --btn-bg-color: var(--theme-primary);
  --btn-text-color: var(--theme-on-primary);
  --btn-outline-color: var(--theme-primary);
}

.ui-kit-btn--outline {
  --btn-bg-color: transparent;
  --btn-text-color: var(--theme-on-primary);
  --btn-outline-width: 2px;
  --btn-outline-color: var(--theme-on-primary);
}

/* Ghost: no background, no outline (transparent so the global hover-outline
   rule never shows). Keeps the standard size padding. */
.ui-kit-btn--ghost {
  --btn-bg-color: transparent;
  --btn-text-color: var(--theme-on-primary);
  --btn-outline-color: transparent;
}

.ui-kit-btn--solid.ui-kit-btn--inverted {
  --btn-bg-color: var(--theme-neutral);
  --btn-text-color: var(--theme-primary);
  --btn-outline-color: var(--theme-primary);
}

.ui-kit-btn--outline.ui-kit-btn--inverted {
  --btn-bg-color: transparent;
  --btn-text-color: var(--theme-neutral);
  --btn-outline-width: 2px;
  --btn-outline-color: var(--theme-neutral);

  @media (hover: hover) {
    &:hover {
      --btn-bg-color: var(--theme-neutral);
      --btn-text-color: var(--theme-primary);
    }
  }
}

.ui-kit-btn .btn-icon {
  height: 100%;
  max-height: 100%;
  max-width: 100%;
  height: var(--icon-size);
  width: var(--icon-size);
}

.ui-kit-btn.ui-kit-btn--icon-only {
  --btn-padding: 8px;
  --btn-border-radius: var(--radius-4);
  aspect-ratio: 1/1;
}

.ui-kit-btn .btn-trailing {
  display: flex;
}
.ui-kit-btn--split .btn-content {
  justify-content: flex-start;
}

/* Button sizes — the `-tokens-` alias exposes the same custom properties to
   non-button elements (e.g. the dropdown-button menu) without the base layout. */
.ui-kit-btn.ui-kit-btn--xl,
.ui-kit-btn-tokens--xl {
  --btn-font-size: var(--text-xl);
  --btn-font-size--line-height: var(--text-xl--line-height);
  --btn-border-radius: 22.5px;
  --btn-gap: 10px;
  --btn-padding: 14px 24px;
  --btn-height: 50px;
  --icon-size: 18px;

  &.ui-kit-btn--icon-only {
    --btn-padding: 14px;
  }
}
.ui-kit-btn.ui-kit-btn--lg,
.ui-kit-btn-tokens--lg {
  --btn-font-size: var(--text-xl);
  --btn-font-size--line-height: var(--text-xl--line-height);
  --btn-border-radius: 19px;
  --btn-gap: 6px;
  --btn-padding: 10px 20px;
  --btn-height: 45px;
  --icon-size: 20px;

  &.ui-kit-btn--icon-only {
    --btn-padding: 10px;
  }
}
.ui-kit-btn.ui-kit-btn--base,
.ui-kit-btn-tokens--base {
  --btn-font-size: var(--text-lg);
  --btn-font-size--line-height: var(--text-lg--line-height);
  --btn-border-radius: 18px;
  --btn-gap: 8px;
  --btn-padding: 6px 14px;
  --btn-height: 40px;
  --icon-size: 18px;
  --btn-height: 40px;

  &.ui-kit-btn--icon-only {
    --btn-padding: 8px;
  }
}
.ui-kit-btn.ui-kit-btn--sm,
.ui-kit-btn-tokens--sm {
  --btn-font-size: var(--text-base);
  --btn-font-size--line-height: var(--text-base--line-height);
  --btn-border-radius: 13px;
  --btn-gap: 3px;
  --btn-padding: 4px 12px;
  --icon-size: 16px;
  --btn-height: 30px;

  &.ui-kit-btn--icon-only {
    --btn-padding: 7px;
  }
}

@media (hover: hover) {
  .ui-kit-btn:hover {
    --btn-outline-width: 2px;
  }
  .ui-kit-btn:hover .btn-icon.btn-icon--left {
    transform: scale(1.3) rotate(-5deg);
  }
  .ui-kit-btn:hover .btn-icon.btn-icon--right {
    transform: scale(1.3) rotate(5deg);
  }
}

.ui-kit-btn[data-playing] {
  --btn-outline-width: 2px;
}
.ui-kit-btn[data-playing] .btn-icon.btn-icon--left {
  transform: scale(1.3) rotate(-5deg);
}
.ui-kit-btn[data-playing] .btn-icon.btn-icon--right {
  transform: scale(1.3) rotate(5deg);
}

/* Quiet tap: the bgx sweep still plays via [data-playing], but the icon holds
   still — no scale/rotate on tap. Hover keeps its own nudge. */
.ui-kit-btn--quiet-tap[data-playing] .btn-icon {
  transform: none;
}
</style>
