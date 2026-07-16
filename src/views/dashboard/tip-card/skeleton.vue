<template>
  <div
    data-testid="dashboard-tip-card-skeleton"
    class="mt-6 w-full rounded-4 relative hidden md:flex flex-col items-center gap-3 bg-brown-200 dark:bg-stone-700 px-6 pt-8 pb-6"
  >
    <div
      data-testid="dashboard-tip-card-skeleton__tape"
      class="absolute -top-4 rotate-3 h-9 w-40 rounded-1 bg-brown-300 dark:bg-stone-900 animate-pulse bgx-diagonal-stripes bgx-size-15 bgx-opacity-40 bgx-color-(--color-brown-50) dark:bgx-color-(--color-grey-700)"
    ></div>

    <div
      class="mt-4 h-6 w-24 bg-brown-300 dark:bg-stone-900 rounded-2 animate-pulse bgx-diagonal-stripes bgx-size-15 bgx-opacity-40 bgx-color-(--color-brown-50) dark:bgx-color-(--color-grey-700)"
    ></div>

    <div
      class="h-24 w-full max-w-80 bg-brown-300 dark:bg-stone-900 rounded-2 animate-pulse bgx-diagonal-stripes bgx-size-15 bgx-opacity-40 bgx-color-(--color-brown-50) dark:bgx-color-(--color-grey-700)"
    ></div>
  </div>
</template>
