<script setup lang="ts">
import { computed, provide, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import TabProfile from './tab-profile/index.vue'
import TabSubscription from './tab-subscription/index.vue'
import TabApp from './tab-app/index.vue'
import TabDangerZone from './tab-danger-zone/index.vue'
import TabIndex from './tab-index/index.vue'
import SettingsAside from './settings-aside.vue'
import MemberCard from '@/components/member/member-card.vue'
import { emitSfx } from '@/sfx/bus'
import { slideFadeRightEnter, slideFadeRightLeave } from '@/utils/animations/slide-fade-right'
import { tabHeightEnter, tabHeightLeave } from '@/utils/animations/tab-height'
import { useMemberEditor, memberEditorKey } from '@/composables/member/editor'
import {
  useMemberDangerActions,
  memberDangerActionsKey
} from '@/composables/member/danger-actions'
import { useSessionRef } from '@/composables/storage/session-ref'
import { useMatchMedia } from '@/composables/ui/media-query'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiTagButton from '@/components/ui-kit/tag-button.vue'
import TabSheet from '@/components/layout-kit/modal/tab-sheet.vue'
import type { AppProps, AppEmits } from '@/phone/system/types'

defineProps<AppProps>()
const emit = defineEmits<AppEmits>()

const { t } = useI18n()

const editor = useMemberEditor()
provide(memberEditorKey, editor)

const danger = useMemberDangerActions(() => emit('close'))
provide(memberDangerActionsKey, danger)

const tabs = computed(() => [
  { value: 'profile', icon: 'id-card', label: t('settings.tab.profile') },
  { value: 'subscription', icon: 'moon-stars', label: t('settings.tab.subscription') },
  { value: 'app', icon: 'music-note', label: t('settings.tab.app') },
  { value: 'danger-zone', icon: 'delete', label: t('settings.tab.danger-zone') }
])

type ActiveTab = 'profile' | 'subscription' | 'app' | 'danger-zone'
const active_tab = useSessionRef<ActiveTab | null>('settings.active-tab', null)

const is_mobile = useMatchMedia('w<md | h<sm')
const tab_sheet = useTemplateRef('tab_sheet')

// Sourced from TabSheet (the one owner of sidebar visibility), so the displayed
// tab tracks the actual sidebar instead of a re-derived condition that drifts.
const has_sidebar = computed(() => tab_sheet.value?.has_sidebar ?? false)

watch(has_sidebar, (visible) => {
  if (!visible && active_tab.value === 'danger-zone') active_tab.value = null
})

const displayed_tab = computed(() => active_tab.value ?? (has_sidebar.value ? 'profile' : 'index'))

const sidebar_active = computed({
  get: () => active_tab.value ?? 'profile',
  set: (v) => (active_tab.value = v as ActiveTab)
})

const active_header = computed(() => ({
  title: t(`settings.header.${displayed_tab.value}.title`),
  description: t(`settings.header.${displayed_tab.value}.description`)
}))

async function onSave() {
  const saved = await editor.saveMember()
  if (saved) emit('close')
}

function onBack() {
  emitSfx('ui.select')
  active_tab.value = null
}

const tab_outlet = ref<HTMLElement>()

const TAB_COMPONENTS = {
  index: TabIndex,
  profile: TabProfile,
  subscription: TabSubscription,
  app: TabApp,
  'danger-zone': TabDangerZone
}

const tab_component = computed(() => TAB_COMPONENTS[displayed_tab.value])

function onTabLeave(el: Element, done: () => void) {
  if (!is_mobile.value || !tab_outlet.value) {
    requestAnimationFrame(done)
    return
  }
  tabHeightLeave(tab_outlet.value)(el, done)
}

function onTabEnter(el: Element, done: () => void) {
  if (!is_mobile.value || !tab_outlet.value) {
    requestAnimationFrame(done)
    return
  }
  tabHeightEnter(tab_outlet.value)(el, done)
}
</script>

<template>
  <tab-sheet
    ref="tab_sheet"
    data-testid="settings-container"
    data-theme="blue-500"
    data-theme-dark="blue-650"
    class="w-full! max-w-205.5 lg:pointer-fine:max-w-none lg:pointer-fine:w-250! md:h-167 max-md:[--sheet-px:2rem]"
    surface="inverted"
    :tabs="tabs"
    :pattern_config="{ pattern: 'endless-clouds' }"
    :parts="{ content: 'flex gap-14 h-full items-start' }"
    hover_sfx="ui.click_07"
    v-model:active="sidebar_active"
    @close="emit('close')"
  >
    <template #header-content>
      <div
        data-testid="settings__header"
        class="w-full flex flex-col max-md:items-center max-md:text-center"
      >
        <h1 data-testid="settings__header-title" class="text-5xl text-white">
          {{ active_header.title }}
        </h1>
        <p data-testid="settings__header-description" class="text-white/80">
          {{ active_header.description }}
        </p>
      </div>
    </template>

    <div
      ref="tab_outlet"
      data-testid="settings__main"
      class="relative flex flex-1 flex-col gap-4 w-full min-w-0 max-md:max-w-111 max-md:mx-auto max-md:overflow-hidden"
    >
      <transition :css="false" mode="out-in" @leave="onTabLeave" @enter="onTabEnter">
        <component :is="tab_component" :key="displayed_tab" @navigate="active_tab = $event" />
      </transition>
    </div>

    <settings-aside
      v-if="!is_mobile"
      data-testid="settings__aside"
      class="w-96 shrink-0 self-end pt-60"
    />

    <template #overlay>
      <transition
        :css="false"
        @enter="(el, done) => slideFadeRightEnter(el, done)"
        @leave="(el, done) => slideFadeRightLeave(el, done)"
      >
        <ui-tag-button
          v-if="!has_sidebar && active_tab !== null"
          data-testid="settings__back-button"
          :aria-label="t('settings.back-button')"
          data-theme="yellow-500"
          data-theme-dark="yellow-700"
          class="pointer-events-auto absolute! left-(--sheet-px) top-29 drop-shadow-xs"
          @click="onBack"
        >
          <ui-icon src="arrow-back" class="w-4 h-4" />
          <span>{{ t('settings.back-label') }}</span>
        </ui-tag-button>
      </transition>

      <div
        v-if="!is_mobile"
        data-testid="settings__floating-preview"
        class="pointer-events-auto absolute right-(--sheet-px) top-6"
      >
        <member-card
          :created-at="editor.created_at.value"
          :display-name="editor.settings.display_name"
          :card-comment="editor.settings.description"
          :card-title="t('settings.preview.title-fallback')"
          :cover="editor.cover"
          class="rotate-4 drop-shadow-sm"
        />
      </div>
    </template>

    <template #footer>
      <ui-button
        v-if="editor.is_dirty.value"
        data-theme="blue-500"
        data-theme-dark="blue-650"
        size="xl"
        full-width
        :loading="editor.saving.value"
        @click="onSave"
      >
        {{ t('settings.submit-edit') }}
      </ui-button>
    </template>
  </tab-sheet>
</template>
