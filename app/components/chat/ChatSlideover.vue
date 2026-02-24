<script setup lang="ts">
/**
 * ChatSlideover.vue - Slideover chat panel accessible from NavBar
 * Flow: List sessions -> Select or Create (with context wizard) -> Chat with messages
 *
 * Creation wizard steps:
 * 1. name     - Enter chat name
 * 2. course   - Pick a course (Enter/Edit/Create)
 * 3. lab      - Pick a lab (Enter/Edit/Create)
 * 4. part     - Pick a part (Edit/Create)
 */

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
  deleteSession,
  closeSession,
  isLoading,
  // Wizard data fetchers
  fetchCourses,
  fetchLabs,
  fetchParts,
  wizardCourses,
  wizardLabs,
  wizardParts,
  wizardState: currentWizardState
} = useGeminiChat();

// View mode: 'list' or 'chat'
const viewMode = ref<'list' | 'chat'>('list');
const deleteConfirmId = ref<string | null>(null);

// ============================================================================
// Creation wizard state
// ============================================================================
const showCreationWizard = ref(false);
const wizardStep = ref<'name' | 'course' | 'lab' | 'part'>('name');
const newChatTitle = ref('');
const namingInputRef = ref<HTMLInputElement | null>(null);

// Selected context during creation
const selectedCourseId = ref<string | null>(null);
const selectedCourseName = ref<string>('');
const selectedLabId = ref<string | null>(null);
const selectedLabName = ref<string>('');
const selectedPartId = ref<string | null>(null);

const close = () => {
  emit('update:open', false);
};

// Load sessions when opened - always start with list view
watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    viewMode.value = 'list';
    deleteConfirmId.value = null;
    resetCreationWizard();
    await listSessions();
  }
}, { immediate: true });

// Focus input when naming step shows
watch(wizardStep, (step) => {
  if (step === 'name') {
    nextTick(() => {
      namingInputRef.value?.focus();
    });
  }
});

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

// ============================================================================
// Creation wizard methods
// ============================================================================

const resetCreationWizard = () => {
  showCreationWizard.value = false;
  wizardStep.value = 'name';
  newChatTitle.value = '';
  selectedCourseId.value = null;
  selectedCourseName.value = '';
  selectedLabId.value = null;
  selectedLabName.value = '';
  selectedPartId.value = null;
};

// Step 1: Open wizard
const handleNewChatClick = () => {
  newChatTitle.value = '';
  showCreationWizard.value = true;
  wizardStep.value = 'name';
};

// Step 1 -> Step 2: Name confirmed, go to course selection
const handleNameConfirm = async () => {
  const title = newChatTitle.value.trim();
  if (!title) return;
  wizardStep.value = 'course';
  await fetchCourses();
};

// Handle enter key in naming input
const handleNamingKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleNameConfirm();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    resetCreationWizard();
  }
};

// Course actions
const handleCourseEnter = async (courseId: string, courseName: string) => {
  selectedCourseId.value = courseId;
  selectedCourseName.value = courseName;
  wizardStep.value = 'lab';
  // Set course context for fetching labs
  currentWizardState.value = { ...currentWizardState.value, courseId };
  await fetchLabs();
};

const handleCourseCreate = async () => {
  const title = newChatTitle.value.trim();
  if (!title) return;
  const created = await createSession(title, {
    contextType: 'course',
    action: 'create'
  });
  if (created) {
    resetCreationWizard();
    await listSessions();
    viewMode.value = 'chat';
  }
};

const handleCourseEdit = async (courseId: string) => {
  const title = newChatTitle.value.trim();
  if (!title) return;
  const created = await createSession(title, {
    contextType: 'course',
    action: 'edit',
    courseId
  });
  if (created) {
    resetCreationWizard();
    await listSessions();
    viewMode.value = 'chat';
  }
};

// Lab actions
const handleLabEnter = async (labId: string, labName: string) => {
  selectedLabId.value = labId;
  selectedLabName.value = labName;
  wizardStep.value = 'part';
  currentWizardState.value = { ...currentWizardState.value, labId };
  await fetchParts();
};

const handleLabCreate = async () => {
  if (!selectedCourseId.value) return;
  const title = newChatTitle.value.trim();
  if (!title) return;
  const created = await createSession(title, {
    contextType: 'lab',
    action: 'create',
    courseId: selectedCourseId.value
  });
  if (created) {
    resetCreationWizard();
    await listSessions();
    viewMode.value = 'chat';
  }
};

