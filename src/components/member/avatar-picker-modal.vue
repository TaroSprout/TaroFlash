<script setup lang="ts">
import { onMounted, reactive, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import DialogCard from '@/components/layout-kit/dialog-card/index.vue'
import AvatarImage from './avatar-image.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import ScrollBar from '@/components/ui-kit/scroll-bar.vue'
import { AVATAR_KEYS, loadAvatarUrl } from './avatars'
import { emitSfx } from '@/sfx/bus'
import { TYPE_SFX } from '@/sfx/config'

type AvatarPickerModalProps = {
  selected?: string
  close: (avatar?: string) => void
}

const { selected, close } = defineProps<AvatarPickerModalProps>()

const { t } = useI18n()
const grid_el = useTemplateRef<HTMLElement>('grid')
const loaded = reactive(new Set<string>())

onMounted(() => {
  emitSfx('wooden_chime_ring')
  AVATAR_KEYS.forEach((avatar) => loadAvatarUrl(avatar)?.then(() => loaded.add(avatar)))
})

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
    data-theme="blue-500"
    data-theme-dark="blue-650"
    :title="t('avatar-picker-modal.title')"
    :close_sfx="{ press: 'pop_up_close' }"
    @close="close()"
  >
    <template #default="{ viewport }">
      <div data-testid="avatar-picker-modal__scroll-area" class="relative h-full">
        <div
          ref="grid"
          data-testid="avatar-picker-modal__grid"
          :data-full-bleed="viewport === 'mobile'"
          class="scroll-hidden grid grid-cols-4 gap-3 overflow-y-auto pb-(--dialog-px) pt-2 h-full"
        >
          <button
            v-for="avatar in AVATAR_KEYS"
            :key="avatar"
            :data-testid="`avatar-picker-modal__option-${avatar}`"
            :data-selected="avatar === selected || undefined"
            v-sfx="{ hover: TYPE_SFX }"
            class="rounded-10 cursor-pointer hover:bg-(--theme-primary) hover:bgx-diagonal-stripes hover:bgx-slide data-selected:bg-(--theme-primary) data-selected:bgx-diagonal-stripes data-selected:outline-6 outline-white relative aspect-square p-2"
            @click="onAvatarSelect(avatar)"
          >
            <div
              v-if="!loaded.has(avatar)"
              data-testid="avatar-picker-modal__skeleton"
              class="h-full w-full rounded-8 animate-pulse bg-brown-300 bgx-diagonal-stripes"
            />
            <avatar-image v-else :avatar="avatar" class="h-full w-full" />

            <div
              v-if="avatar === selected"
              class="absolute -top-2 -right-2 bg-white p-1.5 size-8 rounded-full flex items-center justify-center"
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
