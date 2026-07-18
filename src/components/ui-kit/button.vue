<script setup lang="ts">
import { computed, useSlots } from 'vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiTooltip from '@/components/ui-kit/tooltip.vue'
import { useStagedTap } from '@/composables/ui/staged-tap'
import type { SfxOptions } from '@/sfx/directive'
import { TYPE_SFX } from '@/sfx/config'

defineOptions({ inheritAttrs: false })

export type ButtonProps = {
  size?: 'xl' | 'lg' | 'base' | 'sm'
  // `inline` is ghost with the surrounding text's metrics and no trailing
  // padding — for a dropdown sitting inside a sentence.
  variant?: 'solid' | 'outline' | 'ghost' | 'inline'
  inverted?: boolean
  iconOnly?: boolean
  roundedFull?: boolean
  iconRight?: string
  iconLeft?: string
  fancyHover?: boolean
  active?: boolean
  loading?: boolean
  sfx?: SfxOptions
  fullWidth?: boolean
  // Touch-only tap feedback: on coarse pointers the click is deferred a beat to
  // play the tap (desktop passes straight through). On by default.
  playOnTap?: boolean
  // With playOnTap, run the full scale/rotate tap bounce. Off by default, so the
  // tap shows only the quiet bgx-slide sweep + sfx; set true to restore the bounce.
  tapAnimate?: boolean
  // Inert + muted label region. The trailing slot (a split-button caret) stays
  // live, so only the primary action is disabled — not the whole control.
  disabled?: boolean
  // Keep the muted disabled styling but still let clicks reach the handler —
  // used to surface a validation error when the user clicks a blocked action.
  clickWhenDisabled?: boolean
}

const {
  size = 'base',
  variant = 'solid',
  iconOnly = false,
  iconRight,
  iconLeft,
  fancyHover = true,
  active = false,
  sfx = {},
  fullWidth = false,
  playOnTap = true,
  tapAnimate = false,
  disabled = false,
  clickWhenDisabled = false
} = defineProps<ButtonProps>()

// The button owns its action: consumers listen on @press, not native @click, so
// staged-tap can defer the action a beat on touch without fighting a native
// click. (That coexistence was the reason for the old capture-phase handler.)
const emit = defineEmits<{ press: [e: MouseEvent] }>()

const slots = useSlots()

const { playing, tap } = useStagedTap({ animate: tapAnimate ? 'pop' : 'quiet' })

// Only hover/focus/blur reach v-sfx — press-phase sounds are routed through
// staged-tap in onClick so they fire at the correct phase for each pointer.
const merged_sfx = computed<SfxOptions>(() => {
  if (disabled) return {}
  return {
    hover: sfx.hover ?? TYPE_SFX,
    focus: sfx.focus,
    blur: sfx.blur,
    debounce: sfx.debounce
  }
})

// Solid and outline paint a surface the hover stripes can sweep across; the
// transparent variants have nothing behind the content to sweep.
const has_surface = computed(() => variant === 'solid' || variant === 'outline')

const tooltip_active = computed(() => iconOnly && !!slots.default)

const has_trailing = computed(() => !!slots.trailing)

function onClick(e: MouseEvent) {
  // The trailing slot (e.g. a split-button caret) owns its own action — clicks
  // there don't fire the primary press, and aren't blocked when only the primary
  // action is disabled.
  if ((e.target as HTMLElement).closest?.('.btn-trailing')) return

  if (disabled) {
    // clickWhenDisabled still surfaces the press (e.g. to flag a validation
    // error); otherwise a disabled button emits nothing and blocks the default.
    if (clickWhenDisabled) emit('press', e)
    else e.preventDefault()
    return
  }

  if (!playOnTap) {
    emit('press', e)
    return
  }

  tap((ev) => emit('press', ev), {
    preAudio: sfx.tap_pre,
    audio: sfx.press,
    audioOpts: {
      debounce: sfx.debounce
    },
    postAudio: sfx.tap_post
  })(e)
}
</script>

<template>
  <ui-tooltip
    element="button"
    :gap="-6"
    :suppress="!tooltip_active"
    data-testid="ui-kit-button"
    class="ui-kit-btn group/btn"
    v-sfx="merged_sfx"
    v-bind="$attrs"
    :data-active="playing || active || null"
    :aria-disabled="disabled || undefined"
    @click="onClick"
    :class="[
      `ui-kit-btn--${size}`,
      `ui-kit-btn--${variant}`,
      {
        'ui-kit-btn--icon-only': iconOnly,
        'ui-kit-btn--inverted': inverted,
        'ui-kit-btn--split': has_trailing,
        'ui-kit-btn--quiet-tap': playOnTap && !tapAnimate,
        'ui-kit-btn--disabled': disabled,
        // Ghost is transparent at rest; fill it behind the content while the
        // coarse quiet tap sweeps, so the bgx reads against a surface.
        'data-[active=true]:bg-(--theme-primary)': variant === 'ghost' && !disabled,
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
        'group-hover/btn:block group-data-[active=true]/btn:block':
          !loading && !disabled && fancyHover && has_surface,
        'bgx-color-[var(--theme-neutral)]': variant === 'solid',
        'bgx-color-[var(--theme-on-neutral)]': inverted,
        // Ghost has no surface, so only the coarse quiet tap sweeps it (the
        // theme-primary fill is added to the button root, behind the content).
        'group-data-[active=true]/btn:block bgx-color-[var(--theme-neutral)]':
          !loading && !disabled && variant === 'ghost'
      }"
    >
      <ui-icon v-if="loading" src="loading-dots" class="h-12 w-12 text-(--btn-text-color)" />
    </div>

    <template v-if="tooltip_active" #tooltip>
      <slot></slot>
    </template>
  </ui-tooltip>
</template>