const handleLabEdit = async (labId: string) => {
  if (!selectedCourseId.value) return;
  const title = newChatTitle.value.trim();
  if (!title) return;
  const created = await createSession(title, {
    contextType: 'lab',
    action: 'edit',
    courseId: selectedCourseId.value,
    labId
  });
  if (created) {
    resetCreationWizard();
    await listSessions();
    viewMode.value = 'chat';
  }
};

// Part actions
const handlePartCreate = async () => {
  if (!selectedCourseId.value || !selectedLabId.value) return;
  const title = newChatTitle.value.trim();
  if (!title) return;
  const created = await createSession(title, {
    contextType: 'part',
    action: 'create',
    courseId: selectedCourseId.value,
    labId: selectedLabId.value
  });
  if (created) {
    resetCreationWizard();
    await listSessions();
    viewMode.value = 'chat';
  }
};

const handlePartEdit = async (partId: string) => {
  if (!selectedCourseId.value || !selectedLabId.value) return;
  const title = newChatTitle.value.trim();
  if (!title) return;
  const created = await createSession(title, {
    contextType: 'part',
    action: 'edit',
    courseId: selectedCourseId.value,
    labId: selectedLabId.value,
    partId
  });
  if (created) {
    resetCreationWizard();
    await listSessions();
    viewMode.value = 'chat';
  }
};

// Wizard back navigation
const handleWizardBack = () => {
  switch (wizardStep.value) {
    case 'course':
      wizardStep.value = 'name';
      break;
    case 'lab':
      wizardStep.value = 'course';
      selectedCourseId.value = null;
      selectedCourseName.value = '';
      break;
    case 'part':
      wizardStep.value = 'lab';
      selectedLabId.value = null;
      selectedLabName.value = '';
      break;
  }
};

// Breadcrumb labels
const wizardBreadcrumb = computed(() => {
  const parts: string[] = [];
  if (wizardStep.value === 'course' || wizardStep.value === 'lab' || wizardStep.value === 'part') {
    parts.push('Courses');
  }
  if ((wizardStep.value === 'lab' || wizardStep.value === 'part') && selectedCourseName.value) {
    parts.push(selectedCourseName.value);
  }
  if (wizardStep.value === 'part' && selectedLabName.value) {
    parts.push(selectedLabName.value);
  }
  return parts;
});

// Handle session selection - load messages and enter chat
const handleSelectSession = async (sessionId: string) => {
  const loaded = await selectSession(sessionId);
  if (loaded) {
    viewMode.value = 'chat';
  }
};

// Handle back to list
const handleBackToList = async () => {
  closeSession();
  viewMode.value = 'list';
  deleteConfirmId.value = null;
  await listSessions();
};

// Handle delete with confirmation
const handleDeleteClick = (sessionId: string, event: Event) => {
  event.stopPropagation();
  deleteConfirmId.value = sessionId;
};

const handleDeleteConfirm = async (sessionId: string, event: Event) => {
  event.stopPropagation();
  await deleteSession(sessionId);
  deleteConfirmId.value = null;
};

const handleDeleteCancel = (event: Event) => {
  event.stopPropagation();
  deleteConfirmId.value = null;
};

