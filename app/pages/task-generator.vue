<script setup lang="ts">
/**
 * Task Generator - Chat page with session management + step-by-step pipeline
 * Flow: Open page > fetch sessions > create/select session > chat OR run pipeline step-by-step
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
  // Pipeline (step-by-step)
  pipelineMode,
  pipelineRun,
  pipelineModules,
  pipelineError,
  validationErrors,
  togglePipelineMode,
  resetPipeline,
  startPipeline,
  confirmModule,
  retryModule
} = useTaskGenerator();

const inputMessage = ref('');
const newSessionTitle = ref('');
const showCreateDialog = ref(false);
const messagesContainer = ref<HTMLElement | null>(null);
const retryFeedback = ref<Record<string, string>>({});
const expandedModules = ref<Record<string, boolean>>({});

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
    await startPipeline(msg);
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

// Handle confirm module
const handleConfirm = async (pipelineId: string, moduleId: string) => {
  await confirmModule(pipelineId, moduleId);
};

// Handle retry module
const handleRetry = async (pipelineId: string, moduleId: string) => {
  const feedback = retryFeedback.value[moduleId]?.trim() || undefined;
  await retryModule(pipelineId, moduleId, feedback);
  retryFeedback.value[moduleId] = '';
};

// Toggle expanded state
const toggleExpanded = (moduleId: string) => {
  expandedModules.value[moduleId] = !expandedModules.value[moduleId];
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

// Module step labels
const stepLabels: Record<string, string> = {
  extract_intent: 'Extract Intent',
  decompose_tasks: 'Decompose Tasks',
  check_scripts: 'Check Scripts',
  generate_scripts: 'Generate Scripts',
  execute_tasks: 'Execute Tasks',
  pipeline_result: 'Pipeline Result'
};

// Status styles
const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
  pending: {
    bg: 'bg-gray-50 dark:bg-gray-800/50',
    text: 'text-gray-400 dark:text-gray-500',
    border: 'border-gray-200 dark:border-gray-700'
  },
  running: {
    bg: 'bg-violet-50/50 dark:bg-violet-900/10',
    text: 'text-violet-700 dark:text-violet-400',
    border: 'border-violet-300 dark:border-violet-700'
  },
  waiting_confirm: {
    bg: 'bg-amber-50/50 dark:bg-amber-900/10',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-300 dark:border-amber-700'
  },
  confirmed: {
    bg: 'bg-emerald-50/50 dark:bg-emerald-900/10',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800'
  },
  error: {
    bg: 'bg-red-50/50 dark:bg-red-900/10',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800'
  },
  skipped: {
    bg: 'bg-gray-50/50 dark:bg-gray-800/30',
    text: 'text-gray-500 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-700'
  }
};

const getStatusStyle = (status: string) => statusStyles[status] || statusStyles.pending;

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
              {{ pipelineMode ? 'Pipeline Mode (Step-by-Step)' : 'Chat with Gemini AI' }}
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
            :disabled="isLoading || (pipelineMode && pipelineRun !== null && pipelineRun.status !== 'completed' && pipelineRun.status !== 'error')"
            :placeholder="pipelineMode ? 'Describe what you want to test...' : 'Type your message to Gemini...'"
            rows="2"
            class="flex-1 resize-none rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
          />
          <button
            @click="handleSend"
            :disabled="!inputMessage.trim() || isLoading || (pipelineMode && pipelineRun !== null && pipelineRun.status !== 'completed' && pipelineRun.status !== 'error')"
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
            {{ isLoading ? 'Running...' : (pipelineMode ? 'Start Pipeline' : 'Send') }}
          </button>
        </div>
        <!-- Error banner -->
        <div
          v-if="error || pipelineError"
          class="mt-3 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2"
        >
          <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {{ error || pipelineError }}
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- PIPELINE VIEW (step-by-step)                                    -->
      <!-- ============================================================== -->
      <div v-if="pipelineMode" class="flex-1 overflow-y-auto px-6 py-6 space-y-4">

        <!-- Idle state -->
        <div
          v-if="!pipelineRun"
          class="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600 px-6"
        >
          <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center mb-4">
            <svg class="w-10 h-10 text-emerald-400 dark:text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p class="text-lg font-medium text-gray-500 dark:text-gray-400">Pipeline Mode (Step-by-Step)</p>
          <p class="text-sm mt-1">Describe what you want to test - each step requires your confirmation</p>
        </div>

        <!-- Pipeline Modules -->
        <template v-else>
          <!-- Reset button -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium px-2.5 py-1 rounded-full"
                :class="pipelineRun.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                         pipelineRun.status === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                         'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'"
              >
                {{ pipelineRun.status.replace('_', ' ').toUpperCase() }}
              </span>
            </div>
            <button
              v-if="pipelineRun.status !== 'running'"
              @click="resetPipeline"
              class="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              New Pipeline
            </button>
          </div>

          <!-- Validation Errors Banner -->
          <div
            v-if="validationErrors.length > 0"
            class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
          >
            <h4 class="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">Argument Validation Failed</h4>
            <p class="text-xs text-red-600 dark:text-red-400 mb-3">
              Required arguments are missing. Please retry from Step 1 to provide the necessary information.
            </p>
            <div class="space-y-1.5">
              <div v-for="ve in validationErrors" :key="ve.taskId" class="text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                <span class="font-mono bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">{{ ve.action }}</span>
                <span>Missing: {{ ve.missingArgs.join(', ') }}</span>
              </div>
            </div>
          </div>

          <!-- Module Cards -->
          <div
            v-for="mod in pipelineModules"
            :key="mod.moduleId"
            class="relative"
          >
            <!-- Connector line -->
            <div
              v-if="mod.step > 1"
              class="absolute left-5 -top-4 w-0.5 h-4"
              :class="mod.status === 'confirmed' || mod.status === 'skipped' ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-gray-200 dark:bg-gray-700'"
            />

            <!-- Module Card -->
            <div
              :class="[
                'rounded-xl border transition-all duration-300',
                getStatusStyle(mod.status).bg,
                getStatusStyle(mod.status).border,
                // Large prominent card for waiting_confirm
                mod.status === 'waiting_confirm'
                  ? 'p-6 shadow-lg ring-2 ring-amber-400/30 dark:ring-amber-500/20'
                  : mod.status === 'running'
                    ? 'p-5 shadow-md ring-2 ring-violet-400/30 dark:ring-violet-500/20 animate-pulse'
                    : mod.status === 'error'
                      ? 'p-5 shadow-md'
                      : 'p-3 opacity-80' // compact for confirmed/skipped/pending
              ]"
            >
              <!-- Header row -->
              <div class="flex items-center gap-3">
                <!-- Status icon -->
                <div
                  :class="[
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    mod.status === 'confirmed' || mod.status === 'skipped'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30'
                      : mod.status === 'running'
                        ? 'bg-violet-100 dark:bg-violet-900/30'
                        : mod.status === 'waiting_confirm'
                          ? 'bg-amber-100 dark:bg-amber-900/30'
                          : mod.status === 'error'
                            ? 'bg-red-100 dark:bg-red-900/30'
                            : 'bg-gray-100 dark:bg-gray-800'
                  ]"
                >
                  <!-- Confirmed / Skipped -->
                  <svg v-if="mod.status === 'confirmed' || mod.status === 'skipped'" class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <!-- Running -->
                  <svg v-else-if="mod.status === 'running'" class="w-5 h-5 text-violet-500 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <!-- Waiting confirm -->
                  <svg v-else-if="mod.status === 'waiting_confirm'" class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <!-- Error -->
                  <svg v-else-if="mod.status === 'error'" class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <!-- Pending -->
                  <span v-else class="text-sm font-bold text-gray-400 dark:text-gray-500">{{ mod.step }}</span>
                </div>

                <div class="flex-1 min-w-0">
                  <h3
                    :class="['text-sm font-semibold', getStatusStyle(mod.status).text]"
                  >
                    Step {{ mod.step }}: {{ stepLabels[mod.moduleName] || mod.moduleName }}
                  </h3>
                  <p v-if="mod.status === 'waiting_confirm'" class="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                    Waiting for your confirmation
                  </p>
                  <p v-if="mod.status === 'skipped'" class="text-xs text-gray-400 mt-0.5">
                    Skipped (no action needed)
                  </p>
                  <p v-if="mod.retryCount > 0" class="text-xs text-gray-400 mt-0.5">
                    Retried {{ mod.retryCount }} time(s)
                  </p>
                </div>

                <!-- Expand/Collapse toggle -->
                <button
                  v-if="mod.output || mod.input"
                  @click="toggleExpanded(mod.moduleId)"
                  class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <svg
                    class="w-4 h-4 transition-transform duration-200"
                    :class="{ 'rotate-180': expandedModules[mod.moduleId] }"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              <!-- Expandable Input/Output section -->
              <Transition
                enter-active-class="transition-all duration-200 ease-out"
                leave-active-class="transition-all duration-150 ease-in"
                enter-from-class="opacity-0 max-h-0"
                enter-to-class="opacity-100 max-h-[800px]"
                leave-from-class="opacity-100 max-h-[800px]"
                leave-to-class="opacity-0 max-h-0"
              >
                <div v-if="expandedModules[mod.moduleId]" class="mt-3 ml-13 space-y-3 overflow-hidden">
                  <!-- Input -->
                  <div v-if="mod.input && Object.keys(mod.input).length > 0">
                    <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Input</p>
                    <pre class="text-xs bg-gray-100 dark:bg-gray-900 rounded-lg p-3 overflow-x-auto text-gray-700 dark:text-gray-300 max-h-48 overflow-y-auto">{{ formatJson(mod.input) }}</pre>
                  </div>
                  <!-- Output (raw JSON for non-special modules) -->
                  <div v-if="mod.output && Object.keys(mod.output).length > 0 && mod.moduleName !== 'execute_tasks' && mod.moduleName !== 'pipeline_result'">
                    <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Output</p>
                    <pre class="text-xs bg-gray-100 dark:bg-gray-900 rounded-lg p-3 overflow-x-auto text-gray-700 dark:text-gray-300 max-h-48 overflow-y-auto">{{ formatJson(mod.output) }}</pre>
                  </div>
                </div>
              </Transition>

              <!-- ======================================================== -->
              <!-- Special: Execute Tasks (Step 5) - show EXECUTION PLAN     -->
              <!-- ======================================================== -->
              <div
                v-if="mod.moduleName === 'execute_tasks' && mod.output && (mod.output as any).executionPlan"
                class="mt-4 ml-13 space-y-2"
              >
                <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Execution Plan
                  <span class="ml-2 font-normal normal-case">
                    ({{ (mod.output as any).taskCount || 0 }} task(s) to execute)
                  </span>
                </p>
                <div
                  v-for="plan in ((mod.output as any).executionPlan || [])"
                  :key="plan.taskId"
                  class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-3 space-y-1.5"
                >
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                      Task {{ plan.taskId }}
                    </span>
                    <span class="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {{ plan.action }}
                    </span>
                    <span class="text-xs text-gray-400">
                      ({{ plan.deviceType }}/{{ plan.os }})
                    </span>
                  </div>

                  <!-- Script path -->
                  <div class="flex items-center gap-2 text-xs">
                    <span class="text-gray-400 dark:text-gray-500 font-medium">Script:</span>
                    <code class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-900 rounded text-violet-600 dark:text-violet-400 font-mono">
                      {{ plan.scriptPath }}
                    </code>
                  </div>

                  <!-- Device info -->
                  <div class="flex items-center gap-2 text-xs">
                    <span class="text-gray-400 dark:text-gray-500 font-medium">Source:</span>
                    <span class="text-gray-600 dark:text-gray-300">{{ plan.sourceDevice }}</span>
                    <template v-if="plan.targetDevice">
                      <span class="text-gray-400">-></span>
                      <span class="text-gray-600 dark:text-gray-300">{{ plan.targetDevice }}</span>
                    </template>
                  </div>

                  <!-- Arguments -->
                  <div v-if="plan.arguments && Object.keys(plan.arguments).length > 0">
                    <span class="text-xs text-gray-400 dark:text-gray-500 font-medium">Arguments:</span>
                    <div class="mt-1 flex flex-wrap gap-1.5">
                      <span
                        v-for="(val, key) in plan.arguments"
                        :key="key"
                        class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300"
                      >
                        <span class="font-mono text-amber-600 dark:text-amber-400">--{{ key }}</span>
                        <span>{{ val }}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ======================================================== -->
              <!-- Special: Pipeline Result (Step 6) - execution results     -->
              <!-- ======================================================== -->
              <div
                v-if="mod.moduleName === 'pipeline_result' && mod.output"
                class="mt-4 ml-13 space-y-3"
              >
                <!-- Per-task execution results -->
                <template v-if="(mod.output as any).results">
                  <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Execution Results
                    <span class="ml-2 font-normal normal-case">
                      ({{ (mod.output as any).successCount || 0 }} passed, {{ (mod.output as any).failureCount || 0 }} failed)
                    </span>
                  </p>
                  <div
                    v-for="taskResult in ((mod.output as any).results || [])"
                    :key="taskResult.id"
                    :class="[
                      'rounded-lg border p-3',
                      taskResult.success
                        ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
                        : 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                    ]"
                  >
                    <div class="flex items-center gap-2 mb-1.5">
                      <span
                        :class="[
                          'text-xs font-bold px-1.5 py-0.5 rounded',
                          taskResult.success
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        ]"
                      >
                        {{ taskResult.success ? 'PASS' : 'FAIL' }}
                      </span>
                      <span class="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Task {{ taskResult.id }}: {{ taskResult.action }}
                      </span>
                    </div>
                    <!-- Task stdout -->
                    <div v-if="taskResult.output" class="mt-1">
                      <pre class="text-xs bg-gray-900 dark:bg-black rounded p-2.5 text-emerald-400 dark:text-emerald-300 overflow-x-auto max-h-40 overflow-y-auto font-mono whitespace-pre-wrap">{{ taskResult.output }}</pre>
                    </div>
                    <!-- Task error -->
                    <div v-if="taskResult.error" class="mt-1">
                      <pre class="text-xs bg-gray-900 dark:bg-black rounded p-2.5 text-red-400 dark:text-red-300 overflow-x-auto max-h-40 overflow-y-auto font-mono whitespace-pre-wrap">{{ taskResult.error }}</pre>
                    </div>
                  </div>
                </template>

                <!-- Summary markdown -->
                <div
                  v-if="(mod.output as any).summary"
                  class="prose prose-sm dark:prose-invert max-w-none bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 prose-pre:bg-gray-800 prose-pre:text-gray-100"
                  v-html="renderMarkdown((mod.output as any).summary)"
                />
              </div>

              <!-- Auto-expanded for waiting_confirm: show full output (for non-special modules only) -->
              <div
                v-if="mod.status === 'waiting_confirm' && mod.output && !expandedModules[mod.moduleId] && mod.moduleName !== 'execute_tasks' && mod.moduleName !== 'pipeline_result'"
                class="mt-4 ml-13 space-y-3"
              >
                <!-- Input section -->
                <div v-if="mod.input && Object.keys(mod.input).length > 0">
                  <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Input</p>
                  <pre class="text-sm bg-gray-100 dark:bg-gray-900 rounded-lg p-4 overflow-x-auto text-gray-700 dark:text-gray-300 max-h-60 overflow-y-auto">{{ formatJson(mod.input) }}</pre>
                </div>
                <!-- Output section -->
                <div>
                  <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Output</p>
                  <pre class="text-sm bg-gray-100 dark:bg-gray-900 rounded-lg p-4 overflow-x-auto text-gray-700 dark:text-gray-300 max-h-96 overflow-y-auto">{{ formatJson(mod.output) }}</pre>
                </div>
              </div>

              <!-- Error message -->
              <div v-if="mod.error" class="mt-3 ml-13">
                <p class="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg p-2">{{ mod.error }}</p>
              </div>

              <!-- Action buttons -->
              <div v-if="mod.status === 'waiting_confirm' || mod.status === 'confirmed' || mod.status === 'error'" class="mt-4 ml-13 flex items-start gap-3">
                <!-- Confirm button -->
                <button
                  v-if="mod.status === 'waiting_confirm'"
                  @click="handleConfirm(pipelineRun!.pipelineId, mod.moduleId)"
                  :disabled="isLoading"
                  class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Confirm & Continue
                </button>

                <!-- Retry button -->
                <div class="flex-1 space-y-2">
                  <div class="flex items-center gap-2">
                    <button
                      @click="handleRetry(pipelineRun!.pipelineId, mod.moduleId)"
                      :disabled="isLoading"
                      class="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Retry
                    </button>
                  </div>
                  <!-- Feedback textarea (shown only for waiting_confirm or error) -->
                  <textarea
                    v-if="mod.status === 'waiting_confirm' || mod.status === 'error'"
                    v-model="retryFeedback[mod.moduleId]"
                    :placeholder="'Optional: Add feedback for retry (e.g. change parameters, adjust intent)...'"
                    rows="2"
                    class="w-full resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- ============================================================== -->
      <!-- CHAT VIEW (original)                                            -->
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
