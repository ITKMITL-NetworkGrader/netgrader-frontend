<script setup lang="ts">
/**
 * GeminiChat.vue - Main chat container
 * Always renders as chat view with AI mode active.
 * Context (Course/Lab/Part) is selected at session creation time.
 */
import ChatMessage from './ChatMessage.vue';

const props = withDefaults(defineProps<{
  showHeader?: boolean;
}>(), {
  showHeader: true
});

const { 
  session,
  messages,
  isLoading,
  isStreaming,
  error,
  createSession,
  sendMessage,
  confirmDraft,
  rejectDraft,
  closeSession,
  // Wizard
  wizardState,
  isInAIMode
} = useGeminiChat();

const inputMessage = ref('');
const messagesContainer = ref<HTMLElement | null>(null);

// Auto-scroll to bottom
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

watch(messages, scrollToBottom, { deep: true });

// Handle send
const handleSend = async () => {
  if (!inputMessage.value.trim() || isStreaming.value) return;
  const message = inputMessage.value;
  inputMessage.value = '';
  await sendMessage(message);
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};

const handleConfirm = async (messageId: string) => {
  await confirmDraft(messageId);
};

const handleReject = async (messageId: string) => {
  await rejectDraft(messageId);
};

// Step labels
const stepLabel = computed(() => {
  const labels: Record<string, string> = {
    'course_list': 'Courses',
    'course_create': 'Create Course',
    'course_edit': 'Edit Course',
    'lab_list': 'Labs',
    'lab_create': 'Create Lab',
    'lab_edit_menu': 'Edit Lab',
    'lab_edit': 'Editing Lab',
    'part_list': 'Parts',
    'part_create': 'Create Part',
    'part_edit': 'Edit Part'
  };
  return labels[wizardState.value.step] || 'Chat';
});
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden">
    <!-- Header (optional) -->
    <div 
      v-if="showHeader"
      class="flex items-center justify-between px-4 py-3 border-b border-blue-100 dark:border-gray-700 bg-blue-50 dark:bg-gray-800"
    >
      <div class="flex items-center gap-3">
        <svg class="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Gemini Assistant</h2>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ stepLabel }}</p>
        </div>
      </div>
      <button
        @click="closeSession"
        class="p-2 hover:bg-blue-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        title="Close"
      >
        <svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Error banner -->
    <div 
      v-if="error"
      class="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm flex items-center gap-2"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      {{ error }}
    </div>

    <!-- ============================================================ -->
    <!-- Main Content: Messages -->
    <!-- ============================================================ -->
    <div 
      ref="messagesContainer"
      class="flex-1 overflow-y-auto p-4 space-y-4"
    >
      <!-- Chat messages -->
      <TransitionGroup name="message" tag="div" class="space-y-4">
        <ChatMessage
          v-for="msg in messages"
          :key="msg.messageId"
          :message-id="msg.messageId"
          :role="msg.role"
          :text-content="msg.textContent"
          :human-readable-preview="msg.humanReadablePreview"
          :json-preview="msg.jsonPreview"
          :function-call="msg.functionCall"
          :is-streaming="msg.isStreaming"
          :timestamp="msg.timestamp"
          @confirm="handleConfirm"
          @reject="handleReject"
        />
      </TransitionGroup>

      <!-- Empty state when no messages -->
      <div v-if="messages.length === 0 && !isLoading" class="flex items-center justify-center h-full">
        <div class="text-center text-gray-400 dark:text-gray-500">
          <svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p class="text-sm">Start typing to chat with Gemini</p>
        </div>
      </div>
    </div>

    <!-- Input area (always shown when session is active) -->
    <div v-if="session" class="border-t border-gray-200 dark:border-gray-700 p-4">
      <div class="flex gap-3">
        <textarea
          v-model="inputMessage"
          @keydown="handleKeydown"
          :disabled="isStreaming"
          placeholder="Type your message..."
          rows="1"
          class="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 border-0 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          @click="handleSend"
          :disabled="!inputMessage.trim() || isStreaming"
          class="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
        >
          <svg v-if="isStreaming" class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span v-else>Send</span>
        </button>
      </div>
      <p class="mt-2 text-xs text-gray-500 text-center">
        Press Enter to send / Shift+Enter for new line
      </p>

      <!-- Context Display Bar -->
      <div 
        v-if="wizardState.courseId || wizardState.labId || wizardState.partId"
        class="mt-3 p-2 bg-blue-50 dark:bg-gray-800 rounded-lg border border-blue-100 dark:border-gray-700"
      >
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span class="text-gray-500 dark:text-gray-400">Context:</span>
          <span v-if="wizardState.courseId" class="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded font-mono">
            Course: {{ wizardState.courseId.slice(0, 8) }}...
          </span>
          <span v-if="wizardState.labId" class="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded font-mono">
            Lab: {{ wizardState.labId.slice(0, 8) }}...
          </span>
          <span v-if="wizardState.partId" class="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded font-mono">
            Part: {{ wizardState.partId.slice(0, 8) }}...
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message-enter-active,
.message-leave-active {
  transition: all 0.3s ease;
}
.message-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.message-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
