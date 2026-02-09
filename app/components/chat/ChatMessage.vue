<script setup lang="ts">
/**
 * ChatMessage.vue - Single chat message component
 * Displays user/model messages with draft preview support
 */

interface Props {
  messageId: string;
  role: 'user' | 'model' | 'system';
  textContent: string;
  humanReadablePreview?: string;
  jsonPreview?: Record<string, any>;
  functionCall?: {
    name: string;
    args: Record<string, any>;
    status: 'pending' | 'approved' | 'rejected' | 'executed';
  };
  isStreaming?: boolean;
  timestamp: Date;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'confirm', messageId: string): void;
  (e: 'reject', messageId: string): void;
}>();

const showJson = ref(false);

const formattedTime = computed(() => {
  const date = new Date(props.timestamp);
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
});

const roleLabel = computed(() => {
  switch (props.role) {
    case 'user': return 'You';
    case 'model': return 'Gemini';
    case 'system': return 'System';
  }
});

const isPending = computed(() => props.functionCall?.status === 'pending');
const isExecuted = computed(() => props.functionCall?.status === 'executed');
const isRejected = computed(() => props.functionCall?.status === 'rejected');
</script>

<template>
  <div
    class="flex gap-3 p-4"
    :class="{
      'bg-gray-50 dark:bg-gray-800/50': role === 'user',
      'bg-white dark:bg-gray-900': role === 'model',
      'bg-blue-50 dark:bg-blue-900/20': role === 'system'
    }"
  >
    <!-- Avatar -->
    <div class="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
      <!-- User Icon -->
      <svg v-if="role === 'user'" class="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
      <!-- Bot Icon -->
      <svg v-else-if="role === 'model'" class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
      <!-- System Icon -->
      <svg v-else class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <!-- Role label -->
      <div class="flex items-center gap-2 mb-1">
        <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
          {{ roleLabel }}
        </span>
        <span class="text-xs text-gray-500">{{ formattedTime }}</span>
        <span v-if="isStreaming" class="text-xs text-blue-500 animate-pulse">Typing...</span>
      </div>

      <!-- Text content -->
      <div 
        class="prose prose-sm dark:prose-invert max-w-none"
        v-html="textContent.replace(/\n/g, '<br>')"
      />

      <!-- Draft Preview -->
      <div 
        v-if="humanReadablePreview"
        class="mt-3 p-4 rounded-lg border-2"
        :class="{
          'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20': isPending,
          'border-green-400 bg-green-50 dark:bg-green-900/20': isExecuted,
          'border-red-400 bg-red-50 dark:bg-red-900/20': isRejected
        }"
      >
        <!-- Preview content (Markdown) -->
        <div 
          class="prose prose-sm dark:prose-invert max-w-none"
          v-html="humanReadablePreview.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')"
        />

        <!-- JSON toggle -->
        <div v-if="jsonPreview" class="mt-3">
          <button
            @click="showJson = !showJson"
            class="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
          >
            <svg class="w-3 h-3 transition-transform" :class="{ 'rotate-90': showJson }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            {{ showJson ? 'Hide JSON' : 'Show JSON' }}
          </button>
          <pre 
            v-if="showJson"
            class="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto max-h-48"
          >{{ JSON.stringify(jsonPreview, null, 2) }}</pre>
        </div>

        <!-- Action buttons -->
        <div v-if="isPending" class="mt-4 flex gap-2">
          <button
            @click="emit('confirm', messageId)"
            class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium text-sm flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Confirm
          </button>
          <button
            @click="emit('reject', messageId)"
            class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium text-sm flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel
          </button>
        </div>

        <!-- Status badges -->
        <div v-if="isExecuted" class="mt-3 text-green-600 dark:text-green-400 text-sm font-medium flex items-center gap-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Created successfully
        </div>
        <div v-if="isRejected" class="mt-3 text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Cancelled
        </div>
      </div>
    </div>
  </div>
</template>
