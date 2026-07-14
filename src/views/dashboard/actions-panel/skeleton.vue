<template>
  <div
    data-testid="dashboard-actions-panel-skeleton"
    class="bg-brown-200 dark:bg-grey-800 rounded-8 relative flex flex-col w-full max-w-100 animate-pulse"
  >
    <div
      data-testid="dashboard-actions-panel-skeleton__header"
      class="h-11 w-40 bg-brown-300 dark:bg-grey-700 rounded-sm m-6 mb-0"
    ></div>

    <div
      data-testid="dashboard-actions-panel-skeleton__body"
      class="flex flex-col gap-6 px-4 pt-8 pb-6"
    >
      <div class="h-14 w-full bg-brown-300 dark:bg-grey-700 rounded-lg max-mxl:hidden"></div>
      <div class="h-14 w-full bg-brown-300 dark:bg-grey-700 rounded-lg max-mxl:hidden!"></div>
    </div>
  </div>
</template>
