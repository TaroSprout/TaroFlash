<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import DialogCard from '@/components/layout-kit/dialog-card/index.vue'
import DialogCardBody from '@/components/layout-kit/dialog-card/dialog-card-body.vue'
import AvatarImage from './avatar-image.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { AVATAR_KEYS, loadAvatarUrl } from './avatars'
import { emitSfx } from '@/sfx/bus'

type AvatarPickerModalProps = {
  selected?: string
  close: (avatar?: string) => void
}

const { selected, close } = defineProps<AvatarPickerModalProps>()

const { t } = useI18n()
const loaded = reactive(new Set<string>())

onMounted(() => {
  emitSfx('wooden_chime_ring')
  AVATAR_KEYS.forEach((avatar) => loadAvatarUrl(avatar)?.then(() => loaded.add(avatar)))
})

function onAvatarSelect(avatar: string) {
  if (avatar === selected) {
    emitSfx('ui.deselect')
    return
  }

  emitSfx('ui.toggle-on')
  close(avatar)
}
</script>

<template>
  <dialog-card
    data-testid="avatar-picker-modal"
    size="lg"
    data-palette="blue"
    :title="t('avatar-picker-modal.title')"
    :close_sfx="{ press: 'pop_up_close' }"
    @close="close()"
  >
    <dialog-card-body data-testid="avatar-picker-modal__scroll-area">
      <div data-testid="avatar-picker-modal__grid" class="grid grid-cols-4 gap-3 pt-2">
        <button
          v-for="avatar in AVATAR_KEYS"
          :key="avatar"
          :data-testid="`avatar-picker-modal__option-${avatar}`"
          :data-selected="avatar === selected || undefined"
          v-sfx="{ hover: 'ui.hover' }"
          class="rounded-10 cursor-pointer hover:bg-(--color-accent) hover:bgx-diagonal-stripes hover:bgx-slide data-selected:bg-(--color-accent) data-selected:bgx-diagonal-stripes data-selected:border-6 border-knockout relative aspect-square p-2"
          @click="onAvatarSelect(avatar)"
        >
          <div
            v-if="!loaded.has(avatar)"
            data-testid="avatar-picker-modal__skeleton"
            class="h-full w-full rounded-8 animate-pulse bg-skeleton bgx-diagonal-stripes"
          />
          <avatar-image v-else :avatar="avatar" class="h-full w-full" />

          <div
            v-if="avatar === selected"
            class="absolute -top-2 -right-2 bg-knockout p-1.5 size-8 rounded-full flex items-center justify-center"
          >
            <ui-icon src="check" class="text-(--color-accent-text)" />
          </div>
        </button>
      </div>
    </dialog-card-body>
  </dialog-card>
</template>
