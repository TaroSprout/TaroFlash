<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsAside from './settings-aside.vue'
import {
  settingsLayoutKey,
  settingsCloseKey,
  settingsRecedeKey,
  SETTINGS_SHEET_BREAKPOINTS
} from './layout'
import { useMatchMedia } from '@/composables/ui/media-query'
import { emitSfx } from '@/sfx/bus'
import { useMemberEditor, memberEditorKey } from '@/composables/member/editor'
import { TAB_META, type TabValue } from './tabs'
import { useMemberDangerActions, memberDangerActionsKey } from '@/composables/member/danger-actions'
import { useTabModalLayout } from '@/composables/ui/tab-modal-layout'
import { useTabTransition } from '@/composables/ui/tab-transition'
import { useAlert } from '@/composables/alert'
import { useModalRequestClose } from '@/composables/modal'
import { recedeModal, restoreModal } from '@/utils/animations/modal'
import MemberCard from '@/components/member/member-card.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import TabSheet from '@/components/layout-kit/sheet/tab-sheet.vue'
import TabProfile from './tab-profile/index.vue'
import TabSubscription from './tab-subscription/index.vue'
import TabApp from './tab-app/index.vue'
import TabReviewPreferences from './tab-review-preferences/index.vue'
import TabDangerZone from './tab-danger-zone/index.vue'
import TabAccountAccess from './tab-account-access/index.vue'
import TabIndex from './tab-index/index.vue'
const { close } = defineProps<{ close: () => void }>()

const { t } = useI18n()

const TAB_COMPONENTS = {
  index: TabIndex,
  profile: TabProfile,
  app: TabApp,
  'review-preferences': TabReviewPreferences,
  subscription: TabSubscription,
  'danger-zone': TabDangerZone,
  'account-access': TabAccountAccess
}

const editor = useMemberEditor()
provide(memberEditorKey, editor)

const danger = useMemberDangerActions(close)
provide(memberDangerActionsKey, danger)

const alert = useAlert()

const { layout_mode, sheet_px } = useTabModalLayout({
  sheet_query: 'w<mlg',
  desktop_query: 'w>=lg & fine'
})
provide(settingsLayoutKey, layout_mode)
provide(settingsCloseKey, close)

// Mirrors the mobile-sheet primitive's own bottom-pin check (same breakpoint keys
// passed to modal.open in useSettingsModal) so recede/restore can't drift from it —
// layout_mode is width-only and stays desktop/tablet regardless of height.
const is_pinned = useMatchMedia(
  `w<${SETTINGS_SHEET_BREAKPOINTS.width} | h<${SETTINGS_SHEET_BREAKPOINTS.height}`
)

const settings_root = useTemplateRef<{ $el: HTMLElement }>('settings_root')
provide(settingsRecedeKey, {
  recede: () => settings_root.value?.$el && recedeModal(settings_root.value.$el, is_pinned.value),
  restore: () => settings_root.value?.$el && restoreModal(settings_root.value.$el, is_pinned.value)
})

type ActiveTab = TabValue
const active_tab = ref<ActiveTab | null>(null)

const tab_outlet = ref<HTMLElement>()
const { nav_direction, onTabEnter, onTabLeave } = useTabTransition(layout_mode, tab_outlet)

const active_tab_ref = useTemplateRef<{ onChromeBack?: () => boolean }>('active_tab_ref')

// account-access is reachable via the aside's edit button (tablet/desktop) or the
// sheet-only tab-index entry — it never appears as a sidebar tab-bar icon itself.
const tabs = computed(() =>
  (Object.keys(TAB_META) as TabValue[])
    .filter((value) => value !== 'account-access')
    .map((value) => ({
      value,
      icon: TAB_META[value].icon,
      label: t(TAB_META[value].labelKey)
    }))
)

const displayed_tab = computed(
  () => active_tab.value ?? (layout_mode.value === 'desktop' ? 'profile' : 'index')
)

const sidebar_active = computed({
  get: () => active_tab.value ?? 'profile',
  set: (v) => (active_tab.value = v as ActiveTab)
})

const header_meta = computed(() =>
  displayed_tab.value !== 'index' ? TAB_META[displayed_tab.value] : null
)
const header_title = computed(() =>
  header_meta.value ? t(header_meta.value.labelKey) : t('settings.header.index.title')
)

const tab_component = computed(() => TAB_COMPONENTS[displayed_tab.value])

