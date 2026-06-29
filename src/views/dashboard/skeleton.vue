<script setup lang="ts"></script>

<template>
  <div
    data-testid="dashboard-skeleton"
    class="grid grid-cols-[1fr] md:grid-cols-[345px_1fr] md:grid-rows-[auto_1fr] gap-x-15.5 gap-y-6 md:gap-y-11.5 h-full px-(--page-px) pt-(--page-pt) pb-12 animate-pulse"
  >
    <div
      data-testid="dashboard-skeleton__create-button"
      class="h-12 w-full bg-brown-300 dark:bg-grey-700 rounded-lg max-md:row-start-4"
    ></div>

    <div
      data-testid="dashboard-skeleton__title"
      class="h-10 w-40 bg-brown-300 dark:bg-grey-700 rounded-sm max-md:row-start-2"
    ></div>

    <div
      data-testid="dashboard-skeleton__inbox"
      class="h-64 w-full bg-brown-200 dark:bg-grey-800 rounded-xl"
    ></div>

    <div
      data-testid="dashboard-skeleton__decks"
      class="flex gap-x-6.5 gap-y-8 flex-wrap md:col-start-2"
    >
      <div v-for="n in 6" :key="n" class="h-64 w-44 bg-brown-200 dark:bg-grey-800 rounded-xl"></div>
    </div>
  </div>
</template>
