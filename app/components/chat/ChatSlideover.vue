<script setup lang="ts">
/**
 * ChatSlideover.vue - Slideover chat panel accessible from NavBar
 * Opens from the right side with session list and chat functionality
 */
import GeminiChat from './GeminiChat.vue';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
}>();

const {
  session,
  sessionList,
  listSessions,
  selectSession,
  createSession,
  isLoading
} = useGeminiChat();

const showSessionList = ref(true);

const close = () => {
  emit('update:open', false);
};

// Load sessions when opened
watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    await listSessions();
    // Auto-select most recent if no session active
    if (!session.value && sessionList.value.length > 0) {
      await selectSession(sessionList.value[0].sessionId);
    }
  }
}, { immediate: true });

// Format date for display
const formatDate = (date: Date) => {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });
};

// Handle new chat creation
const handleNewChat = async () => {
  await createSession();
  await listSessions();
};

// Handle session selection
const handleSelectSession = async (sessionId: string) => {
  await selectSession(sessionId);
};

// Close on escape key
onMounted(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && props.open) {
      close();
    }
  };
  document.addEventListener('keydown', handleEscape);
  onUnmounted(() => {
    document.removeEventListener('keydown', handleEscape);
  });
});
</script>

<template>
  <!-- Backdrop -->
  <Transition
    enter-active-class="transition-opacity duration-300"
    leave-active-class="transition-opacity duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="open"
      class="fixed inset-0 bg-black/50 z-40"
      @click="close"
    />
  </Transition>

  <!-- Slideover Panel -->
  <Transition
    enter-active-class="transition-transform duration-300 ease-out"
    leave-active-class="transition-transform duration-200 ease-in"
    enter-from-class="translate-x-full"
    enter-to-class="translate-x-0"
    leave-from-class="translate-x-0"
    leave-to-class="translate-x-full"
  >
    <div
      v-if="open"
      class="fixed right-0 top-0 h-full w-full max-w-2xl bg-background shadow-2xl z-50 flex"
    >
      <!-- Session List Sidebar -->
      <div 
        v-if="showSessionList"
        class="w-64 border-r border-border bg-muted/30 flex flex-col"
      >
        <!-- Sidebar Header -->
        <div class="p-3 border-b border-border">
          <button
            @click="handleNewChat"
            :disabled="isLoading"
            class="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span class="text-lg">+</span>
            <span>New Chat</span>
          </button>
        </div>

        <!-- Session List -->
        <div class="flex-1 overflow-y-auto">
          <div v-if="sessionList.length === 0" class="p-4 text-center text-muted-foreground text-sm">
            No chat history
          </div>
          <div 
            v-for="s in sessionList"
            :key="s.sessionId"
            @click="handleSelectSession(s.sessionId)"
            class="p-3 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors"
            :class="{ 'bg-muted': session?.sessionId === s.sessionId }"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium truncate">
                Chat Session
              </span>
              <span 
                class="text-xs px-1.5 py-0.5 rounded"
                :class="s.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'"
              >
                {{ s.status === 'active' ? 'Active' : 'Expired' }}
              </span>
            </div>
            <div class="text-xs text-muted-foreground mt-1">
              {{ formatDate(s.lastMessageAt) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Main Chat Area -->
      <div class="flex-1 flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-blue-100 dark:border-gray-700 bg-blue-50 dark:bg-gray-800">
          <div class="flex items-center gap-3">
            <!-- Toggle sidebar button -->
            <button
              @click="showSessionList = !showSessionList"
              class="p-1.5 hover:bg-blue-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Toggle history"
            >
              <svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Gemini Assistant</h2>
              <p class="text-xs text-gray-500 dark:text-gray-400">Course, Lab, Part Management</p>
            </div>
          </div>
          <button
            @click="close"
            class="p-2 hover:bg-blue-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Close"
          >
            <svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Chat Content -->
        <div class="flex-1 overflow-hidden">
          <GeminiChat v-if="open" :show-header="false" class="h-full" />
        </div>
      </div>
    </div>
  </Transition>
</template>
