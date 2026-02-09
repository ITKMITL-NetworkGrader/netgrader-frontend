<script setup lang="ts">
/**
 * WizardLabEditMenu.vue - Menu for selecting lab edit section
 */

const props = defineProps<{
  labTitle?: string;
}>();

const emit = defineEmits<{
  (e: 'select', section: 'basic' | 'network' | 'parts'): void;
  (e: 'back'): void;
}>();

const editSections = [
  {
    id: 'basic' as const,
    title: 'Basic Information',
    description: 'Title, description, type, and settings',
    icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
  },
  {
    id: 'network' as const,
    title: 'Network Configuration',
    description: 'Topology, IP addressing, and subnets',
    icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9'
  },
  {
    id: 'parts' as const,
    title: 'Parts & Tasks',
    description: 'Manage lab parts and grading tasks',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'
  }
];
</script>

<template>
  <div class="p-4">
    <!-- Back button and Header -->
    <div class="flex items-center gap-3 mb-6">
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
          Edit Lab
        </h3>
        <p v-if="labTitle" class="text-sm text-gray-500">{{ labTitle }}</p>
      </div>
    </div>

    <!-- Edit Sections -->
    <div class="space-y-3">
      <div
        v-for="section in editSections"
        :key="section.id"
        @click="emit('select', section.id)"
        class="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer transition-colors group"
      >
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="section.icon" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
              {{ section.title }}
            </h4>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ section.description }}
            </p>
          </div>
          <svg class="w-5 h-5 text-gray-400 group-hover:text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>
