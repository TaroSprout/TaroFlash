<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import { autoUpdate } from '@floating-ui/vue'
import type { Mode, RoleName, StationName } from './catalog'
import { injectColorTuner } from './use-color-tuner'

type RoleSpecimenProps = {
  mode: Mode
  station: StationName
  active_role: RoleName | null
}

type Region = {
  role: RoleName
  /** A fill paints its own box; a glyph paints text sitting on the surface behind it. */
  kind: 'fill' | 'glyph'
  box: string
  glyph?: string
}

const { mode, station, active_role } = defineProps<RoleSpecimenProps>()

const emit = defineEmits<{
  (e: 'pick', role: RoleName, el: HTMLElement): void
}>()

const tuner = injectColorTuner()

// The ten roles laid out as one shape, each in the geometry it is actually used in: the line framing
// the whole surface the way it edges a panel in practice, the well sitting flush on that surface, the
// raised block edged by its own lit and shaded bands, the two ink weights on bare surface, the sheen
// inside the skeleton bar it sweeps. Order is paint order — a region listed later sits on top of the
// one it borders, so `line` fills the outer rect and `surface` covers all but its 4px edge.
const REGIONS: Region[] = [
  { role: 'line', kind: 'fill', box: 'inset-0 rounded-4' },
  { role: 'surface', kind: 'fill', box: 'inset-1 rounded-3' },
  { role: 'ink', kind: 'glyph', box: 'top-3 left-3 h-6', glyph: 'Aa' },
  { role: 'ink-muted', kind: 'glyph', box: 'top-3 right-3 h-6', glyph: 'aa' },
  { role: 'well', kind: 'fill', box: 'top-11 left-3 right-3 h-19 rounded-2_5' },
  { role: 'raised', kind: 'fill', box: 'top-33 left-3 right-3 h-18 rounded-2_5' },
  { role: 'raised-tint', kind: 'fill', box: 'top-33 left-3 right-3 h-2 rounded-t-2_5' },
  { role: 'raised-shade', kind: 'fill', box: 'top-49 left-3 right-3 h-2 rounded-b-2_5' },
  { role: 'skeleton', kind: 'fill', box: 'top-54 left-3 right-3 h-6 rounded-full' },
  { role: 'skeleton-sheen', kind: 'fill', box: 'top-54 left-10 w-12 h-6' }
]

// The badge teleports to <body> so it can sit above the specimen's `overflow-hidden` glyph box
// instead of being clipped by it — a region near the box's edge would otherwise cut the badge off.
// Position tracks the hovered/focused region's element directly rather than through CSS, since a
// teleported node is no longer a DOM descendant the region could reach with `group-hover`.
const badge_role = ref<RoleName | null>(null)
const badge_target = ref<HTMLElement | null>(null)
const badgeRef = useTemplateRef<HTMLElement>('role-specimen-badge')
const badge_style = ref<Record<string, string>>({})

const surface_hex = computed(() => tuner.hexOf(tuner.paintShade(mode, station, 'surface')))

let stop_auto_update: (() => void) | null = null

onBeforeUnmount(() => stop_auto_update?.())

function hexOf(role: RoleName): string {
  return tuner.hexOf(tuner.paintShade(mode, station, role)) ?? 'transparent'
}

function isFlagged(role: RoleName): boolean {
  return tuner.readRole(mode, station, role).flagged
}

function styleOf(region: Region): Record<string, string> {
  return region.kind === 'fill'
    ? { backgroundColor: hexOf(region.role) }
    : { color: hexOf(region.role) }
}

// The region element itself goes up, not just its rect: the popover needs it to tell a re-click on
// the open region apart from a click outside, and derives the rect from it.
function onPick(role: RoleName, event: MouseEvent) {
  emit('pick', role, event.currentTarget as HTMLElement)
}

function onRegionEnter(role: RoleName, event: Event) {
  badge_role.value = role
  badge_target.value = event.currentTarget as HTMLElement
}

function onRegionLeave() {
  badge_role.value = null
  badge_target.value = null
}

function updateBadgePosition() {
  const target = badge_target.value
  if (!target) return

  const rect = target.getBoundingClientRect()
  // The badge sits on <body> now, so its former in-flow anchor is recomputed in viewport coordinates.
  badge_style.value = {
    top: `${rect.top - 8}px`,
    right: `${window.innerWidth - rect.right - 8}px`
  }
}

watch(
  () => ({ target: badge_target.value, badge: badgeRef.value }),
  ({ target, badge }) => {
    stop_auto_update?.()
    stop_auto_update = null
    if (target && badge) {
      stop_auto_update = autoUpdate(target, badge, updateBadgePosition)
    }
  },
  { flush: 'post' }
)
</script>

<template>
  <figure data-testid="role-specimen" class="flex flex-col gap-1.5">
    <figcaption data-testid="role-specimen__caption" class="text-base text-ink-muted">
      {{ station }} · {{ mode }}
    </figcaption>

    <div
      data-testid="role-specimen__glyph"
      class="relative h-66 w-full overflow-hidden rounded-4"
      :style="{ backgroundColor: surface_hex ?? 'transparent' }"
    >
      <button
        v-for="region in REGIONS"
        :key="region.role"
        type="button"
        data-testid="role-specimen__region"
        :data-role="region.role"
        :data-active="region.role === active_role"
        :data-flagged="isFlagged(region.role)"
        :aria-label="region.role"
        v-sfx="{ hover: 'ui.hover' }"
        class="absolute cursor-pointer data-[active=true]:outline-2 data-[active=true]:outline-(--color-accent) hover:outline-2 hover:outline-(--color-accent)"
        :class="[region.box, region.kind === 'glyph' && 'flex items-center text-lg leading-none']"
        :style="styleOf(region)"
        @click="onPick(region.role, $event)"
        @pointerenter="onRegionEnter(region.role, $event)"
        @pointerleave="onRegionLeave"
        @focusin="onRegionEnter(region.role, $event)"
        @focusout="onRegionLeave"
      >
        {{ region.glyph }}
      </button>
    </div>

    <Teleport v-if="badge_role" to="body">
      <span
        ref="role-specimen-badge"
        data-testid="role-specimen__region-badge"
        class="fixed z-102 rounded-2 bg-knockout px-1.5 py-0.5 text-xs text-(--color-accent-text) pointer-events-none"
        :style="badge_style"
      >
        {{ badge_role }}
      </span>
    </Teleport>
  </figure>
</template>
