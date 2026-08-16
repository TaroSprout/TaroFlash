<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { MODES, STATIONS, type Mode, type RoleName, type StationName } from './catalog'
import RoleEditor from './role-editor.vue'
import RoleSpecimen from './role-specimen.vue'
import TunerToolbar from './tuner-toolbar.vue'
import { windowLayoutKey } from '@/components/layout-kit/paged-window/layout'
import UiPopover from '@/components/ui-kit/popover.vue'
import { emitSfx } from '@/sfx/bus'

type PickedRole = {
  mode: Mode
  station: StationName
  role: RoleName
  rect: DOMRect
  /** The picked region, handed to the popover so a re-click on it never reads as an outside click. */
  el: HTMLElement
}

const layout = inject(windowLayoutKey, undefined)

const picked = ref<PickedRole | null>(null)

const columns = computed(() => (layout?.value === 'phone' ? 'grid-cols-2' : 'grid-cols-4'))

function activeRole(mode: Mode, station: StationName): RoleName | null {
  const open = picked.value
  return open && open.mode === mode && open.station === station ? open.role : null
}

// Every path out of the editor lands here, so the close sound is emitted once, in the one place the
// popover actually shuts — an outside click, a re-click on the open region, or Esc.
function onClose() {
  if (picked.value) emitSfx('snappy_button_5')
  picked.value = null
}

function onPick(mode: Mode, station: StationName, role: RoleName, el: HTMLElement) {
  if (picked.value?.el === el) return onClose()

  emitSfx('snappy_button_5')
  picked.value = { mode, station, role, rect: el.getBoundingClientRect(), el }
}
</script>

<template>
  <div data-testid="roles-page" class="flex flex-col gap-4">
    <tuner-toolbar />

    <div data-testid="roles-page__grid" class="grid gap-3 pb-6" :class="columns">
      <template v-for="mode in MODES" :key="mode">
        <role-specimen
          v-for="station in STATIONS"
          :key="`${mode}-${station}`"
          :mode="mode"
          :station="station"
          :active_role="activeRole(mode, station)"
          @pick="(role, el) => onPick(mode, station, role, el)"
        />
      </template>
    </div>

    <ui-popover
      :open="!!picked"
      :anchor_rect="picked?.rect ?? null"
      :anchor_el="picked?.el ?? null"
      position="right"
      :use_arrow="false"
      shadow
      teleport
      @close="onClose"
    >
      <role-editor
        v-if="picked"
        :mode="picked.mode"
        :station="picked.station"
        :role="picked.role"
      />
    </ui-popover>
  </div>
</template>
