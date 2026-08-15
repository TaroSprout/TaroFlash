<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ROLE_NAMES, type Mode, type RoleName, type StationName } from './catalog'
import { injectColorTuner } from './use-color-tuner'
import UiIcon from '@/components/ui-kit/icon.vue'

type RolePanelProps = {
  mode: Mode
  station: StationName
}

const NEW_SHADE = '__new__'

const { mode, station } = defineProps<RolePanelProps>()

const emit = defineEmits<{ (e: 'close'): void }>()

const { t } = useI18n()
const tuner = injectColorTuner()

const rows = computed(() => ROLE_NAMES.map((role) => tuner.readRole(mode, station, role)))

function onPick(role: RoleName, event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (value === NEW_SHADE) return addAndPoint(role)

  tuner.setRole(mode, station, role, value === '' ? null : value)
}

// The new shade and the role that now points at it are one gesture, so they bank as one change to
// undo rather than leaving a stray shade behind after a single undo.
function addAndPoint(role: RoleName) {
  const current = tuner.readRole(mode, station, role).shade
  const family = current?.family ?? tuner.family_names.value[0]
  if (!family) return

  tuner.beginRun({ key: 'admin.color-page.change.add-and-point', params: { role } })
  const shade = tuner.addShade(family, current ? { ...current.hsl } : { h: 0, s: 0, l: 50 })
  tuner.setRole(mode, station, role, shade.id)
  tuner.endRun()
}

function ratioText(ratio: number | null): string {
  return ratio === null ? '—' : `${ratio.toFixed(2)}:1`
}
</script>

<template>
  <div
    data-testid="role-panel"
    data-station="float"
    class="flex w-88 flex-col gap-2 rounded-4 bg-surface p-3 shadow-[0_12px_32px_var(--shadow-color)]"
  >
    <header data-testid="role-panel__header" class="flex items-center gap-2 text-base text-ink">
      <h4 class="font-semibold">
        {{
          t('admin.color-page.role-panel.title', {
            station,
            mode: t(`admin.color-page.mode.${mode}`)
          })
        }}
      </h4>

      <button
        type="button"
        data-testid="role-panel__close"
        :aria-label="t('admin.color-page.role-panel.close-label')"
        class="ml-auto cursor-pointer text-ink-muted"
        @click="emit('close')"
      >
        <ui-icon src="close" class="h-4 w-4" />
      </button>
    </header>

    <ul data-testid="role-panel__rows" class="flex flex-col gap-1.5">
      <li
        v-for="row in rows"
        :key="row.role"
        :data-testid="`role-panel__row--${row.role}`"
        :data-flagged="row.flagged"
        class="flex flex-col gap-0.5 rounded-2 bg-well p-1.5 text-base text-ink"
      >
        <div class="flex items-center gap-2">
          <span class="font-semibold">{{ row.role }}</span>

          <span class="text-ink-muted truncate">
            {{ row.shade?.name ?? t('admin.color-page.role-panel.unanswered') }}
          </span>

          <span
            data-testid="role-panel__swatch"
            class="ml-auto h-4 w-4 shrink-0 rounded-full border border-line"
            :style="{ backgroundColor: tuner.hexOf(row.shade) ?? 'transparent' }"
          />

          <button
            type="button"
            data-testid="role-panel__step-down"
            :aria-label="t('admin.color-page.role-panel.step-down-label')"
            :disabled="!row.can_step_down"
            class="rounded-1 px-1.5 bg-raised disabled:opacity-40"
            :class="row.can_step_down && 'cursor-pointer'"
            @click="tuner.stepRole(mode, station, row.role, -1)"
          >
            <ui-icon src="subtract" class="h-3 w-3" />
          </button>

          <button
            type="button"
            data-testid="role-panel__step-up"
            :aria-label="t('admin.color-page.role-panel.step-up-label')"
            :disabled="!row.can_step_up"
            class="rounded-1 px-1.5 bg-raised disabled:opacity-40"
            :class="row.can_step_up && 'cursor-pointer'"
            @click="tuner.stepRole(mode, station, row.role, 1)"
          >
            <ui-icon src="add" class="h-3 w-3" />
          </button>
        </div>

        <div class="flex items-center gap-2 text-ink-muted">
          <select
            :data-testid="`role-panel__pick--${row.role}`"
            class="rounded-1 bg-surface px-1 py-0.5 text-ink"
            :value="row.shade?.id ?? ''"
            @change="(event) => onPick(row.role, event)"
          >
            <option value="">{{ t('admin.color-page.role-panel.unanswered') }}</option>
            <option v-for="shade in tuner.ordered_shades.value" :key="shade.id" :value="shade.id">
              {{ shade.name }}
            </option>
            <option :value="NEW_SHADE">{{ t('admin.color-page.role-panel.new-shade') }}</option>
          </select>

          <span data-testid="role-panel__steps">
            {{ t('admin.color-page.role-panel.steps', { steps: row.steps ?? '—' }) }}
          </span>

          <span
            data-testid="role-panel__contrast"
            :data-flagged="row.flagged"
            :data-palette="row.flagged ? 'danger' : undefined"
            class="data-[flagged=true]:text-(--color-accent-text) data-[flagged=true]:font-semibold"
          >
            {{ ratioText(row.ratio) }}
            <template v-if="row.flagged">
              {{ t('admin.color-page.role-panel.below-floor', { floor: row.floor }) }}
            </template>
          </span>

          <span data-testid="role-panel__status" class="ml-auto">
            {{ t(`admin.color-page.status.${row.status}`) }}
          </span>
        </div>
      </li>
    </ul>
  </div>
</template>
