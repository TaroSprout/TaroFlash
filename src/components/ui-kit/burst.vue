<script setup lang="ts">
export type BurstSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl'

const {
  size = 'base',
  duration = 350,
  width
} = defineProps<{
  size?: BurstSize
  duration?: number
  /** Streak width in px. Defaults to 6. */
  width?: number
}>()

const emit = defineEmits<{ done: [] }>()
</script>

<template>
  <div
    data-testid="ui-kit-burst"
    class="burst"
    :class="`burst--${size}`"
    :style="{
      '--burst-dur': `${duration}ms`,
      ...(width !== undefined && { '--burst-dot-size': `${width}px` })
    }"
    @animationend.once="emit('done')"
  >
    <div class="spoke" style="--i: 0"><span class="dot bg-(--color-accent)"></span></div>
    <div class="spoke" style="--i: 1"><span class="dot bg-(--color-accent)"></span></div>
    <div class="spoke" style="--i: 2"><span class="dot bg-(--color-accent)"></span></div>
    <div class="spoke" style="--i: 3"><span class="dot bg-(--color-accent)"></span></div>
    <div class="spoke" style="--i: 4"><span class="dot bg-(--color-accent)"></span></div>
    <div class="spoke" style="--i: 5"><span class="dot bg-(--color-accent)"></span></div>
    <div class="spoke" style="--i: 6"><span class="dot bg-(--color-accent)"></span></div>
    <div class="spoke" style="--i: 7"><span class="dot bg-(--color-accent)"></span></div>
  </div>
</template>

<style>
@property --p {
  syntax: '<number>';
  inherits: true;
  initial-value: 0;
}
@property --radius {
  syntax: '<length>';
  inherits: true;
  initial-value: 0px;
}
@property --spoke-length {
  syntax: '<length>';
  inherits: true;
  initial-value: 0px;
}

.burst {
  --n: 8;
  --dot-size: var(--burst-dot-size, 6px);
  --spoke-min: var(--dot-size);
  --spoke-max: 25px;

  animation: burstProgress var(--burst-dur, 500ms) ease-out forwards;

  --radius: calc(var(--radius-start) + (var(--radius-end) - var(--radius-start)) * var(--p));
  --tri: min(calc(2 * var(--p)), calc(2 - 2 * var(--p)));
  --spoke-length: calc(var(--spoke-min) + (var(--spoke-max) - var(--spoke-min)) * var(--tri));

  position: absolute;
  width: calc(var(--radius) * 2);
  height: calc(var(--radius) * 2);
}

.burst--xs {
  --radius-start: 10px;
  --radius-end: 20px;
}
.burst--sm {
  --radius-start: 20px;
  --radius-end: 40px;
}
.burst--base {
  --radius-start: 30px;
  --radius-end: 50px;
}
.burst--lg {
  --radius-start: 40px;
  --radius-end: 80px;
}
.burst--xl {
  --radius-start: 80px;
  --radius-end: 160px;
}

.burst .spoke {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0;
  height: 0;
  transform: rotate(calc(360deg * var(--i) / var(--n)));
  transform-origin: 0 0;
}

.burst .dot {
  position: absolute;
  left: 0;
  top: 0;
  width: var(--dot-size);
  height: var(--spoke-length);
  border-radius: 9999px;
  transform-origin: 50% 0%;
  translate: calc(-0.5 * var(--dot-size)) 0;
  transform: translateY(var(--radius));
}

@keyframes burstProgress {
  0% {
    --p: 0;
    opacity: 1;
  }
  60% {
    --p: 1;
    opacity: 1;
  }
  100% {
    --p: 1;
    opacity: 0;
  }
}
</style>
