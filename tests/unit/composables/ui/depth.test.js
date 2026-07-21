import { describe, test, expect, afterEach } from 'vite-plus/test'
import { createApp, h, nextTick, ref } from 'vue'
import { nextDepth, provideDepth, useAmbientDepth, useNestedDepth } from '@/composables/ui/depth'

// depth.ts leans on provide/inject, which needs a real component tree — a
// bare `withSetup` single instance can't exercise parent → child inheritance.
// These helpers build minimal render-function trees per testing-browser-mode's
// "no template strings" rule (also applies here since Vue's runtime-only
// build has no template compiler).
function mountTree(nodes) {
  let app
  const results = {}

  function build(node) {
    return {
      setup() {
        results[node.name] = node.run()
        return () => (node.children ? node.children.map(build).map((c) => h(c)) : null)
      }
    }
  }

  app = createApp(build(nodes))
  app.mount(document.createElement('div'))
  return { results, app }
}

describe('nextDepth', () => {
  test('steps up by one', () => {
    expect(nextDepth(0)).toBe(1)
    expect(nextDepth(1)).toBe(2)
  })

  test('clamps at the max depth (2)', () => {
    expect(nextDepth(2)).toBe(2)
  })
})

describe('useAmbientDepth', () => {
  let app

  afterEach(() => app?.unmount())

  test('defaults to 0 with no ambient provider', () => {
    const { results, app: mounted } = mountTree({
      name: 'root',
      run: () => useAmbientDepth()
    })
    app = mounted

    expect(results.root.value).toBe(0)
  })

  test('a child reads the depth its parent provided', () => {
    const { results, app: mounted } = mountTree({
      name: 'parent',
      run: () => provideDepth(1),
      children: [{ name: 'child', run: () => useAmbientDepth() }]
    })
    app = mounted

    expect(results.child.value).toBe(1)
  })

  test('stays reactive when the provided depth is a ref', async () => {
    const source = ref(0)
    const { results, app: mounted } = mountTree({
      name: 'parent',
      run: () => provideDepth(source),
      children: [{ name: 'child', run: () => useAmbientDepth() }]
    })
    app = mounted

    expect(results.child.value).toBe(0)
    source.value = 1
    await nextTick()
    expect(results.child.value).toBe(1)
  })

  test('grandchild inherits through an intermediate provider that does not re-provide', () => {
    const { results, app: mounted } = mountTree({
      name: 'grandparent',
      run: () => provideDepth(1),
      children: [
        {
          name: 'parent',
          run: () => useAmbientDepth(),
          children: [{ name: 'grandchild', run: () => useAmbientDepth() }]
        }
      ]
    })
    app = mounted

    expect(results.parent.value).toBe(1)
    expect(results.grandchild.value).toBe(1)
  })
})

describe('provideDepth', () => {
  let app

  afterEach(() => app?.unmount())

  test('returns a computed carrying the resolved depth', () => {
    const { results, app: mounted } = mountTree({
      name: 'root',
      run: () => provideDepth(2)
    })
    app = mounted

    expect(results.root.value).toBe(2)
  })
})

describe('useNestedDepth', () => {
  let app

  afterEach(() => app?.unmount())

  test('is one step above the ambient depth', () => {
    const { results, app: mounted } = mountTree({
      name: 'parent',
      run: () => provideDepth(0),
      children: [{ name: 'nested', run: () => useNestedDepth() }]
    })
    app = mounted

    expect(results.nested.value).toBe(1)
  })

  test('clamps at the max depth instead of stepping past it', () => {
    const { results, app: mounted } = mountTree({
      name: 'parent',
      run: () => provideDepth(2),
      children: [{ name: 'nested', run: () => useNestedDepth() }]
    })
    app = mounted

    expect(results.nested.value).toBe(2)
  })

  test('re-provides its own depth for further nesting', () => {
    const { results, app: mounted } = mountTree({
      name: 'parent',
      run: () => provideDepth(0),
      children: [
        {
          name: 'nested',
          run: () => useNestedDepth(),
          children: [{ name: 'grandchild', run: () => useAmbientDepth() }]
        }
      ]
    })
    app = mounted

    expect(results.nested.value).toBe(1)
    expect(results.grandchild.value).toBe(1)
  })
})
