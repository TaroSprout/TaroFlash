<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  watch
} from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsAside from './settings-aside.vue'
import { settingsLayoutKey, settingsCloseKey } from '../layout'
import { emitSfx } from '@/sfx/bus'
import { useMemberEditor, memberEditorKey } from '@/composables/member/editor'
import { useMemberDangerActions, memberDangerActionsKey } from '@/composables/member/danger-actions'
import { useTabModalLayout } from '@/composables/ui/tab-modal-layout'
import { useTabTransition } from '@/composables/ui/tab-transition'
import { useAlert } from '@/composables/alert'
import { useModalRequestClose } from '@/composables/modal'
import MemberCard from '@/components/member/member-card.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import TabSheet from '@/components/layout-kit/modal/tab-sheet.vue'
const { close } = defineProps<{ close: () => void }>()

const { t } = useI18n()

const TabProfile = defineAsyncComponent(() => import('./tab-profile/index.vue'))
const TabSubscription = defineAsyncComponent(() => import('./tab-subscription/index.vue'))
const TabApp = defineAsyncComponent(() => import('./tab-app/index.vue'))
const TabDangerZone = defineAsyncComponent(() => import('./tab-danger-zone/index.vue'))
const TabIndex = defineAsyncComponent(() => import('./tab-index/index.vue'))

const TAB_COMPONENTS = {
  index: TabIndex,
  profile: TabProfile,
  app: TabApp,
  subscription: TabSubscription,
  'danger-zone': TabDangerZone
}

const editor = useMemberEditor()
provide(memberEditorKey, editor)

const danger = useMemberDangerActions(close)
provide(memberDangerActionsKey, danger)

const alert = useAlert()

// landscape phone (h<sm) also counts as sheet
const { layout_mode, sheet_px } = useTabModalLayout({
  sheet_query: 'w<md | h<sm',
  desktop_query: 'w>=lg & fine'
})
provide(settingsLayoutKey, layout_mode)
provide(settingsCloseKey, close)

type ActiveTab = 'profile' | 'subscription' | 'app' | 'danger-zone'
const active_tab = ref<ActiveTab | null>(null)

const tab_outlet = ref<HTMLElement>()
const { nav_direction, onTabEnter, onTabLeave } = useTabTransition(layout_mode, tab_outlet)

const tabs = computed(() => [
  { value: 'profile', icon: 'user-sticker-square', label: t('settings.tab.profile') },
  { value: 'app', icon: 'screwdriver-wrench', label: t('settings.tab.app') },
  { value: 'subscription', icon: 'piggy-bank', label: t('settings.tab.subscription') },
  { value: 'danger-zone', icon: 'delete', label: t('settings.tab.danger-zone') }
])

const displayed_tab = computed(
  () => active_tab.value ?? (layout_mode.value === 'desktop' ? 'profile' : 'index')
)

const sidebar_active = computed({
  get: () => active_tab.value ?? 'profile',
  set: (v) => (active_tab.value = v as ActiveTab)
})

const header_title = computed(() => t(`settings.header.${displayed_tab.value}.title`))

const tab_component = computed(() => TAB_COMPONENTS[displayed_tab.value])

// Open/close sfx live on the modal itself so every callsite (phone launcher,
// dashboard edit button) sounds identically. Mirrors the deck-settings modal.
onMounted(() => emitSfx('snappy_button_3'))
onBeforeUnmount(() => emitSfx('snappy_button_5'))

onMounted(() => {
  const idle = window.requestIdleCallback ?? ((cb: IdleRequestCallback) => setTimeout(cb, 200))
  idle(() => {
    import('./tab-profile/index.vue')
    import('./tab-subscription/index.vue')
    import('./tab-app/index.vue')
    import('./tab-danger-zone/index.vue')
    import('./tab-index/index.vue')
  })
})

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

watch(layout_mode, (mode) => {
  if (mode !== 'desktop' && active_tab.value === 'danger-zone') active_tab.value = null
})
</script>

<template>
  <tab-sheet
    data-testid="settings-container"
    data-theme="blue-500"
    data-theme-dark="blue-650"
    :data-layout="layout_mode"
    :class="[
      layout_mode === 'desktop' ? 'w-255!' : 'w-full! max-w-205.5',
      layout_mode !== 'sheet' && 'h-170'
    ]"
    :sheet_px="sheet_px"
    :tabs="tabs"
    :pattern_config="{ pattern: 'diagonal-stripes', pattern_size: '48px', pattern_opacity: '0.15' }"
    :parts="{ content: 'flex gap-14 h-full items-start' }"
    v-model:active="sidebar_active"
    @close="onClose"
  >
    <template #header-content>
      <div
        data-testid="settings__header"
        class="w-full flex flex-col max-md:items-center max-md:text-center"
        :class="layout_mode === 'tablet' && 'pt-4'"
      >
        <h1 data-testid="settings__header-title" class="text-5xl text-white">
          {{ header_title }}
        </h1>
      </div>
    </template>

    <div
      ref="tab_outlet"
      data-testid="settings__main"
      :class="[
        'relative flex flex-1 flex-col gap-4 w-full min-w-0',
        layout_mode === 'sheet' && 'max-w-111 mx-auto overflow-hidden'
      ]"
    >
      <transition :css="false" mode="out-in" @leave="onTabLeave" @enter="onTabEnter">
        <component :is="tab_component" :key="displayed_tab" @navigate="onNavigate" @back="onBack" />
      </transition>
    </div>

    <settings-aside
      v-if="layout_mode !== 'sheet'"
      data-testid="settings__aside"
      class="w-96 shrink-0 self-end"
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

    <template #footer />
  </tab-sheet>
</template>
