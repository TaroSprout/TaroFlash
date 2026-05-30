<script setup lang="ts">
import { ref, computed, nextTick, Comment, Text, Fragment, type VNode } from 'vue'
import type { Placement } from '@floating-ui/vue'
import UiPopover from '@/components/ui-kit/popover.vue'
import { actionItemEnter, actionItemLeave } from '@/utils/animations/action-menu'
import { emitSfx } from '@/sfx/bus'
import type { NamespacedAudioKey } from '@/sfx/config'

defineOptions({ inheritAttrs: false })

type ActionMenuProps = {
  position?: Placement
  alignment?: 'start' | 'end' | 'center'
  gap?: number
  duration?: number
  closeOnAction?: boolean
  enterSfx?: NamespacedAudioKey | NamespacedAudioKey[]
}

const {
  position = 'bottom-end',
  alignment = 'start',
  gap = 4,
  duration = 0.3,
  closeOnAction = true,
  enterSfx = 'ui.click_07'
} = defineProps<ActionMenuProps>()

const ITEM_TWEEN_RATIO = 0.5

function play_item_sfx() {
  if (!enterSfx) return
  if (Array.isArray(enterSfx)) emitSfx(enterSfx, { debounce: 0 })
  else emitSfx(enterSfx as NamespacedAudioKey, { debounce: 0 })
}

function compute_timing(count: number) {
  if (count <= 1) return { item_duration: duration, stagger: 0 }
  const item_duration = duration * ITEM_TWEEN_RATIO
  const stagger = (duration - item_duration) / (count - 1)
  return { item_duration, stagger }
}

const alignment_class = {
  start: 'items-start',
  end: 'items-end',
  center: 'items-center'
} as const

type TriggerSlotProps = {
  toggle: () => void
  open: () => void
  close: () => void
  is_open: boolean
}

const slots = defineSlots<{
  default(): VNode[]
  trigger(props: TriggerSlotProps): VNode[]
}>()

const popover_open = ref(false)
const item_els = ref<HTMLElement[]>([])

function setItemRef(el: Element | null, index: number) {
  if (el instanceof HTMLElement) item_els.value[index] = el
}

function flatten(nodes: VNode[]): VNode[] {
  const out: VNode[] = []

  for (const vnode of nodes) {
    if (vnode.type === Comment) continue
    if (vnode.type === Text) continue
    if (vnode.type === Fragment) {
      out.push(...flatten((vnode.children as VNode[]) ?? []))
      continue
    }
    out.push(vnode)
  }

  return out
}

const items = computed(() => flatten(slots.default?.() ?? []))

function open_menu() {
  if (popover_open.value) return
  item_els.value = []
  popover_open.value = true

  nextTick(() => {
    const { item_duration, stagger } = compute_timing(item_els.value.length)

    item_els.value.forEach((el, i) => {
      if (!el) return
      const onStart = enterSfx ? play_item_sfx : undefined
      actionItemEnter(el, i, { stagger, duration: item_duration, onStart }, () => {})
    })
  })
}

async function close_menu() {
  if (!popover_open.value) return

  const last = item_els.value.length - 1
  const { item_duration, stagger } = compute_timing(item_els.value.length)

  await Promise.all(
    item_els.value.map(
      (el, i) =>
        new Promise<void>((resolve) => {
          if (!el) return resolve()
          const onStart = enterSfx ? play_item_sfx : undefined
          actionItemLeave(el, last - i, { stagger, duration: item_duration, onStart }, resolve)
        })
    )
  )

  popover_open.value = false
}

function toggle() {
  if (popover_open.value) close_menu()
  else open_menu()
}

function close() {
  close_menu()
}

function onItemsClick() {
  if (closeOnAction) close_menu()
}
</script>

<template>
  <ui-popover
    :open="popover_open"
    :position="position"
    :gap="gap"
    :use_arrow="false"
    data-testid="ui-kit-action-menu"
    v-bind="$attrs"
    :class="{ 'z-100': popover_open }"
    @close="close"
  >
    <template #trigger>
      <slot
        name="trigger"
        :toggle="toggle"
        :open="open_menu"
        :close="close"
        :is_open="popover_open"
      />
    </template>

    <div
      data-testid="ui-kit-action-menu__items"
      class="flex flex-col gap-0.5 bg-transparent"
      :class="alignment_class[alignment]"
      @click="onItemsClick"
    >
      <div
        v-for="(vnode, i) in items"
        :key="vnode.key ?? i"
        :ref="(el) => setItemRef(el as Element | null, i)"
        data-testid="ui-kit-action-menu__item"
        style="opacity: 0"
      >
        <component :is="vnode" />
      </div>
    </div>
  </ui-popover>
</template>
