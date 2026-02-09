<script setup lang="ts">
/**
 * WizardLabList.vue - Display labs for wizard selection
 */

interface Lab {
  id: string;
  title: string;
  description?: string;
  type: string;
  status?: string;
  createdAt: Date;
}

const props = defineProps<{
  labs: Lab[];
  isLoading: boolean;
  courseTitle?: string;
}>();

const emit = defineEmits<{
  (e: 'select', id: string): void;
  (e: 'create'): void;
  (e: 'back'): void;
}>();

const formatDate = (date: Date) => {
  const d = new Date(date);
  return d.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });
};
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
          Labs
        </h3>
        <p v-if="courseTitle" class="text-sm text-gray-500">{{ courseTitle }}</p>
      </div>
      <button
        @click="emit('create')"
        class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Create Lab
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg p-4 h-20" />
    </div>

    <!-- Empty State -->
    <div v-else-if="labs.length === 0" class="text-center py-12">
      <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <p class="text-gray-500 dark:text-gray-400 mb-4">No labs in this course</p>
      <button
        @click="emit('create')"
        class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
      >
        Create First Lab
      </button>
    </div>

    <!-- Lab List -->
    <div v-else class="space-y-3">
      <div
        v-for="lab in labs"
        :key="lab.id"
        @click="emit('select', lab.id)"
        class="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer transition-colors group"
      >
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h4 class="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                {{ lab.title }}
              </h4>
              <span 
                class="px-2 py-0.5 rounded text-xs font-medium"
                :class="lab.type === 'exam' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'"
              >
                {{ lab.type === 'exam' ? 'Exam' : 'Lab' }}
              </span>
            </div>
            <p v-if="lab.description" class="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
              {{ lab.description }}
            </p>
          </div>
          <svg class="w-5 h-5 text-gray-400 group-hover:text-blue-500 flex-shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>
