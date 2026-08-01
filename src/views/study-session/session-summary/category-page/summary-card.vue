<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/card/index.vue'
import UiRadio from '@/components/ui-kit/radio.vue'
import UiDropdownButton, {
  type DropdownOption
} from '@/components/ui-kit/dropdown-button/index.vue'
import { useDeckResolution } from '@/views/study-session/deck-resolution'
import { useInjectedStudySessionController } from '@/views/study-session/composables/session-controller'
import { usePressHold } from '@/composables/ui/press-hold'
import { emitSfx } from '@/sfx/bus'
import type { StudyCard } from '@/views/study-session/composables/session-engine'

type SummaryCardProps = { card: StudyCard }

const { card } = defineProps<SummaryCardProps>()

const { t } = useI18n()
const { appearanceFor } = useDeckResolution()
const { summary_selection, startSummaryEdit, onDeleteSummaryCard, onMoveSummaryCard } =
  useInjectedStudySessionController()

const side = ref<'front' | 'back'>('front')
const is_hovering = ref(false)
const dropdown = useTemplateRef<InstanceType<typeof UiDropdownButton>>('dropdown')
const options_hold = usePressHold()

const appearance = computed(() => appearanceFor(card.deck_id))
const is_selecting = computed(() => summary_selection.is_selecting.value)
const selected = computed(() => summary_selection.isCardSelected(card.id))

const menu_options = computed<DropdownOption[]>(() => [
  { label: t('session-summary.item-options.select'), value: 'select', icon: 'data-check' },
  { label: t('session-summary.item-options.move'), value: 'move', icon: 'move-item' },
  { label: t('session-summary.item-options.edit'), value: 'edit', icon: 'edit' },
  { label: t('session-summary.item-options.delete'), value: 'delete', icon: 'delete' }
])

function onMenuSelect(option: DropdownOption) {
  if (option.value === 'select') {
    summary_selection.enterSelection()
    summary_selection.selectCard(card.id)
  } else if (option.value === 'move') {
    onMoveSummaryCard(card.id)
  } else if (option.value === 'edit') {
    startSummaryEdit(card.id)
  } else if (option.value === 'delete') {
    onDeleteSummaryCard(card.id)
  }
}

// A touch hold opens the corner more-menu; desktop hovers it into view instead.
function onPointerdown(event: PointerEvent) {
  if (is_selecting.value || event.pointerType === 'mouse') return
  options_hold.arm(event, () => dropdown.value?.show())
}

function onCardClick() {
  if (is_selecting.value) {
    summary_selection.toggleSelectCard(card.id)
    return
  }

  emitSfx(side.value === 'front' ? 'transition_up' : 'transition_down')
  side.value = side.value === 'front' ? 'back' : 'front'
}
</script>

<template>
  <div
    data-testid="session-summary__card"
    class="group relative w-full"
    @mouseenter="is_hovering = true"
    @mouseleave="is_hovering = false"
    @pointerdown="onPointerdown"
  >
    <card
      :id="card.id"
      :deck_id="card.deck_id"
      :side="side"
      :front_text="card.front_text"
      :back_text="card.back_text"
      :front_image_path="card.front_image_path"
      :back_image_path="card.back_image_path"
      :card_attributes="appearance.card_attributes"
      class="cursor-pointer"
      @click="onCardClick"
    />

    <div v-if="is_selecting" class="absolute -top-1 -right-1 pointer-events-none">
      <ui-radio
        data-testid="session-summary__card-checkbox"
        data-palette="blue"
        :checked="selected"
        :active="is_hovering"
        class="outline-4 outline-surface"
      />
    </div>

    <ui-dropdown-button
      v-if="!is_selecting"
      ref="dropdown"
      data-testid="session-summary__card-menu"
      trigger-only
      :trigger-icon="dropdown?.open ? 'close' : 'more'"
      position="bottom-end"
      class="absolute -top-1 -right-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto data-[active=true]:opacity-100 data-[active=true]:pointer-events-auto [&>button]:ring-4 [&>button]:ring-brown-100 dark:[&>button]:ring-grey-900"
      :options="menu_options"
      @select="onMenuSelect"
    />
  </div>
</template>
