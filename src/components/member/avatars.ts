export const AVATAR_MODULES = import.meta.glob('../../assets/avatars/*.svg', {
  query: '?url',
  import: 'default'
}) as Record<string, () => Promise<string>>

function keyFromPath(path: string) {
  return path.replace(/^.*\//, '').replace(/\.svg$/, '')
}

export const AVATAR_KEYS = Object.keys(AVATAR_MODULES).map(keyFromPath)

/** Lazily loads the avatar SVG matching `key`, or null if no avatar has that key. */
export function loadAvatarUrl(key: string): Promise<string> | null {
  const path = Object.keys(AVATAR_MODULES).find((p) => keyFromPath(p) === key)
  return path ? AVATAR_MODULES[path]() : null
}
