<script setup lang="ts">
import { type Grade } from 'ts-fsrs'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import RatingButtons from './session-studying/rating-buttons/index.vue'
import StudyFlipDoneFooter from './study-flip-done-footer.vue'
import SummaryBulkActionsBar from './session-summary/bulk-actions-bar.vue'
import { toolbarEnter, toolbarLeave } from '@/utils/animations/toolbar-swap'

type SessionToolbarProps = {
  variant:
    | 'rating'
    | 'edit'
    | 'settings-reset'
    | 'summary-edit'
    | 'bulk'
    | 'category-close'
    | 'summary-close'
  prefs_are_default: boolean
}

const { variant, prefs_are_default } = defineProps<SessionToolbarProps>()

const emit = defineEmits<{
  (e: 'started'): void
  (e: 'rated', grade: Grade): void
  (e: 'flip'): void
  (e: 'done'): void
  (e: 'reset'): void
  (e: 'close'): void
}>()

const { t } = useI18n()
</script>

<template>
  <div class="relative w-full">
    <Transition :css="false" @enter="toolbarEnter" @leave="toolbarLeave">
      <rating-buttons
        v-if="variant === 'rating'"
        key="rating"
        class="mx-auto max-w-117"
        @started="emit('started')"
        @rated="emit('rated', $event)"
      />
      <study-flip-done-footer
        v-else-if="variant === 'edit'"
        key="edit"
        @flip="emit('flip')"
        @done="emit('done')"
      />
      <ui-button
        v-else-if="variant === 'settings-reset'"
        key="settings-reset"
        neutral
        data-testid="session-settings__reset"
        icon-left="refresh"
        full-width
        size="xl"
        class="mx-auto max-w-95"
        :disabled="prefs_are_default"
        :sfx="{ press: 'ui.press' }"
        @press="emit('reset')"
      >
        {{ t('study-session.settings.reset-button') }}
      </ui-button>
      <study-flip-done-footer
        v-else-if="variant === 'summary-edit'"
        key="summary-edit"
        @flip="emit('flip')"
        @done="emit('done')"
      />
      <summary-bulk-actions-bar v-else-if="variant === 'bulk'" key="bulk" />
      <ui-button
        v-else-if="variant === 'category-close'"
        key="category-close"
        neutral
        data-testid="session-summary-category__close"
        full-width
        size="xl"
        class="mx-auto max-w-95"
        :sfx="{ press: 'nav.page-forward' }"
        @press="emit('close')"
      >
        {{ t('session-summary.close-button') }}
      </ui-button>
      <ui-button
        v-else
        key="summary-close"
        neutral
        data-testid="session-summary__close"
        full-width
        size="xl"
        class="mx-auto max-w-95"
        :sfx="{ press: 'nav.page-forward' }"
        @press="emit('close')"
      >
        {{ t('session-summary.close-button') }}
      </ui-button>
    </Transition>
  </div>
</template>
