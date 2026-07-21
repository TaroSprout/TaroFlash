import { computed, inject, provide, toValue, type ComputedRef, type InjectionKey } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

/**
 * Ambient depth — the JS mirror of the `data-depth` attribute (src/styles/depth.css).
 *
 * CSS resolves depth through DOM ancestry on its own; this exists for the cases
 * where a component needs to KNOW its depth rather than merely inherit it:
 * stamping the next step onto a panel it owns, or reading it across a teleport
 * that severs DOM inheritance.
 *
 * The two must be kept in step. A component that provides a depth is also the
 * one that stamps `data-depth` on the matching element — never one without the
 * other, or the JS and CSS pictures drift.
 */
export type Depth = 0 | 1 | 2

const MAX_DEPTH: Depth = 2

const ambientDepthKey: InjectionKey<ComputedRef<Depth>> = Symbol('ambient-depth')

/** The depth of the surface this component sits on. Unattributed content is 0. */
export function useAmbientDepth(): ComputedRef<Depth> {
  const injected = inject(ambientDepthKey, null)
  return computed(() => injected?.value ?? 0)
}

/** One step up the ramp, clamped at the top — there is no surface above depth 2. */
export function nextDepth(depth: Depth): Depth {
  return Math.min(depth + 1, MAX_DEPTH) as Depth
}

/**
 * Declare the depth of the surface this component renders, for descendants.
 *
 * Callers must bind the returned value to `data-depth` on the element that
 * actually paints that surface.
 */
export function provideDepth(depth: MaybeRefOrGetter<Depth>): ComputedRef<Depth> {
  const resolved = computed(() => toValue(depth))
  provide(ambientDepthKey, resolved)
  return resolved
}

/**
 * Depth for a panel that floats one step above its context — a dropdown menu,
 * a popover body. Provides it too, so a dropdown opened from inside the panel
 * lands one step higher again.
 */
export function useNestedDepth(): ComputedRef<Depth> {
  const ambient = useAmbientDepth()
  return provideDepth(() => nextDepth(ambient.value))
}
