<script setup lang="ts">
import LoginDialogue from '@/views/welcome/login-dialog.vue'
import { useI18n } from 'vue-i18n'
import UiImage from '@/components/ui-kit/image.vue'
import UiPopover from '@/components/ui-kit/popover.vue'
import UiButton from '@/components/ui-kit/button.vue'
import PinnedPreview from '@/components/deck/pinned-preview.vue'
import { ref } from 'vue'
import { emitSfx } from '@/sfx/bus'

type SplashProps = {
  signup: (payment?: boolean) => void
}

const { signup } = defineProps<SplashProps>()

const { t } = useI18n()

const login_dropdown_open = ref(false)
const preview_side = ref<CardSide>('cover')

const preview_cover: DeckCover = {
  theme: 'red-500',
  theme_dark: 'red-600',
  pattern: 'endless-clouds',
  icon: 'piggy-bank'
}

const preview_attributes: DeckCardAttributes = {
  front: { horizontal_alignment: 'center', vertical_alignment: 'center' },
  back: { horizontal_alignment: 'center', vertical_alignment: 'center' }
}

function openLoginDropdown() {
  login_dropdown_open.value = true
  emitSfx('slide_up')
}

function closeLoginDropdown() {
  login_dropdown_open.value = false
  emitSfx('card_drop')
}

function triggerLoginDropdown() {
  if (login_dropdown_open.value) {
    closeLoginDropdown()
    return
  }

  openLoginDropdown()
}

function flipPreviewSide(side: CardSide) {
  preview_side.value = side
  emitSfx('slide_up')
}
</script>

<template>
  <div data-testid="welcome-hero__wave-backdrop" class="w-full bg-brown-200 dark:bg-grey-800">
    <section
      data-testid="welcome-hero"
      class="flex flex-col w-full pt-7.5 pb-44 relative bg-green-400 wave-bottom-[30px] bgx-diagonal-stripes bgx-size-20 bgx-opacity-12 bg-center overflow-hidden"
    >
      <div class="absolute pointer-events-none inset-0 bg-(image:--bgx-stars) bg-center -z-1"></div>

      <div data-testid="stationary" class="absolute inset-0 pointer-events-none drop-shadow-sm">
        <ui-image src="splash-top-left" class="absolute top-0 left-0" />
        <ui-image src="splash-bottom-right" class="absolute bottom-0 right-0" />
      </div>

      <nav
        data-testid="welcome-hero__nav"
        class="w-full max-w-(--page-width) mx-auto px-4 sm:px-16 flex justify-between items-center relative z-5"
      >
        <div data-testid="welcome-hero__brand" class="flex items-center gap-2 text-brown-100">
          <ui-image src="splash-logo" class="h-9" />
          <span class="text-2xl font-bold">{{ t('app.title') }}</span>
        </div>

        <ui-popover
          :open="login_dropdown_open"
          :gap="4"
          :use_arrow="false"
          :clip="false"
          position="bottom-end"
          @close="closeLoginDropdown"
        >
          <template #trigger>
            <button
              data-testid="welcome-hero__login-trigger"
              class="bg-brown-300 text-brown-700 px-4 py-2.5 rounded-2.5 text-lg cursor-pointer"
              :class="{ 'rounded-b-0.5': login_dropdown_open }"
              @click="triggerLoginDropdown"
            >
              {{ t('welcome-view.login-button') }}
            </button>
          </template>

          <LoginDialogue />
        </ui-popover>
      </nav>

      <div
        data-testid="welcome-hero__content"
        class="w-full max-w-(--page-width) mx-auto px-4 sm:px-16 mt-16 grid grid-cols-1 md:grid-cols-[400px_auto] gap-16 items-center justify-center relative z-3"
      >
        <div data-testid="welcome-hero__copy" class="flex flex-col items-start gap-7">
          <h1 class="text-7xl text-brown-100 font-bold leading-none">
            {{ t('welcome-view.hero.heading') }}
          </h1>

          <p class="text-lg text-brown-100 max-w-110">{{ t('welcome-view.hero.subheading') }}</p>

          <div data-testid="welcome-hero__actions" class="flex items-center gap-4">
            <ui-button
              size="xl"
              data-theme="brown-100"
              data-theme-dark="stone-700"
              icon-left="user-sticker-square"
              :sfx="{ press: 'double_pop_up' }"
              @press="signup()"
            >
              {{ t('welcome-view.signup-button') }}
            </ui-button>
          </div>
        </div>

        <div data-testid="welcome-hero__preview" class="flex justify-center md:justify-end pr-4">
          <pinned-preview
            :cover="preview_cover"
            :card_attributes="preview_attributes"
            :side="preview_side"
            @update:side="flipPreviewSide"
          />
        </div>
      </div>
    </section>
  </div>
</template>
