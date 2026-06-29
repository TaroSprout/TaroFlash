import { inject, provide, ref, type InjectionKey, type Ref } from 'vue'
import type { Grade } from 'ts-fsrs'

export const PrimedGradeKey: InjectionKey<Ref<Grade | null>> = Symbol('study-session.primed-grade')

export function providePrimedGrade(grade: Ref<Grade | null>) {
  provide(PrimedGradeKey, grade)
}

export function usePrimedGrade(): Ref<Grade | null> {
  return inject(PrimedGradeKey, ref<Grade | null>(null))
}
