<template>
  <VueFinalModal
    v-model="isOpen"
    :content-class="modalContentClass"
    :hide-overlay="true"
    content-transition="vfm-fade"
    :focus-trap="true"
    :esc-to-close="!hasUnsavedChanges"
    @before-close="handleCloseAttempt"
  >
    <div class="flex flex-col h-full bg-background pt-16">
      <!-- Header -->
      <header class="flex-shrink-0 flex justify-between items-center p-4 border-b border-border bg-background">
        <div class="flex items-center gap-3">
          <Icon name="lucide:file-text" class="w-5 h-5 text-muted-foreground" />
          <div>
            <h2 class="text-xl font-semibold text-foreground">
              {{ title }}
            </h2>
            <p v-if="subtitle" class="text-sm text-muted-foreground">
              {{ subtitle }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Auto-save indicator -->
          <div
            v-if="autoSaveEnabled"
            class="flex items-center gap-2 px-2 py-1 text-xs rounded-full"
            :class="{
              'bg-green-500/10 text-green-600': !hasUnsavedChanges && lastSaved,
              'bg-yellow-500/10 text-yellow-600': hasUnsavedChanges,
              'bg-muted text-muted-foreground': !lastSaved
            }"
          >
            <Icon
              :name="hasUnsavedChanges ? 'lucide:clock' : 'lucide:check'"
              class="w-3 h-3"
            />
            <span v-if="lastSaved && !hasUnsavedChanges">
              Saved {{ formatTime(lastSaved) }}
            </span>
            <span v-else-if="hasUnsavedChanges">
              Unsaved changes
            </span>
            <span v-else>
              Not saved
            </span>
          </div>

          <!-- Action buttons -->
          <button
            @click="saveDocument"
            :disabled="isSaving || !hasUnsavedChanges"
            class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors text-sm"
            title="Save (Ctrl+S)"
          >
            <Icon
              v-if="isSaving"
              name="lucide:loader-2"
              class="w-4 h-4 animate-spin mr-1"
            />
            <Icon v-else name="lucide:save" class="w-4 h-4 mr-1" />
            Save
          </button>

          <button
            @click="closeEditor"
            class="px-4 py-2 text-foreground bg-muted hover:bg-muted/80 rounded-md transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </header>

      <!-- Main Editor Area -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Editor Panel -->
        <div class="flex-1 flex flex-col">
          <RichTextEditor
            ref="editorRef"
            v-model="content"
            :placeholder="placeholder"
            :show-toolbar="true"
            :show-status-bar="false"
            :autofocus="true"
            :editor-class="'flex-1 overflow-y-auto min-h-0'"
            @focus="handleFocus"
            @blur="handleBlur"
            @save="saveDocument"
            class="border-0 flex-1 flex flex-col"
          />
        </div>

        <!-- Side Panel (Optional) -->
        <div
          v-if="showSidePanel"
          class="w-80 border-l border-border bg-muted flex-shrink-0 overflow-y-auto"
        >
          <div class="p-4">
            <h3 class="text-sm font-medium text-foreground mb-3">
              Document Info
            </h3>

            <!-- Statistics -->
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-muted-foreground">Words:</span>
                <span class="font-medium">{{ statistics.words }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted-foreground">Characters:</span>
                <span class="font-medium">{{ statistics.characters }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted-foreground">Reading time:</span>
                <span class="font-medium">{{ statistics.readingTime }} min</span>
              </div>
            </div>

            <hr class="my-4 border-border" />

            <!-- Quick Actions -->
            <div class="space-y-2">
              <h4 class="text-sm font-medium text-foreground">
                Quick Actions
              </h4>

              <button
                @click="exportAsMarkdown"
                class="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground rounded-md flex items-center gap-2"
              >
                <Icon name="lucide:download" class="w-4 h-4" />
                Export as Markdown
              </button>

              <button
                @click="copyContent"
                class="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground rounded-md flex items-center gap-2"
              >
                <Icon name="lucide:copy" class="w-4 h-4" />
                Copy Content
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Status Bar -->
      <footer class="flex-shrink-0 border-t border-border px-4 py-2 text-sm text-muted-foreground bg-muted">
        <div class="flex justify-between items-center">
          <div class="flex gap-4">
            <span>{{ statistics.words }} words</span>
            <span>{{ statistics.characters }} characters</span>
            <span v-if="statistics.readingTime > 0">
              {{ statistics.readingTime }} min read
            </span>
          </div>

          <div class="flex items-center gap-4">
            <!-- Keyboard shortcuts help -->
            <button
              @click="showShortcuts = !showShortcuts"
              class="hover:text-foreground transition-colors"
              title="Keyboard shortcuts"
            >
              <Icon name="lucide:keyboard" class="w-4 h-4" />
            </button>

            <!-- Full screen toggle -->
            <button
              @click="toggleSidePanel"
              class="hover:text-foreground transition-colors"
              :title="showSidePanel ? 'Hide side panel' : 'Show side panel'"
            >
              <Icon
                :name="showSidePanel ? 'lucide:sidebar-close' : 'lucide:sidebar-open'"
                class="w-4 h-4"
              />
            </button>
          </div>
        </div>
      </footer>
    </div>

    <!-- Keyboard Shortcuts Help -->
    <div
      v-if="showShortcuts"
      class="absolute bottom-16 right-4 bg-card border border-border rounded-lg shadow-lg p-4 w-80 z-10"
    >
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-sm font-medium text-foreground">
          Keyboard Shortcuts
        </h3>
        <button
          @click="showShortcuts = false"
          class="text-muted-foreground hover:text-foreground"
        >
          <Icon name="lucide:x" class="w-4 h-4" />
        </button>
      </div>

      <div class="space-y-2 text-sm">
        <div v-for="shortcut in keyboardShortcuts" :key="shortcut.keys" class="flex justify-between">
          <span class="text-muted-foreground">{{ shortcut.description }}</span>
          <kbd class="px-2 py-1 bg-muted rounded text-xs font-mono">
            {{ shortcut.keys }}
          </kbd>
        </div>
      </div>
    </div>

    <!-- Unsaved Changes Confirmation -->
    <div
      v-if="showUnsavedDialog"
      class="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <div class="bg-card border border-border rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div class="flex items-center gap-3 mb-4">
          <Icon name="lucide:alert-triangle" class="w-6 h-6 text-yellow-500" />
          <h3 class="text-lg font-semibold text-foreground">
            Unsaved Changes
          </h3>
        </div>

        <p class="text-muted-foreground mb-6">
          You have unsaved changes. What would you like to do?
        </p>

        <div class="flex justify-end gap-2">
          <button
            @click="discardChanges"
            class="px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground rounded-md"
          >
            Discard Changes
          </button>
          <button
            @click="saveAndClose"
            class="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Save & Close
          </button>
          <button
            @click="showUnsavedDialog = false"
            class="px-4 py-2 text-sm font-medium bg-muted text-foreground rounded-md hover:bg-muted/80"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </VueFinalModal>
</template>

<script setup lang="ts">
import { VueFinalModal } from 'vue-final-modal'
import RichTextEditor from './RichTextEditor.vue'
import { buildRichTextContent, markdownToHtml } from '~/utils/contentCompat'

interface Props {
  modelValue: boolean
  content?: string
  title?: string
  subtitle?: string
  placeholder?: string
  autoSaveEnabled?: boolean
}

interface RichTextPayload {
  html: string
  json: any
  markdown?: string
}

const props = withDefaults(defineProps<Props>(), {
  content: '',
  title: 'Document Editor',
  subtitle: '',
  placeholder: 'Start writing...',
  autoSaveEnabled: true
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:content': [content: string]
  'save': [payload: RichTextPayload]
  'close': [payload: RichTextPayload]
}>()

// Reactive state
const isOpen = ref(props.modelValue)
const content = ref(props.content)
const originalContent = ref(props.content)
const lastSaved = ref<Date | null>(null)
const isSaving = ref(false)
const showSidePanel = ref(true)
const showShortcuts = ref(false)
const showUnsavedDialog = ref(false)

// Editor ref
const editorRef = ref<InstanceType<typeof RichTextEditor>>()

// Modal content class
const modalContentClass = computed(() => [
  'w-full h-full flex flex-col',
  'bg-background',
  'fixed inset-0 z-50'
])

// Check for unsaved changes
const hasUnsavedChanges = computed(() => {
  return content.value !== originalContent.value
})

// Document statistics
const statistics = computed(() => {
  const text = editorRef.value?.getText() || ''
  const words = text.split(/\s+/).filter(word => word.length > 0).length
  const characters = text.length
  const readingTime = Math.ceil(words / 200) // 200 WPM average

  return {
    words,
    characters,
    readingTime
  }
})

// Keyboard shortcuts reference
const keyboardShortcuts = [
  { keys: 'Ctrl+S', description: 'Save document' },
  { keys: 'Ctrl+B', description: 'Bold text' },
  { keys: 'Ctrl+I', description: 'Italic text' },
  { keys: 'Ctrl+K', description: 'Insert link' },
  { keys: 'Ctrl+Z', description: 'Undo' },
  { keys: 'Ctrl+Y', description: 'Redo' },
  { keys: 'Ctrl+/', description: 'Toggle shortcuts' }
]

// Methods
const handleFocus = () => {
  // Handle editor focus
}

const handleBlur = () => {
  // Auto-save on blur if enabled
  if (props.autoSaveEnabled && hasUnsavedChanges.value) {
    debouncedAutoSave()
  }
}

const buildPayload = (): RichTextPayload => {
  const markdown = content.value
  return {
    html: markdownToHtml(markdown),
    json: { type: 'doc', content: [] },
    markdown,
  }
}

const saveDocument = async (): Promise<RichTextPayload | void> => {
  if (isSaving.value || !hasUnsavedChanges.value) return

  isSaving.value = true
  try {
    const payload = buildPayload()
    emit('save', payload)
    originalContent.value = payload.html
    lastSaved.value = new Date()
    return payload
  } catch (error) {
    console.error('Failed to save document:', error)
  } finally {
    isSaving.value = false
  }
}

const handleCloseAttempt = () => {
  if (hasUnsavedChanges.value) {
    showUnsavedDialog.value = true
    return false // Prevent closing
  }

  closeEditor()
  return true
}

const closeEditor = () => {
  const payload = buildPayload()
  emit('close', payload)
  emit('update:modelValue', false)
  isOpen.value = false
}

const saveAndClose = async () => {
  showUnsavedDialog.value = false
  await saveDocument()
  closeEditor()
}

const discardChanges = () => {
  showUnsavedDialog.value = false
  content.value = originalContent.value
  closeEditor()
}

const toggleSidePanel = () => {
  showSidePanel.value = !showSidePanel.value
}

// Auto-save functionality
const debouncedAutoSave = debounce(async () => {
  if (props.autoSaveEnabled && hasUnsavedChanges.value) {
    await saveDocument()
  }
}, 2000)

// Simple debounce function
function debounce(func: Function, wait: number) {
  let timeout: NodeJS.Timeout
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Export functions
const exportAsMarkdown = () => {
  const markdown = content.value
  const blob = new Blob([markdown], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'document.md'
  link.click()
  URL.revokeObjectURL(url)
}

const copyContent = async () => {
  try {
    await navigator.clipboard.writeText(content.value)
    // Show success toast
  } catch (error) {
    console.error('Failed to copy content:', error)
  }
}

// Utility functions
const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// Keyboard shortcuts
const handleKeyboard = (e: KeyboardEvent) => {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case 's':
        e.preventDefault()
        saveDocument()
        break
      case '/':
        e.preventDefault()
        showShortcuts.value = !showShortcuts.value
        break
    }
  }

  // Escape key to close shortcuts
  if (e.key === 'Escape' && showShortcuts.value) {
    showShortcuts.value = false
  }
}

// Watchers
watch(() => props.modelValue, (value) => {
  isOpen.value = value
})

watch(isOpen, (value) => {
  emit('update:modelValue', value)

  if (value) {
    // Reset state when opening
    content.value = props.content
    originalContent.value = props.content
    lastSaved.value = null
  }
})

watch(() => props.content, (value) => {
  if (value !== content.value) {
    content.value = value
    originalContent.value = value
  }
})

watch(content, (value) => {
  emit('update:content', value)

  // Auto-save if enabled
  if (props.autoSaveEnabled) {
    debouncedAutoSave()
  }
})

// Lifecycle
onMounted(() => {
  document.addEventListener('keydown', handleKeyboard)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyboard)
})

// Focus management
watch(isOpen, (open) => {
  if (open) {
    nextTick(() => {
      editorRef.value?.focus()
    })
  }
})
</script>
