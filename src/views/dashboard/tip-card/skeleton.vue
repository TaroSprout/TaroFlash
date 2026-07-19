<template>
  <div
    data-testid="dashboard-tip-card-skeleton"
    class="mt-6 h-47.5 w-full rounded-4 relative hidden md:flex flex-col items-center justify-center gap-3 bg-element px-10"
  >
    <div
      data-testid="dashboard-tip-card-skeleton__tape"
      class="absolute -top-4 rotate-3 h-9 w-40 rounded-1 bg-brown-300 dark:bg-stone-900 animate-pulse bgx-diagonal-stripes bgx-size-15 bgx-opacity-40 bgx-color-(--color-brown-50) dark:bgx-color-(--color-stone-500)"
    ></div>

    <div
      class="h-6 w-24 bg-brown-300 dark:bg-stone-900 rounded-2 animate-pulse bgx-diagonal-stripes bgx-size-15 bgx-opacity-40 bgx-color-(--color-brown-50) dark:bgx-color-(--color-stone-500)"
    ></div>

    <div
      class="h-10 w-full max-w-80 bg-brown-300 dark:bg-stone-900 rounded-2 animate-pulse bgx-diagonal-stripes bgx-size-15 bgx-opacity-40 bgx-color-(--color-brown-50) dark:bgx-color-(--color-stone-500)"
    ></div>
  </div>
</template>