// Sheet mode goes full-bleed so the animated tab outlet doesn't clip outlines/
// rings — each tab self-pads via --settings-padding instead. Tablet/desktop keep
// the container padding so the aside column stays inset.
const tab_content_class = computed(() =>
  layout_mode.value === 'sheet'
    ? 'flex gap-14 h-full items-start'
    : 'px-(--sheet-px) pb-8 pt-0 flex gap-14 h-full items-start'
)

// Open/close sfx live on the modal itself so every callsite (phone launcher,
// dashboard edit button) sounds identically. Mirrors the deck-settings modal.
onMounted(() => emitSfx('snappy_button_3'))
onBeforeUnmount(() => emitSfx('snappy_button_5'))

async function onClose() {
  if (!editor.is_dirty.value) return close()
  const { response } = alert.warn({
    title: t('settings.unsaved-alert.title'),
    message: t('settings.unsaved-alert.message'),
    confirmLabel: t('settings.unsaved-alert.confirm'),
    cancelLabel: t('settings.unsaved-alert.cancel')
  })
  if (await response) close()
}

useModalRequestClose(onClose)

function onNavigate(tab: ActiveTab) {
  nav_direction.value = 'forward'
  active_tab.value = tab
}

function onBack() {
  emitSfx('snappy_button_5')
  nav_direction.value = 'back'
  active_tab.value = null
}

function onChromeBack() {
  if (active_tab_ref.value?.onChromeBack?.()) {
    emitSfx('snappy_button_5')
    return
  }
  onBack()
}

watch(layout_mode, (mode) => {
  if (mode !== 'desktop' && active_tab.value === 'danger-zone') active_tab.value = null
  if (mode !== 'sheet' && active_tab.value === 'account-access') active_tab.value = null
})
</script>

<template>
  <tab-sheet
    ref="settings_root"
    data-testid="settings-container"
    data-theme="blue-500"
    data-theme-dark="blue-650"
    :data-layout="layout_mode"
    :class="[
      layout_mode === 'desktop' ? 'w-248!' : 'w-full! max-w-224',
      layout_mode !== 'sheet' && 'h-186',
      layout_mode === 'sheet' ? '[--settings-padding:var(--sheet-px)]' : '[--settings-padding:0px]'
    ]"
    :sheet_px="sheet_px"
    :tabs="tabs"
    :pattern_config="{ pattern: 'diagonal-stripes', pattern_size: '48px', pattern_opacity: '0.15' }"
    :parts="{ content: tab_content_class }"
    :show_back="active_tab !== null"
    v-model:active="sidebar_active"
    @close="onClose"
    @back="onChromeBack"
  >
    <template #header-content>
      <div
        data-testid="settings__header"
        class="w-full flex flex-col"
        :class="
          layout_mode === 'sheet' ? 'items-center text-center' : layout_mode === 'tablet' && 'pt-4'
        "
      >
        <h1
          data-testid="settings__header-title"
          class="flex items-center gap-3 text-5xl text-white"
        >
          {{ header_title }}
        </h1>
      </div>
    </template>

    <div
      ref="tab_outlet"
      data-testid="settings__main"
      :class="[
        'relative flex flex-1 flex-col gap-4 w-full min-w-0',
        layout_mode === 'sheet' && 'max-w-111 mx-auto overflow-hidden pt-0.5'
      ]"
    >
      <transition :css="false" mode="out-in" @leave="onTabLeave" @enter="onTabEnter">
        <component
          ref="active_tab_ref"
          :is="tab_component"
          :key="displayed_tab"
          @navigate="onNavigate"
        />
      </transition>
    </div>

    <settings-aside
      v-if="layout_mode !== 'sheet'"
      data-testid="settings__aside"
      class="w-90 shrink-0 self-end"
      :class="layout_mode === 'tablet' ? 'pt-56' : 'pt-60'"
    />

    <template #overlay>
      <div
        v-if="layout_mode !== 'sheet'"
        data-testid="settings__pinned-preview"
        class="pointer-events-auto absolute right-(--sheet-px) top-6"
      >
        <div data-testid="settings__pinned-preview-inner" class="relative">
          <div
            data-testid="settings__pinned-preview-paperclip"
            class="absolute -top-8 right-15 -translate-x-1/2 z-10 drop-shadow-2xs"
          >
            <ui-icon src="paperclip" class="w-16 h-16 -rotate-186 text-grey-300" />
          </div>
          <member-card
            :created-at="editor.created_at.value"
            :display-name="editor.settings.display_name"
            :card-comment="editor.settings.description"
            :card-title="t('settings.preview.title-fallback')"
            :cover="editor.cover"
            class="rotate-4 drop-shadow-sm"
          />
        </div>
      </div>
    </template>
  </tab-sheet>
</template>
