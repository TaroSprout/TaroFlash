import { describe, test, expect } from 'vite-plus/test'

import { DURATIONS, EASINGS, TRAVEL } from '@/utils/motion/vocabulary'

describe('motion vocabulary', () => {
  test('every duration exposes its ms value and the equivalent GSAP seconds', () => {
    expect(DURATIONS[300]).toEqual({ ms: 300, s: 0.3 })
    expect(DURATIONS[0]).toEqual({ ms: 0, s: 0 })
  })

  test('every easing pairs a GSAP ease string with an equivalent CSS cubic-bezier', () => {
    expect(EASINGS.out).toEqual({ gsap: 'power2.out', css: 'cubic-bezier(0, 0, 0.2, 1)' })
    expect(EASINGS['spring-strong']).toEqual({
      gsap: 'back.out(2)',
      css: 'cubic-bezier(0.34, 1.8, 0.64, 1)'
    })
  })

  test('travel steps are keyed by their own pixel value', () => {
    for (const [key, value] of Object.entries(TRAVEL)) {
      expect(value).toBe(Number(key))
    }
  })
})
