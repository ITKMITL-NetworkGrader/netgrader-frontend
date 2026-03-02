<script setup lang="ts">
/**
 * Task Generator - Chat page with session management + optional pipeline mode
 * Flow: Open page > fetch sessions > create/select session > chat OR run pipeline
 */
import { marked } from 'marked';

marked.setOptions({ breaks: true, gfm: true });

const renderMarkdown = (text: string): string => {
  if (!text) return '';
  return marked.parse(text, { async: false }) as string;
};

const {
  currentSession,
  sessionList,
  messages,
  isLoading,
  isLoadingSessions,
  error,
  fetchSessions,
  createSession,
  selectSession,
  deleteSession,
  closeSession,
  sendMessage,
  // Pipeline
  pipelineMode,
  pipelineState,
  togglePipelineMode,
  resetPipeline,
  runPipeline
} = useTaskGenerator();

const inputMessage = ref('');
const newSessionTitle = ref('');
const showCreateDialog = ref(false);
const messagesContainer = ref<HTMLElement | null>(null);

// Fetch sessions on page load
onMounted(() => {
  fetchSessions();
});

// Auto-scroll to bottom
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

watch(messages, scrollToBottom, { deep: true });

// Handle send (chat or pipeline depending on mode)
const handleSend = async () => {
  const msg = inputMessage.value.trim();
  if (!msg || isLoading.value) return;
  inputMessage.value = '';

  if (pipelineMode.value) {
    await runPipeline(msg);
  } else {
    await sendMessage(msg);
  }
};

// Handle keyboard
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};

// Handle create session
const handleCreateSession = async () => {
  const title = newSessionTitle.value.trim() || undefined;
  const success = await createSession(title);
  if (success) {
    newSessionTitle.value = '';
    showCreateDialog.value = false;
  }
};

// Handle delete session
const handleDeleteSession = async (sessionId: string) => {
  await deleteSession(sessionId);
};

// Format time
const formatTime = (date: Date) => {
  return new Date(date).toLocaleString('en-GB', { hour12: false });
};

