<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Mode, RoleName, StationName } from './catalog'
import { injectColorTuner } from './use-color-tuner'
import UiButton from '@/components/ui-kit/button.vue'
import UiSelectMenu from '@/components/ui-kit/select-menu.vue'

type RoleEditorProps = {
  mode: Mode
  station: StationName
  role: RoleName
}

const { mode, station, role } = defineProps<RoleEditorProps>()

const { t } = useI18n()
const tuner = injectColorTuner()

const reading = computed(() => tuner.readRole(mode, station, role))

const shade_options = computed(() =>
  tuner.neutral_shades.value.map((shade) => ({ value: shade.id, label: shade.name }))
)

const bound_id = computed({
  get: () => tuner.roleId(mode, station, role) ?? '',
  set: (id: string) => tuner.setRole(mode, station, role, id || null)
})

const ratio_text = computed(() =>
  reading.value.ratio === null ? '—' : `${reading.value.ratio.toFixed(2)}:1`
)

const lc_text = computed(() => (reading.value.lc === null ? '—' : `${reading.value.lc}`))

const delta_text = computed(() =>
  reading.value.delta_l === null ? '—' : reading.value.delta_l.toFixed(3)
)
</script>

<template>
  <section
    data-testid="role-editor"
    data-station="float"
    class="flex w-84 flex-col gap-3 rounded-4 bg-surface p-4"
  >
    <header data-testid="role-editor__header" class="flex flex-col gap-0.5">
      <h2 class="text-lg text-ink">{{ role }}</h2>
      <p class="text-base text-ink-muted">{{ station }} · {{ mode }}</p>
    </header>

    <div data-testid="role-editor__binding" class="flex items-center gap-2">
      <span
        data-testid="role-editor__swatch"
        class="size-8 shrink-0 rounded-2_5 border border-line"
        :style="{ backgroundColor: tuner.hexOf(reading.shade) ?? 'transparent' }"
      ></span>
      <ui-select-menu class="flex-1" size="sm" :options="shade_options" v-model="bound_id" />
    </div>

    <dl data-testid="role-editor__readings" class="grid grid-cols-2 gap-x-3 gap-y-1">
      <dt class="text-base text-ink-muted">WCAG 2</dt>
      <dd
        data-testid="role-editor__wcag"
        class="text-base tabular-nums"
        :data-flagged="reading.flagged"
        :data-palette="reading.flagged ? 'danger' : undefined"
        :class="reading.flagged ? 'text-(--color-accent-text)' : 'text-ink'"
      >
        {{ ratio_text }}<span v-if="reading.floor"> / {{ reading.floor }}</span>
      </dd>

      <dt class="text-base text-ink-muted">APCA Lc</dt>
      <dd data-testid="role-editor__apca" class="text-base text-ink tabular-nums">{{ lc_text }}</dd>

      <dt class="text-base text-ink-muted">ΔL</dt>
      <dd data-testid="role-editor__delta-l" class="text-base text-ink tabular-nums">
        {{ delta_text }}
      </dd>
    </dl>

    <div data-testid="role-editor__nudge" class="flex flex-col gap-2">
      <div class="flex gap-2">
        <ui-button
          v-if="reading.lighter"
          data-testid="role-editor__lighter"
          size="sm"
          neutral
          full-width
          @press="tuner.nudgeRole(mode, station, role, -1)"
        >
          {{ t('admin.roles-page.lighter-button') }}
        </ui-button>

        <ui-button
          v-else
          data-testid="role-editor__mint-lighter"
          size="sm"
          neutral
          full-width
          icon-left="add"
          :disabled="!reading.shade"
          @press="tuner.mintBeyond(mode, station, role, -1)"
        >
          {{ t('admin.roles-page.mint-lighter-button') }}
        </ui-button>

        <ui-button
          v-if="reading.darker"
          data-testid="role-editor__darker"
          size="sm"
          neutral
          full-width
          @press="tuner.nudgeRole(mode, station, role, 1)"
        >
          {{ t('admin.roles-page.darker-button') }}
        </ui-button>

        <ui-button
          v-else
          data-testid="role-editor__mint-darker"
          size="sm"
          neutral
          full-width
          icon-left="add"
          :disabled="!reading.shade"
          @press="tuner.mintBeyond(mode, station, role, 1)"
        >
          {{ t('admin.roles-page.mint-darker-button') }}
        </ui-button>
      </div>

      <p
        v-if="!reading.lighter || !reading.darker"
        data-testid="role-editor__mint-notice"
        class="text-base text-ink-muted"
      >
        {{ t('admin.roles-page.mint-notice') }}
      </p>
    </div>
  </section>
</template>