<style>
/* Registers the padding/gap/icon-size custom properties as typed lengths so
   Safari resolves them before its intrinsic-size (grid/flex auto-track)
   measurement pass instead of only after final layout — without this, an
   icon-only button's measured width can come out narrower than its painted
   width, letting it visually overflow a grid `auto` column sized from that
   measurement. `--btn-padding` allows 1+ lengths since icon-only buttons
   override it to a single value where non-icon-only buttons use the x/y pair.
   `--btn-height` is deliberately NOT registered — this file's own
   `height: var(--btn-height, max-content)` relies on the property being
   genuinely unset when no size class applies; an `initial-value` would make
   it always "set" and silently break that fallback. (dropdown-button/
   caret.vue's `var(--icon-size, 20px)` looked like the same risk, but it
   always applies its own `ui-kit-btn-tokens--*` class locally, so --icon-size
   is never actually left unset there — safe to register.) */
@property --btn-padding {
  syntax: '<length>+';
  inherits: true;
  initial-value: 0px;
}
@property --btn-padding-x {
  syntax: '<length>';
  inherits: true;
  initial-value: 0px;
}
@property --btn-padding-y {
  syntax: '<length>';
  inherits: true;
  initial-value: 0px;
}
@property --btn-gap {
  syntax: '<length>';
  inherits: true;
  initial-value: 0px;
}
@property --icon-size {
  syntax: '<length>';
  inherits: true;
  initial-value: 16px;
}

/* Base button styles */
.ui-kit-btn {
  position: relative;

  /* Composed from the per-size x/y so the menu can reach each axis; icon-only
     overrides --btn-padding directly with a single square value. */
  --btn-padding: var(--btn-padding-y) var(--btn-padding-x);

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
  cursor: default;
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
   rule never shows). Text reads in --theme-primary since it sits directly on
   the page/surface, not on a --theme-primary-colored fill like solid does.
   Keeps the standard size padding. */
.ui-kit-btn--ghost {
  --btn-bg-color: transparent;
  --btn-text-color: var(--theme-primary);
  --btn-outline-color: transparent;
}

/* Inline: ghost that sits *in* a line of text rather than beside it. Takes the
   surrounding font metrics instead of the size class's, drops the fixed
   --btn-height so it never grows the line box, and zeroes the padding so the
   button occupies exactly its text. Composers that need breathing room add it
   themselves — the primitive can't know what it's sitting next to. */
.ui-kit-btn--inline {
  --btn-bg-color: transparent;
  --btn-text-color: var(--theme-primary);
  --btn-outline-color: transparent;
  --btn-padding: 0;
  --icon-size: 1.25em;

  font-size: inherit;
  line-height: inherit;
  height: max-content;
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
  /* Width should equal --btn-height (a square button) — expressed as an
     explicit value rather than relying on `aspect-ratio` to transfer size
     onto `width: max-content`. Safari's grid/flex auto-track intrinsic-size
     measurement doesn't apply that transfer (even though its final layout
     paint does), so a track sized from the un-transferred measurement comes
     out too narrow and the button visually overflows it. */
  width: var(--btn-height);
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
  --btn-padding-y: 14px;
  --btn-padding-x: 24px;
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
  --btn-padding-y: 10px;
  --btn-padding-x: 20px;
  --btn-height: 45px;
  --icon-size: 20px;

  &.ui-kit-btn--icon-only {
    --btn-padding: 10px;
  }
}
.ui-kit-btn.ui-kit-btn--base,
.ui-kit-btn-tokens--base {
  --btn-font-size: var(--text-base);
  --btn-font-size--line-height: var(--text-base--line-height);
  --btn-border-radius: 18px;
  --btn-gap: 8px;
  --btn-padding-y: 6px;
  --btn-padding-x: 14px;
  --btn-height: 40px;
  --icon-size: 18px;

  &.ui-kit-btn--icon-only {
    --btn-padding: 8px;
  }
}
.ui-kit-btn.ui-kit-btn--sm,
.ui-kit-btn-tokens--sm {
  --btn-font-size: var(--text-base);
  --btn-font-size--line-height: var(--text-base--line-height);
  --btn-border-radius: 13px;
  --btn-gap: 8px;
  --btn-padding-y: 4px;
  --btn-padding-x: 12px;
  --icon-size: 16px;
  --btn-height: 30px;

  &.ui-kit-btn--icon-only {
    --btn-padding: 7px;
  }
}

.ui-kit-btn:focus-visible {
  --btn-outline-width: 2px;
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

.ui-kit-btn[data-active] {
  --btn-outline-width: 2px;
}
.ui-kit-btn[data-active] .btn-icon.btn-icon--left {
  transform: scale(1.3) rotate(-5deg);
}
.ui-kit-btn[data-active] .btn-icon.btn-icon--right {
  transform: scale(1.3) rotate(5deg);
}

/* Ghost fills its background solid with --theme-primary while active (see
   `data-[active=true]:bg-(--theme-primary)` below) — flip text to
   --theme-on-primary so it stays legible against that fill. */
.ui-kit-btn--ghost[data-active] {
  --btn-text-color: var(--theme-on-primary);
}

/* Quiet tap: the bgx sweep still plays via [data-active], but the icon holds
   still — no scale/rotate on tap. Hover keeps its own nudge. */
.ui-kit-btn--quiet-tap[data-active] .btn-icon {
  transform: none;
}

/* Expanded tap zone on coarse (touch) pointers. The pseudo-element is
   transparent but occupies the extra hit area outside the visible button. */
@media (pointer: coarse) {
  .ui-kit-btn::before {
    content: '';
    position: absolute;
    inset: var(--btn-tap-inset, -8px);
    border-radius: calc(var(--btn-border-radius) + 8px);
  }
}
</style>