// Close on escape key
onMounted(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && props.open) {
      if (showCreationWizard.value) {
        if (wizardStep.value !== 'name') {
          handleWizardBack();
        } else {
          resetCreationWizard();
        }
      } else if (viewMode.value === 'chat') {
        handleBackToList();
      } else {
        close();
      }
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
      class="fixed right-0 top-0 h-full w-full max-w-2xl bg-background shadow-2xl z-50 flex flex-col"
    >
      <!-- ============================================================ -->
      <!-- VIEW: Session List -->
      <!-- ============================================================ -->
      <template v-if="viewMode === 'list'">
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-blue-100 dark:border-gray-700 bg-blue-50 dark:bg-gray-800">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Chat Assistant</h2>
            <p class="text-xs text-gray-500 dark:text-gray-400">Select a Chat Session or create a new one</p>
          </div>
          <div class="flex items-center gap-1">
            <button
              @click="close"
              class="p-2 hover:bg-blue-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Close Chat"
            >
              <svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- New Chat Button -->
        <div class="px-4 py-3 border-b border-border">
          <button
            @click="handleNewChatClick"
            :disabled="isLoading"
            class="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>New Chat</span>
          </button>
        </div>

        <!-- ============================================================ -->
        <!-- Creation Wizard (inline, replaces naming dialog) -->
        <!-- ============================================================ -->
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          leave-active-class="transition-all duration-150 ease-in"
          enter-from-class="opacity-0 -translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-2"
        >
          <div v-if="showCreationWizard" class="border-b border-border bg-blue-50/50 dark:bg-gray-800/50">
            <!-- Wizard Header: Breadcrumb + Back -->
            <div v-if="wizardStep !== 'name'" class="flex items-center gap-2 px-4 pt-3 pb-1">
              <button
                @click="handleWizardBack"
                class="p-1 hover:bg-blue-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Back"
              >
                <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <template v-for="(crumb, idx) in wizardBreadcrumb" :key="idx">
                  <span v-if="idx > 0" class="text-gray-400">/</span>
                  <span :class="idx === wizardBreadcrumb.length - 1 ? 'text-blue-600 dark:text-blue-400 font-medium' : ''">{{ crumb }}</span>
                </template>
              </div>
            </div>

            <!-- Step: Name -->
            <div v-if="wizardStep === 'name'" class="px-4 py-3">
              <label class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                Chat Name
              </label>
              <input
                ref="namingInputRef"
                v-model="newChatTitle"
                type="text"
                placeholder="e.g. Network Lab Assignment"
                @keydown="handleNamingKeydown"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div class="flex justify-end gap-2 mt-2">
                <button
                  @click="resetCreationWizard"
                  class="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  @click="handleNameConfirm"
                  :disabled="!newChatTitle.trim()"
                  class="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>

            <!-- Step: Course Selection -->
            <div v-else-if="wizardStep === 'course'" class="px-4 py-3">
              <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">Select a course or create a new one</p>

              <!-- Create Course button -->
              <button
                @click="handleCourseCreate"
                class="w-full mb-2 px-3 py-2 border-2 border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-1.5"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Create Course
              </button>

              <!-- Loading -->
              <div v-if="isLoading" class="space-y-1.5">
                <div v-for="i in 3" :key="i" class="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-10" />
              </div>

              <!-- Empty -->
              <div v-else-if="wizardCourses.length === 0" class="text-center py-3 text-xs text-gray-500 dark:text-gray-400">
                No courses found.
              </div>

              <!-- Course Items -->
              <div v-else class="space-y-1.5 max-h-48 overflow-y-auto">
                <div
                  v-for="course in wizardCourses"
                  :key="course.id"
                  class="group flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                >
                  <div class="flex-1 min-w-0 pr-2">
                    <h4 class="text-xs font-medium text-gray-900 dark:text-white truncate">{{ course.title }}</h4>
                    <p class="text-[10px] text-gray-500 dark:text-gray-400 truncate">{{ course.description || 'No description' }}</p>
                  </div>
                  <div class="flex items-center gap-0.5 flex-shrink-0">
                    <button @click="handleCourseEnter(course.id, course.title)" class="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-400 hover:text-blue-600 transition-colors" title="Enter (see Labs)">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    </button>
                    <button @click="handleCourseEdit(course.id)" class="p-1 rounded hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-gray-400 hover:text-yellow-600 transition-colors" title="Edit Course">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Step: Lab Selection -->
            <div v-else-if="wizardStep === 'lab'" class="px-4 py-3">
              <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">Select a lab or create a new one</p>

              <!-- Create Lab button -->
              <button
                @click="handleLabCreate"
                class="w-full mb-2 px-3 py-2 border-2 border-dashed border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 rounded-lg text-xs font-medium hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex items-center justify-center gap-1.5"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Create Lab
              </button>

              <!-- Loading -->
              <div v-if="isLoading" class="space-y-1.5">
                <div v-for="i in 3" :key="i" class="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-10" />
              </div>

              <!-- Empty -->
              <div v-else-if="wizardLabs.length === 0" class="text-center py-3 text-xs text-gray-500 dark:text-gray-400">
                No labs in this course.
              </div>

              <!-- Lab Items -->
              <div v-else class="space-y-1.5 max-h-48 overflow-y-auto">
                <div
                  v-for="lab in wizardLabs"
                  :key="lab.id"
                  class="group flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-500 transition-colors"
                >
                  <div class="flex-1 min-w-0 pr-2">
                    <h4 class="text-xs font-medium text-gray-900 dark:text-white truncate">{{ lab.title }}</h4>
                    <p class="text-[10px] text-gray-500 dark:text-gray-400">Type: {{ lab.type || 'N/A' }}</p>
                  </div>
                  <div class="flex items-center gap-0.5 flex-shrink-0">
                    <button @click="handleLabEnter(lab.id, lab.title)" class="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-gray-400 hover:text-green-600 transition-colors" title="Enter (see Parts)">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    </button>
                    <button @click="handleLabEdit(lab.id)" class="p-1 rounded hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-gray-400 hover:text-yellow-600 transition-colors" title="Edit Lab">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Step: Part Selection -->
            <div v-else-if="wizardStep === 'part'" class="px-4 py-3">
              <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">Select a part or create a new one</p>

              <!-- Create Part button -->
              <button
                @click="handlePartCreate"
                class="w-full mb-2 px-3 py-2 border-2 border-dashed border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 rounded-lg text-xs font-medium hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex items-center justify-center gap-1.5"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Create Part
              </button>

              <!-- Loading -->
              <div v-if="isLoading" class="space-y-1.5">
                <div v-for="i in 3" :key="i" class="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-10" />
              </div>

              <!-- Empty -->
              <div v-else-if="wizardParts.length === 0" class="text-center py-3 text-xs text-gray-500 dark:text-gray-400">
                No parts in this lab.
              </div>

              <!-- Part Items -->
              <div v-else class="space-y-1.5 max-h-48 overflow-y-auto">
                <div
                  v-for="part in wizardParts"
                  :key="part.id"
                  class="group flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 transition-colors"
                >
                  <div class="flex-1 min-w-0 pr-2">
                    <h4 class="text-xs font-medium text-gray-900 dark:text-white truncate">{{ part.title }}</h4>
                    <p class="text-[10px] text-gray-500 dark:text-gray-400 truncate">{{ part.description || 'No description' }}</p>
                  </div>
                  <div class="flex items-center gap-0.5 flex-shrink-0">
                    <button @click="handlePartEdit(part.id)" class="p-1 rounded hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-gray-400 hover:text-yellow-600 transition-colors" title="Edit Part">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Session List -->
        <div class="flex-1 overflow-y-auto relative">

          <!-- Loading -->
          <div v-if="isLoading && !showCreationWizard" class="p-8 text-center text-muted-foreground text-sm">
            Loading sessions...
          </div>

          <!-- Empty State -->
          <div v-else-if="sessionList.length === 0" class="p-8 text-center">
            <svg class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p class="text-sm text-muted-foreground">No Chat Sessions yet</p>
            <p class="text-xs text-muted-foreground mt-1">Press "New Chat" to start</p>
          </div>

          <!-- Session Items -->
          <div v-else>
            <div
              v-for="s in sessionList"
              :key="s.sessionId"
              @click="handleSelectSession(s.sessionId)"
              class="group px-4 py-3 border-b border-border cursor-pointer hover:bg-blue-50/50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span class="text-sm font-medium truncate">
                      {{ s.title || 'Untitled Chat' }}
                    </span>
                  </div>
                  <div class="text-xs text-muted-foreground mt-1 pl-6">
                    {{ new Date(s.lastMessageAt).toLocaleString('en-GB', {
                      hour12: false
                    }) }}
                  </div>
                </div>

                <!-- Delete Button / Confirm -->
                <div class="flex-shrink-0 ml-2">
                  <template v-if="deleteConfirmId === s.sessionId">
                    <div class="flex items-center gap-1">
                      <button
                        @click="handleDeleteConfirm(s.sessionId, $event)"
                        class="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        @click="handleDeleteCancel($event)"
                        class="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </template>
                  <template v-else>
                    <button
                      @click="handleDeleteClick(s.sessionId, $event)"
                      class="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-all"
                      title="Delete"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ============================================================ -->
      <!-- VIEW: Chat (selected session) -->
      <!-- ============================================================ -->
      <template v-else-if="viewMode === 'chat'">
        <!-- Chat Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-blue-100 dark:border-gray-700 bg-blue-50 dark:bg-gray-800">
          <div class="flex items-center gap-3">
            <!-- Back button -->
            <button
              @click="handleBackToList"
              class="p-1.5 hover:bg-blue-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Back to list"
            >
              <svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ session?.title || 'Gemini Assistant' }}
              </h2>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ session?.sessionId }}
              </p>
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
          <ChatGeminiChat v-if="session" :show-header="false" class="h-full" />
        </div>
      </template>
    </div>
  </Transition>
</template>
