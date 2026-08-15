<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import FieldRow from '@/components/layout-kit/field-row.vue'
import ScrollRegion from '@/components/layout-kit/scroll-region/index.vue'
import UiToggle from '@/components/ui-kit/toggle.vue'
import UiOptionGroup from '@/components/ui-kit/option-group.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { useMatchMedia } from '@/composables/ui/media-query'
import { useInjectedStudySessionController } from '../composables/session-controller'

type RatingsMode = 'simple' | 'advanced'

const { t } = useI18n()

const {
  show_all_ratings,
  show_rating_buttons,
  show_button_preview,
  show_card_preview,
  multi_deck_ordering,
  prefs_are_default,
  resetToDefaults
} = useInjectedStudySessionController()

const is_coarse = useMatchMedia('coarse')
const is_mobile = useMatchMedia('w<sm')

/** Ratings mode is a boolean pref; the option group speaks string values. */
const ratings_mode = computed<RatingsMode>({
  get: () => (show_all_ratings.value ? 'advanced' : 'simple'),
  set: (value) => (show_all_ratings.value = value === 'advanced')
})

const option_size = computed(() => (is_coarse.value ? 'base' : 'sm'))

const ratings_options = computed(() => [
  { value: 'simple' as const, label: t('study-session.settings.ratings-mode.simple') },
  { value: 'advanced' as const, label: t('study-session.settings.ratings-mode.advanced') }
])

const ordering_options = computed(() => [
  { value: 'sequential' as const, label: t('study-session.settings.ordering.sequential') },
  { value: 'even_spread' as const, label: t('study-session.settings.ordering.even-spread') },
  { value: 'random' as const, label: t('study-session.settings.ordering.shuffled') }
])
</script>

<template>
  <scroll-region
    data-testid="session-settings"
    class="flex h-full w-full flex-col"
    scroller_class="gap-6 overflow-x-hidden pb-6"
  >
    <p data-testid="session-settings__description" class="text-center text-base text-ink-muted">
      {{ t('study-session.settings.description') }}
    </p>

    <labeled-section
      data-testid="session-settings__rating"
      :label="t('study-session.settings.section.rating')"
      :description="t('study-session.settings.section.rating-description')"
    >
      <field-row
        :label="t('study-session.settings.ratings-mode.label')"
        :tooltip="t('study-session.settings.ratings-mode.description')"
      >
        <ui-option-group
          v-model:value="ratings_mode"
          :options="ratings_options"
          :size="option_size"
        />
      </field-row>

      <field-row
        :label="t('study-session.settings.rating-buttons.label')"
        :tooltip="t('study-session.settings.rating-buttons.description')"
      >
        <ui-toggle v-model:checked="show_rating_buttons" />
      </field-row>
    </labeled-section>

    <labeled-section
      data-testid="session-settings__preview"
      :label="t('study-session.settings.section.preview')"
      :description="t('study-session.settings.section.preview-description')"
    >
      <field-row
        :label="t('study-session.settings.button-preview.label')"
        :tooltip="t('study-session.settings.button-preview.description')"
      >
        <ui-toggle v-model:checked="show_button_preview" :disabled="!show_rating_buttons" />
      </field-row>

      <field-row
        :label="t('study-session.settings.card-preview.label')"
        :tooltip="t('study-session.settings.card-preview.description')"
      >
        <ui-toggle v-model:checked="show_card_preview" />
      </field-row>
    </labeled-section>

    <labeled-section
      data-testid="session-settings__order"
      :label="t('study-session.settings.section.order')"
      :description="t('study-session.settings.ordering.description')"
    >
      <template v-if="!is_mobile" #actions>
        <ui-option-group
          data-testid="session-settings__order-control"
          v-model:value="multi_deck_ordering"
          :options="ordering_options"
          :size="option_size"
        />
      </template>

      <ui-option-group
        v-if="is_mobile"
        data-testid="session-settings__order-control"
        v-model:value="multi_deck_ordering"
        full_width
        :options="ordering_options"
        :size="option_size"
      />
    </labeled-section>

    <ui-button
      neutral
      data-testid="session-settings__reset"
      icon-left="refresh"
      class="mt-auto"
      size="lg"
      full-width
      :disabled="prefs_are_default"
      :sfx="{ press: 'snappy_button_5' }"
      @press="resetToDefaults"
    >
      {{ t('study-session.settings.reset-button') }}
    </ui-button>
  </scroll-region>
</template>
