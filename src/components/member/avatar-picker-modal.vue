<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import DialogCard from '@/components/layout-kit/dialog-card/index.vue'
import AvatarImage from './avatar-image.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import ScrollBar from '@/components/ui-kit/scroll-bar.vue'
import { AVATAR_KEYS } from './avatars'
import { emitSfx } from '@/sfx/bus'
import { TYPE_SFX } from '@/sfx/config'

type AvatarPickerModalProps = {
  selected?: string
  close: (avatar?: string) => void
}

const { selected, close } = defineProps<AvatarPickerModalProps>()

const { t } = useI18n()
const grid_el = useTemplateRef<HTMLElement>('grid')

onMounted(() => emitSfx('wooden_chime_ring'))

function onAvatarSelect(avatar: string) {
  if (avatar === selected) {
    emitSfx('digi_powerdown')
    return
  }

  emitSfx('toggle_on')
  close(avatar)
}
</script>

<template>
  <dialog-card
    data-testid="avatar-picker-modal"
    size="lg"
    data-theme="brown-300"
    data-theme-dark="stone-700"
    :title="t('avatar-picker-modal.title')"
    @close="close()"
  >
    <template #default="{ viewport }">
      <div data-testid="avatar-picker-modal__scroll-area" class="relative h-full">
        <div
          ref="grid"
          data-testid="avatar-picker-modal__grid"
          :data-full-bleed="viewport === 'mobile'"
          class="scroll-hidden grid grid-cols-4 gap-3 overflow-y-auto px-(--dialog-px) pb-(--dialog-px) pt-2 h-full"
        >
          <button
            v-for="avatar in AVATAR_KEYS"
            :key="avatar"
            :data-testid="`avatar-picker-modal__option-${avatar}`"
            :data-selected="avatar === selected || undefined"
            v-sfx="{ hover: TYPE_SFX }"
            class="rounded-6 cursor-pointer hover:bg-(--theme-primary) data-selected:bg-(--theme-primary) relative aspect-square p-2"
            @click="onAvatarSelect(avatar)"
          >
            <avatar-image :avatar="avatar" class="h-full w-full" />

            <div
              v-if="avatar === selected"
              class="absolute -top-2 -right-2 bg-white p-1.5 size-6.5 rounded-full flex items-center justify-center"
            >
              <ui-icon src="check" class="text-(--theme-primary)" />
            </div>
          </button>
        </div>

        <scroll-bar
          v-if="grid_el"
          :target="grid_el"
          min-width="sm"
          class="absolute -right-6 top-1 bottom-(--dialog-px)"
        />
      </div>
    </template>
  </dialog-card>
</template>