const formatRelativeTime = (date: Date) => {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

// Pipeline step definitions
const pipelineSteps = [
  { id: 1, label: 'Extract Intent', icon: 'i-heroicons-magnifying-glass' },
  { id: 2, label: 'Decompose Tasks', icon: 'i-heroicons-list-bullet' },
  { id: 3, label: 'Check Scripts', icon: 'i-heroicons-document-magnifying-glass' },
  { id: 4, label: 'Generate Missing', icon: 'i-heroicons-code-bracket' },
  { id: 5, label: 'Execute Tasks', icon: 'i-heroicons-play' },
  { id: 6, label: 'Results', icon: 'i-heroicons-chart-bar' }
];

// Get step status
const getStepStatus = (stepId: number) => {
  const ps = pipelineState.value;
  if (ps.status === 'idle') return 'pending';
  if (ps.status === 'error' && ps.currentStep < stepId) return 'pending';
  if (ps.status === 'error' && ps.currentStep === stepId) return 'error';
  if (ps.currentStep > stepId) return 'completed';
  if (ps.currentStep === stepId && ps.status === 'running') return 'running';
  if (ps.currentStep === stepId && ps.status === 'completed') return 'completed';
  return 'pending';
};

// Format JSON for display
const formatJson = (obj: any) => {
  if (!obj) return '';
  return JSON.stringify(obj, null, 2);
};
</script>

<template>
  <div class="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">

    <!-- ================================================================ -->
    <!-- Session List View (when no session is selected)                   -->
    <!-- ================================================================ -->
    <div v-if="!currentSession" class="max-w-3xl mx-auto px-6 py-8">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Task Generator</h1>
            <p class="text-sm text-gray-500 dark:text-gray-400">Chat with Gemini AI to generate tasks</p>
          </div>
        </div>
        <button
          @click="showCreateDialog = true"
          class="px-4 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white rounded-xl font-medium text-sm transition-all duration-200 shadow-lg shadow-violet-500/20 flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          New Session
        </button>
      </div>

      <!-- Create Session Dialog -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        leave-active-class="transition-all duration-150 ease-in"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="showCreateDialog" class="mb-6 p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Create New Session</h3>
          <div class="flex gap-3">
            <input
              v-model="newSessionTitle"
              @keydown.enter="handleCreateSession"
              placeholder="Session name (optional)"
              class="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              autofocus
            />
            <button
              @click="handleCreateSession"
              :disabled="isLoading"
              class="px-5 py-2.5 bg-violet-500 hover:bg-violet-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg font-medium text-sm transition-colors"
            >
              Create
            </button>
            <button
              @click="showCreateDialog = false"
              class="px-4 py-2.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Transition>

      <!-- Loading -->
      <div v-if="isLoadingSessions" class="flex items-center justify-center py-12">
        <div class="flex items-center gap-3 text-gray-400">
          <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading sessions...
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="sessionList.length === 0" class="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-600">
        <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 flex items-center justify-center mb-4">
          <svg class="w-10 h-10 text-violet-400 dark:text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <p class="text-lg font-medium text-gray-500 dark:text-gray-400">No sessions yet</p>
        <p class="text-sm mt-1 mb-4">Create a new session to start chatting</p>
        <button
          @click="showCreateDialog = true"
          class="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Create Session
        </button>
      </div>

      <!-- Session list -->
      <div v-else class="space-y-3">
        <div
          v-for="session in sessionList"
          :key="session.sessionId"
          @click="selectSession(session.sessionId)"
          class="group p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-md transition-all duration-200 cursor-pointer"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                <svg class="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div class="min-w-0">
                <h3 class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {{ session.title }}
                </h3>
                <p class="text-xs text-gray-400 mt-0.5">
                  {{ formatRelativeTime(session.lastMessageAt) }}
                </p>
              </div>
            </div>
            <button
              @click.stop="handleDeleteSession(session.sessionId)"
              class="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-200 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Delete session"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ================================================================ -->
    <!-- Chat/Pipeline View (when session is selected)                     -->
    <!-- ================================================================ -->
    <div v-else class="max-w-4xl mx-auto flex flex-col h-[calc(100vh-4rem)]">

      <!-- Header with back button + mode toggle -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div class="flex items-center gap-3">
          <button
            @click="closeSession"
            class="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Back to sessions"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 class="text-lg font-bold text-gray-900 dark:text-white">{{ currentSession.title }}</h1>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ pipelineMode ? 'Pipeline Mode' : 'Chat with Gemini AI' }}
            </p>
          </div>
        </div>

        <!-- Mode Toggle -->
        <div class="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          <button
            @click="pipelineMode ? togglePipelineMode() : null"
            :class="[
              'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
              !pipelineMode
                ? 'bg-white dark:bg-gray-700 text-violet-600 dark:text-violet-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            ]"
          >
            Chat
          </button>
          <button
            @click="!pipelineMode ? togglePipelineMode() : null"
            :class="[
              'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
              pipelineMode
                ? 'bg-white dark:bg-gray-700 text-violet-600 dark:text-violet-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            ]"
          >
            Pipeline
          </button>
        </div>
      </div>

      <!-- Chat Input Bar (TOP) -->
      <div class="px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div class="flex gap-3 items-end">
          <textarea
            v-model="inputMessage"
            @keydown="handleKeydown"
            :disabled="isLoading"
            :placeholder="pipelineMode ? 'Describe what you want to test...' : 'Type your message to Gemini...'"
            rows="2"
            class="flex-1 resize-none rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
          />
          <button
            @click="handleSend"
            :disabled="!inputMessage.trim() || isLoading"
            :class="[
              'px-5 py-3 text-white rounded-xl font-medium text-sm transition-all duration-200 shadow-lg disabled:shadow-none flex items-center gap-2 disabled:cursor-not-allowed',
              pipelineMode
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-800 shadow-emerald-500/20'
                : 'bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-800 shadow-violet-500/20'
            ]"
          >
            <svg v-if="!isLoading && !pipelineMode" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <svg v-else-if="!isLoading && pipelineMode" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ isLoading ? 'Running...' : (pipelineMode ? 'Run Pipeline' : 'Send') }}
          </button>
        </div>
        <!-- Error banner -->
        <div
          v-if="error"
          class="mt-3 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2"
        >
          <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {{ error }}
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- PIPELINE VIEW                                                    -->
      <!-- ============================================================== -->
      <div v-if="pipelineMode" class="flex-1 overflow-y-auto px-6 py-6 space-y-4">

        <!-- Idle state -->
        <div
          v-if="pipelineState.status === 'idle'"
          class="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600 px-6"
        >
          <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center mb-4">
            <svg class="w-10 h-10 text-emerald-400 dark:text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p class="text-lg font-medium text-gray-500 dark:text-gray-400">Pipeline Mode</p>
          <p class="text-sm mt-1">Describe what you want to test and click "Run Pipeline"</p>
        </div>

        <!-- Pipeline Stepper -->
        <template v-else>
          <!-- Reset button -->
          <div v-if="pipelineState.status !== 'running'" class="flex justify-end">
            <button
              @click="resetPipeline"
              class="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Reset Pipeline
            </button>
          </div>

          <!-- Steps -->
          <div
            v-for="step in pipelineSteps"
            :key="step.id"
            class="relative"
          >
            <!-- Connector line -->
            <div
              v-if="step.id > 1"
              class="absolute left-5 -top-4 w-0.5 h-4"
              :class="getStepStatus(step.id - 1) === 'completed' ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-gray-200 dark:bg-gray-700'"
            />

            <!-- Step card -->
            <div
              :class="[
                'rounded-xl border p-4 transition-all duration-300',
                getStepStatus(step.id) === 'completed'
                  ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
                  : getStepStatus(step.id) === 'running'
                    ? 'bg-violet-50/50 dark:bg-violet-900/10 border-violet-300 dark:border-violet-700 shadow-md shadow-violet-500/10'
                    : getStepStatus(step.id) === 'error'
                      ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                      : 'bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-50'
              ]"
            >
              <div class="flex items-center gap-3">
                <!-- Status icon -->
                <div
                  :class="[
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    getStepStatus(step.id) === 'completed'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30'
                      : getStepStatus(step.id) === 'running'
                        ? 'bg-violet-100 dark:bg-violet-900/30'
                        : getStepStatus(step.id) === 'error'
                          ? 'bg-red-100 dark:bg-red-900/30'
                          : 'bg-gray-100 dark:bg-gray-800'
                  ]"
                >
                  <!-- Completed -->
                  <svg v-if="getStepStatus(step.id) === 'completed'" class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <!-- Running -->
                  <svg v-else-if="getStepStatus(step.id) === 'running'" class="w-5 h-5 text-violet-500 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <!-- Error -->
                  <svg v-else-if="getStepStatus(step.id) === 'error'" class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <!-- Pending -->
                  <span v-else class="text-sm font-bold text-gray-400 dark:text-gray-500">{{ step.id }}</span>
                </div>

                <div class="flex-1 min-w-0">
                  <h3
                    :class="[
                      'text-sm font-semibold',
                      getStepStatus(step.id) === 'completed' ? 'text-emerald-700 dark:text-emerald-400'
                        : getStepStatus(step.id) === 'running' ? 'text-violet-700 dark:text-violet-400'
                        : getStepStatus(step.id) === 'error' ? 'text-red-700 dark:text-red-400'
                        : 'text-gray-400 dark:text-gray-500'
                    ]"
                  >
                    Step {{ step.id }}: {{ step.label }}
                  </h3>
                </div>
              </div>

              <!-- Step content (when completed or error) -->
              <!-- Step 1: Intent -->
              <div v-if="step.id === 1 && pipelineState.intent && getStepStatus(1) === 'completed'" class="mt-3 ml-13">
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Extracted Intent:</p>
                <pre class="text-xs bg-gray-100 dark:bg-gray-900 rounded-lg p-3 overflow-x-auto text-gray-700 dark:text-gray-300">{{ formatJson(pipelineState.intent) }}</pre>
              </div>

              <!-- Step 2: Task Plan -->
              <div v-if="step.id === 2 && pipelineState.taskPlan && getStepStatus(2) === 'completed'" class="mt-3 ml-13">
                <p class="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
                  {{ pipelineState.taskPlan.mainTask }}
                </p>
                <div class="space-y-1.5">
                  <div
                    v-for="t in pipelineState.taskPlan.subTasks"
                    :key="t.id"
                    class="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400"
                  >
                    <span class="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-[10px]">{{ t.id }}</span>
                    <div>
                      <span class="font-medium text-gray-700 dark:text-gray-300">{{ t.action }}</span>
                      <span class="text-gray-400"> on {{ t.sourceDevice }}</span>
                      <span v-if="t.targetDevice" class="text-gray-400"> -> {{ t.targetDevice }}</span>
                      <p class="text-gray-400 mt-0.5">{{ t.description }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Step 3: Script Check -->
              <div v-if="step.id === 3 && pipelineState.scriptCheck && getStepStatus(3) === 'completed'" class="mt-3 ml-13">
                <div class="flex items-center gap-4 text-xs">
                  <span class="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Found: {{ pipelineState.scriptCheck.foundCount }}
                  </span>
                  <span v-if="pipelineState.scriptCheck.missingCount > 0" class="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Missing: {{ pipelineState.scriptCheck.missingCount }}
                  </span>
                </div>
              </div>

              <!-- Step 4: Generated Scripts -->
              <div v-if="step.id === 4 && pipelineState.generatedScripts.length > 0 && getStepStatus(4) === 'completed'" class="mt-3 ml-13">
                <div class="space-y-1">
                  <div
                    v-for="g in pipelineState.generatedScripts"
                    :key="g.action"
                    class="flex items-center gap-2 text-xs"
                  >
                    <svg v-if="g.success" class="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <svg v-else class="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span class="text-gray-600 dark:text-gray-400">{{ g.action }}.py</span>
                    <span :class="g.success ? 'text-emerald-500' : 'text-red-500'">
                      {{ g.success ? 'Generated' : 'Failed' }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Step 5-6: Execution Results -->
              <div v-if="step.id === 6 && pipelineState.execution && getStepStatus(6) === 'completed'" class="mt-3 ml-13 space-y-2">
                <div class="flex items-center gap-4 text-xs mb-2">
                  <span class="text-emerald-600 dark:text-emerald-400 font-medium">
                    Pass: {{ pipelineState.execution.successCount }}/{{ pipelineState.execution.results.length }}
                  </span>
                  <span v-if="pipelineState.execution.failureCount > 0" class="text-red-600 dark:text-red-400 font-medium">
                    Fail: {{ pipelineState.execution.failureCount }}/{{ pipelineState.execution.results.length }}
                  </span>
                </div>

                <div
                  v-for="r in pipelineState.execution.results"
                  :key="r.id"
                  :class="[
                    'rounded-lg border p-3 text-xs',
                    r.success
                      ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
                      : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                  ]"
                >
                  <div class="flex items-center gap-2 mb-1">
                    <span :class="r.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'" class="font-semibold">
                      {{ r.success ? '[PASS]' : '[FAIL]' }}
                    </span>
                    <span class="text-gray-700 dark:text-gray-300 font-medium">Task {{ r.id }}: {{ r.action }}</span>
                  </div>
                  <pre v-if="r.output" class="bg-gray-100 dark:bg-gray-900 rounded p-2 mt-1 overflow-x-auto text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{{ r.output }}</pre>
                  <p v-if="r.error" class="text-red-500 mt-1">{{ r.error }}</p>
                </div>
              </div>

              <!-- Error message -->
              <div v-if="getStepStatus(step.id) === 'error' && pipelineState.error" class="mt-3 ml-13">
                <p class="text-xs text-red-500">{{ pipelineState.error }}</p>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- ============================================================== -->
      <!-- CHAT VIEW (original, unchanged)                                 -->
      <!-- ============================================================== -->
      <div
        v-else
        ref="messagesContainer"
        class="flex-1 overflow-y-auto"
      >
        <!-- Empty state -->
        <div
          v-if="messages.length === 0 && !isLoading"
          class="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600 px-6"
        >
          <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 flex items-center justify-center mb-4">
            <svg class="w-10 h-10 text-violet-400 dark:text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <p class="text-lg font-medium text-gray-500 dark:text-gray-400">Start a conversation</p>
          <p class="text-sm mt-1">Type a message above to begin chatting with Gemini</p>
        </div>

        <!-- Messages list -->
        <div class="divide-y divide-gray-100 dark:divide-gray-800/50">
          <div
            v-for="msg in messages"
            :key="msg.messageId"
            class="px-6 py-5 transition-colors"
            :class="{
              'bg-white dark:bg-gray-900': msg.role === 'user',
              'bg-gray-50/80 dark:bg-gray-800/30': msg.role === 'model'
            }"
          >
            <div class="max-w-3xl mx-auto flex gap-4">
              <!-- Avatar -->
              <div
                class="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
                :class="{
                  'bg-gray-200 dark:bg-gray-700': msg.role === 'user',
                  'bg-gradient-to-br from-violet-500 to-indigo-600': msg.role === 'model'
                }"
              >
                <svg v-if="msg.role === 'user'" class="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <svg v-else class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1.5">
                  <span class="text-sm font-semibold" :class="msg.role === 'user' ? 'text-gray-700 dark:text-gray-200' : 'text-violet-600 dark:text-violet-400'">
                    {{ msg.role === 'user' ? 'You' : (msg.modelName || 'Gemini') }}
                  </span>
                  <span class="text-xs text-gray-400">{{ formatTime(msg.timestamp) }}</span>
                </div>

                <!-- Loading indicator -->
                <div v-if="msg.isLoading" class="flex items-center gap-2 text-gray-400">
                  <div class="flex gap-1">
                    <div class="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style="animation-delay: 0ms" />
                    <div class="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style="animation-delay: 150ms" />
                    <div class="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style="animation-delay: 300ms" />
                  </div>
                  <span class="text-sm">Thinking...</span>
                </div>

                <!-- Message content -->
                <div
                  v-else
                  class="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-gray-800 prose-pre:text-gray-100 prose-code:text-violet-600 dark:prose-code:text-violet-400"
                  v-html="renderMarkdown(msg.content)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
