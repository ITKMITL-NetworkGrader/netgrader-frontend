<script setup lang="ts">
/**
 * WizardPartList.vue - Display parts for wizard selection
 */

interface Part {
  id: string;
  title: string;
  description?: string;
  order: number;
  createdAt: Date;
}

const props = defineProps<{
  parts: Part[];
  isLoading: boolean;
  labTitle?: string;
}>();

const emit = defineEmits<{
  (e: 'select', id: string): void;
  (e: 'create'): void;
  (e: 'back'): void;
}>();
</script>

<template>
  <div class="p-4">
    <!-- Back button and Header -->
    <div class="flex items-center gap-3 mb-4">
      <button
        @click="emit('back')"
        class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        <svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div class="flex-1">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          Parts
        </h3>
        <p v-if="labTitle" class="text-sm text-gray-500">{{ labTitle }}</p>
      </div>
      <button
        @click="emit('create')"
        class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Create Part
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg p-4 h-16" />
    </div>

    <!-- Empty State -->
    <div v-else-if="parts.length === 0" class="text-center py-12">
      <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
      <p class="text-gray-500 dark:text-gray-400 mb-4">No parts in this lab</p>
      <button
        @click="emit('create')"
        class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
      >
        Create First Part
      </button>
    </div>

    <!-- Part List -->
    <div v-else class="space-y-2">
      <div
        v-for="part in [...parts].sort((a, b) => a.order - b.order)"
        :key="part.id"
        @click="emit('select', part.id)"
        class="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer transition-colors group flex items-center gap-3"
      >
        <div class="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-400">
          {{ part.order }}
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
            {{ part.title }}
          </h4>
          <p v-if="part.description" class="text-sm text-gray-500 dark:text-gray-400 truncate">
            {{ part.description }}
          </p>
        </div>
        <svg class="w-5 h-5 text-gray-400 group-hover:text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  </div>
</template>
