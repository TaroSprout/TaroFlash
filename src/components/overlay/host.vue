<script setup lang="ts">
import type { OverlayEntry as OverlayEntryModel } from '@/stores/overlay-stack'
import { useOverlayStore } from '@/stores/overlay-stack'
import { playEnter, playLeave } from '@/utils/animations/overlay'
import { useOverlayGuards } from './use-overlay-guards'
import { useOverlayRecede } from './use-overlay-recede'
import OverlayBackdrop from './backdrop.vue'
import OverlayEntry from './overlay-entry.vue'

const store = useOverlayStore()
const { receded_ids, setOverlayEl, getOverlayEl } = useOverlayRecede()

useOverlayGuards(requestClose, () => getOverlayEl(store.entries.at(-1)?.id))

/**
 * The single close pipeline every origin (backdrop, esc, window close button)
 * funnels through. Runs the entry's veto `interceptor` and, when allowed,
 * removes it from the stack — the `<transition-group>` leave hook plays the
 * exit animation as the entry drops out.
 */
async function requestClose(entry: OverlayEntryModel) {
  const allowed = (await entry.interceptor?.()) ?? true
  if (allowed) store.remove(entry.id)
}

function onBeforeEnter(el: Element) {
  const html_el = el as HTMLElement
  const id = html_el.dataset.overlayId
  if (id) setOverlayEl(id, html_el)
}

function onEnter(el: Element, done: () => void) {
  const html_el = el as HTMLElement
  void playEnter(html_el).done.then(done)
}

function onAfterEnter(el: Element) {
  const id = (el as HTMLElement).dataset.overlayId
  store.entries.find((entry) => entry.id === id)?.markEntered()
}

function onLeave(el: Element, done: () => void) {
  const html_el = el as HTMLElement
  void playLeave(html_el).done.then(done)
}

function onAfterLeave(el: Element) {
  const id = (el as HTMLElement).dataset.overlayId
  if (id) setOverlayEl(id, null)
}
</script>

<template>
  <overlay-backdrop :request-close="requestClose" />

  <transition-group
    :css="false"
    tag="div"
    data-testid="overlay-host"
    class="pointer-events-none fixed inset-0 z-90"
    @before-enter="onBeforeEnter"
    @enter="onEnter"
    @after-enter="onAfterEnter"
    @leave="onLeave"
    @after-leave="onAfterLeave"
  >
    <overlay-entry
      v-for="entry in store.entries"
      :key="entry.id"
      :entry="entry"
      :inert="receded_ids.has(entry.id)"
      :receded="receded_ids.has(entry.id)"
      :request-close="requestClose"
    />
  </transition-group>
</template>
