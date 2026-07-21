<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import UiInput from '@/components/ui-kit/input.vue'
import UiTextarea from '@/components/ui-kit/textarea.vue'
import UiThemePicker from '@/components/ui-kit/theme-picker.vue'
import UiPatternPicker from '@/components/ui-kit/pattern-picker.vue'
import SectionList from '@/components/layout-kit/section-list.vue'
import LabeledSection from '@/components/layout-kit/labeled-section.vue'
import MemberBadge from '@/components/member/member-badge.vue'
import SettingsSaveButton from '../settings-save-button.vue'
import { memberEditorKey } from '@/composables/member/editor'
import { MEMBER_DISPLAY_NAME_MAX_LENGTH } from '@/utils/member/defaults'
import { windowLayoutKey } from '@/components/layout-kit/paged-window/layout'
import { useAvatarPicker } from '../use-avatar-picker'
import { SUPPORTED_PALETTES, SUPPORTED_PATTERNS } from '@/utils/cover'

const { t } = useI18n()
const editor = inject(memberEditorKey)!
const layout_mode = inject(windowLayoutKey)!
const { onEditAvatar } = useAvatarPicker(editor)
</script>

<template>
  <section-list data-testid="tab-profile" class="px-(--settings-padding) pb-(--settings-padding)">
    <member-badge
      v-if="layout_mode === 'phone'"
      data-testid="tab-profile__preview"
      :display-name="editor.draft.display_name"
      :description="editor.draft.description"
      :cover="editor.draft.cover_config"
      editable
      @edit-avatar="onEditAvatar"
    />

    <labeled-section :label="t('settings.profile.section.about-you')">
      <ui-input
        :placeholder="t('settings.profile.member-name-placeholder')"
        :error="editor.name_error.value"
        :max-length="MEMBER_DISPLAY_NAME_MAX_LENGTH"
        v-model:value="editor.draft.display_name"
      />
      <ui-textarea
        :placeholder="t('settings.profile.description-placeholder')"
        :max_chars="100"
        no-newlines
        rows="3"
        v-model:value="editor.draft.description"
      />
    </labeled-section>

    <labeled-section :label="t('settings.profile.section.appearance')">
      <div
        data-testid="tab-profile__design"
        :data-palette="editor.draft.cover_config.palette"
        class="flex flex-col gap-6"
      >
        <ui-theme-picker
          :label="t('settings.profile.theme-label')"
          :supported_palettes="SUPPORTED_PALETTES"
          :palette="editor.draft.cover_config.palette"
          @update:palette="editor.draft.cover_config.palette = $event"
        />

        <ui-pattern-picker
          :label="t('settings.profile.pattern-label')"
          :supported_patterns="SUPPORTED_PATTERNS"
          :selected_pattern="editor.draft.cover_config.pattern"
          @update:pattern="editor.draft.cover_config.pattern = $event"
        />
      </div>
    </labeled-section>

    <settings-save-button v-if="layout_mode === 'phone'" />
  </section-list>
</template>
