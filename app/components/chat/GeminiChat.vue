<script setup lang="ts">
/**
 * GeminiChat.vue - Main chat container
 * Always renders as chat view. Wizard lists (Course/Lab/Part) appear
 * as bot message bubbles at the bottom of the message stream.
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
  wizardCourses,
  wizardLabs,
  wizardParts,
  fetchWizardState,
  fetchCourses,
  fetchLabs,
  fetchParts,
  selectItem,
  setWizardAction,
  navigateBack,
  isInAIMode
} = useGeminiChat();

const inputMessage = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const deleteConfirmItem = ref<{ type: string; id: string } | null>(null);

// Auto-scroll to bottom
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

watch(messages, scrollToBottom, { deep: true });
watch(wizardCourses, scrollToBottom, { deep: true });
watch(wizardLabs, scrollToBottom, { deep: true });
watch(wizardParts, scrollToBottom, { deep: true });

// Load wizard data when session or step changes
watch(
  [() => session.value, () => wizardState.value.step],
  async ([currentSession, step]) => {
    if (!currentSession) return;

    switch (step) {
      case 'course_list':
        await fetchCourses();
        break;
      case 'lab_list':
        await fetchLabs();
        break;
      case 'part_list':
        await fetchParts();
        break;
    }
  },
  { immediate: true }
);

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

// Wizard: Enter
const handleEnterCourse = async (id: string) => {
  await selectItem('course', id);
  await fetchLabs();
};

const handleEnterLab = async (id: string) => {
  await selectItem('lab', id);
};

const handleEnterPart = async (id: string) => {
  await selectItem('part', id);
};

// Wizard: Create
const handleCreateCourse = () => setWizardAction('course', 'create');
const handleCreateLab = () => setWizardAction('lab', 'create');
const handleCreatePart = () => setWizardAction('part', 'create');

// Wizard: Edit
const handleEditCourse = (id: string) => {
  selectItem('course', id);
  setWizardAction('course', 'edit');
};

const handleEditLab = (id: string) => {
  selectItem('lab', id);
  setWizardAction('lab', 'edit');
};

const handleEditPart = (id: string) => {
  selectItem('part', id);
  setWizardAction('part', 'edit');
};

// Wizard: Delete
const handleDeleteClick = (type: string, id: string) => {
  deleteConfirmItem.value = { type, id };
};

const handleDeleteConfirm = async () => {
  if (!deleteConfirmItem.value) return;
  const { type, id } = deleteConfirmItem.value;
  const config = useRuntimeConfig();
  const apiBase = `${config.public.backendurl}/v0`;

  try {
    if (type === 'course') {
      await $fetch(`${apiBase}/courses/${id}`, { method: 'DELETE', credentials: 'include' });
      await fetchCourses();
    } else if (type === 'lab') {
      await $fetch(`${apiBase}/labs/${id}`, { method: 'DELETE', credentials: 'include' });
      await fetchLabs();
    } else if (type === 'part') {
      await $fetch(`${apiBase}/parts/${id}`, { method: 'DELETE', credentials: 'include' });
      await fetchParts();
    }
  } catch (err: any) {
    console.error(`Failed to delete ${type}:`, err);
  }
  deleteConfirmItem.value = null;
};

const handleDeleteCancel = () => {
  deleteConfirmItem.value = null;
};

const handleBack = async () => {
  await navigateBack();
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

const isListStep = computed(() => {
  return ['course_list', 'lab_list', 'part_list'].includes(wizardState.value.step);
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
    <!-- Main Content: Always chat view -->
    <!-- ============================================================ -->
    <div 
      ref="messagesContainer"
      class="flex-1 overflow-y-auto p-4 space-y-4"
    >
      <!-- Chat messages (always shown) -->
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

      <!-- ============================================================ -->
      <!-- Wizard bubble: appended AFTER messages as a bot message -->
      <!-- ============================================================ -->

      <!-- Back pill (for lab_list, part_list, and AI modes) -->
      <div v-if="wizardState.step !== 'course_list' && !isInAIMode" class="flex justify-start">
        <button
          @click="handleBack"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 bg-gray-100 dark:bg-gray-800 rounded-full transition-colors"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          {{ wizardState.step === 'lab_list' ? 'Back to Courses' : wizardState.step === 'part_list' ? 'Back to Labs' : 'Back' }}
        </button>
      </div>

      <!-- Back pill for AI mode -->
      <div v-if="isInAIMode" class="flex justify-start">
        <button
          @click="handleBack"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 bg-gray-100 dark:bg-gray-800 rounded-full transition-colors"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      <!-- ====== COURSE LIST BUBBLE ====== -->
      <div v-if="wizardState.step === 'course_list'" class="flex justify-start">
        <div class="max-w-[85%] bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
          <p class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Select a Course</p>

          <button
            @click="handleCreateCourse"
            class="w-full mb-3 px-3 py-2 border-2 border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Create Course
          </button>

          <div v-if="isLoading" class="space-y-2">
            <div v-for="i in 3" :key="i" class="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-14" />
          </div>

          <div v-else-if="wizardCourses.length === 0" class="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
            No courses found. Create one to get started.
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="course in wizardCourses"
              :key="course.id"
              class="group relative p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1 min-w-0 pr-2">
                  <h4 class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ course.title }}</h4>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{{ course.description || 'No description' }}</p>
                </div>
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button @click="handleEnterCourse(course.id)" class="p-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-400 hover:text-blue-600 transition-colors" title="View Labs">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  </button>
                  <button @click="handleEditCourse(course.id)" class="p-1.5 rounded-md hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-gray-400 hover:text-yellow-600 transition-colors" title="Edit">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button @click="handleDeleteClick('course', course.id)" class="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
              <!-- Delete confirm -->
              <div v-if="deleteConfirmItem?.type === 'course' && deleteConfirmItem?.id === course.id" class="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p class="text-xs text-red-600 dark:text-red-400 mb-2">Delete this course? This cannot be undone.</p>
                <div class="flex gap-2">
                  <button @click="handleDeleteConfirm" class="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">Confirm</button>
                  <button @click="handleDeleteCancel" class="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ====== LAB LIST BUBBLE ====== -->
      <div v-else-if="wizardState.step === 'lab_list'" class="flex justify-start">
        <div class="max-w-[85%] bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
          <p class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Select a Lab</p>

          <button
            @click="handleCreateLab"
            class="w-full mb-3 px-3 py-2 border-2 border-dashed border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 rounded-lg text-sm font-medium hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex items-center justify-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Create Lab
          </button>

          <div v-if="isLoading" class="space-y-2">
            <div v-for="i in 3" :key="i" class="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-14" />
          </div>

          <div v-else-if="wizardLabs.length === 0" class="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
            No labs in this course. Create one to get started.
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="lab in wizardLabs"
              :key="lab.id"
              class="group relative p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-500 transition-colors"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1 min-w-0 pr-2">
                  <h4 class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ lab.title }}</h4>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Type: {{ lab.type || 'N/A' }}</p>
                </div>
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button @click="handleEnterLab(lab.id)" class="p-1.5 rounded-md hover:bg-green-100 dark:hover:bg-green-900/30 text-gray-400 hover:text-green-600 transition-colors" title="View Parts">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  </button>
                  <button @click="handleEditLab(lab.id)" class="p-1.5 rounded-md hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-gray-400 hover:text-yellow-600 transition-colors" title="Edit">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button @click="handleDeleteClick('lab', lab.id)" class="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
              <div v-if="deleteConfirmItem?.type === 'lab' && deleteConfirmItem?.id === lab.id" class="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p class="text-xs text-red-600 dark:text-red-400 mb-2">Delete this lab? This cannot be undone.</p>
                <div class="flex gap-2">
                  <button @click="handleDeleteConfirm" class="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">Confirm</button>
                  <button @click="handleDeleteCancel" class="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ====== PART LIST BUBBLE ====== -->
      <div v-else-if="wizardState.step === 'part_list'" class="flex justify-start">
        <div class="max-w-[85%] bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
          <p class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Select a Part</p>

          <button
            @click="handleCreatePart"
            class="w-full mb-3 px-3 py-2 border-2 border-dashed border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex items-center justify-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Create Part
          </button>

          <div v-if="isLoading" class="space-y-2">
            <div v-for="i in 3" :key="i" class="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-14" />
          </div>

          <div v-else-if="wizardParts.length === 0" class="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
            No parts in this lab. Create one to get started.
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="part in wizardParts"
              :key="part.id"
              class="group relative p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 transition-colors"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1 min-w-0 pr-2">
                  <h4 class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ part.title }}</h4>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ part.description || 'No description' }}</p>
                </div>
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button @click="handleEditPart(part.id)" class="p-1.5 rounded-md hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-gray-400 hover:text-yellow-600 transition-colors" title="Edit">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button @click="handleDeleteClick('part', part.id)" class="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
              <div v-if="deleteConfirmItem?.type === 'part' && deleteConfirmItem?.id === part.id" class="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p class="text-xs text-red-600 dark:text-red-400 mb-2">Delete this part? This cannot be undone.</p>
                <div class="flex gap-2">
                  <button @click="handleDeleteConfirm" class="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">Confirm</button>
                  <button @click="handleDeleteCancel" class="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Input (only in AI mode) -->
    <div v-if="isInAIMode" class="border-t border-gray-200 dark:border-gray-700 p-4">
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
