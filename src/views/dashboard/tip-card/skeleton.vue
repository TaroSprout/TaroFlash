<template>
  <div
    data-testid="dashboard-tip-card-skeleton"
    class="mt-6 h-47.5 w-full rounded-4 relative hidden md:flex flex-col items-center justify-center gap-3 bg-skeleton px-10 shimmer"
  >
    <div
      data-testid="dashboard-tip-card-skeleton__tape"
      class="absolute -top-4 rotate-3 h-9 w-40 rounded-1 bg-skeleton bgx-diagonal-stripes bgx-size-15 bgx-opacity-40 bgx-color-(--color-skeleton-sheen)"
    ></div>

    <div
      class="h-6 w-24 bg-skeleton rounded-2 bgx-diagonal-stripes bgx-size-15 bgx-opacity-40 bgx-color-(--color-skeleton-sheen)"
    ></div>

    <div
      class="h-10 w-full max-w-80 bg-skeleton rounded-2 bgx-diagonal-stripes bgx-size-15 bgx-opacity-40 bgx-color-(--color-skeleton-sheen)"
    ></div>
  </div>
</template>
