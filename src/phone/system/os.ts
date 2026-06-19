import { shallowRef } from 'vue'
import type { PhoneOS } from './types'

const _os = shallowRef<PhoneOS | null>(null)

export function registerPhoneOS(os: PhoneOS) {
  _os.value = os
}

export function usePhoneOS() {
  return _os
}
