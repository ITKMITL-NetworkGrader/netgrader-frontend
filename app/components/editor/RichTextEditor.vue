<template>
  <div class="rich-text-editor" :class="{ 'is-focused': isFocused, 'is-readonly': !editable }">
    <ClientOnly>
      <MilkdownProvider>
        <MilkdownEditor
          ref="milkdownRef"
          :default-value="initialContent"
          :placeholder="placeholder"
          :editable="editable"
          :show-toolbar="showToolbar"
          :editor-class="editorClass"
          @update="onContentUpdate"
          @focus="onFocus"
          @blur="onBlur"
          @ready="onEditorReady"
        />
      </MilkdownProvider>
      <template #fallback>
        <div class="flex items-center justify-center min-h-[200px] text-muted-foreground text-sm">
          Loading editor...
        </div>
      </template>
    </ClientOnly>

    <!-- Status Bar -->
    <div
      v-if="showStatusBar && wordCount >= 0"
      class="editor-status-bar border-t px-3 py-2 text-sm"
      role="status"
      aria-live="polite"
    >
      <div class="flex justify-between items-center">
        <div class="flex gap-4 text-muted-foreground">
          <span>{{ wordCount }} words</span>
          <span>{{ charCount }} characters</span>
        </div>
        <div v-if="lastSaved" class="text-xs text-muted-foreground">
          Last saved: {{ formatTime(lastSaved) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MilkdownProvider } from '@milkdown/vue'
import { getEditorContent } from '~/utils/contentCompat'

interface Props {
  modelValue?: string
  placeholder?: string
  editorClass?: string
  showToolbar?: boolean
  showStatusBar?: boolean
  autofocus?: boolean
  editable?: boolean
  maxLength?: number
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: 'Start typing...',
  editorClass: '',
  showToolbar: true,
  showStatusBar: true,
  autofocus: false,
  editable: true,
  maxLength: 50000,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'save': [content: string]
  'focus': []
  'blur': []
}>()

const milkdownRef = ref<any>(null)
const isFocused = ref(false)
const lastSaved = ref<Date | null>(null)
const currentMarkdown = ref('')
const wordCount = ref(0)
const charCount = ref(0)

// Convert initial value (may be HTML or Markdown) to Markdown for the editor
const initialContent = computed(() => {
  return getEditorContent(props.modelValue)
})

const onContentUpdate = (markdown: string) => {
  currentMarkdown.value = markdown
  emit('update:modelValue', markdown)
  updateStats(markdown)
}

const onFocus = () => {
  isFocused.value = true
  emit('focus')
}

const onBlur = () => {
  isFocused.value = false
  emit('blur')
}

const onEditorReady = () => {
  if (props.autofocus) {
    nextTick(() => milkdownRef.value?.focus?.())
  }
  updateStats(initialContent.value)
}

const updateStats = (text: string) => {
  const plain = text.replace(/[#*_~`>\-\[\]()!|]/g, '').trim()
  const words = plain.split(/\s+/).filter(w => w.length > 0)
  wordCount.value = words.length
  charCount.value = plain.length
}

const save = () => {
  emit('save', currentMarkdown.value)
  lastSaved.value = new Date()
}

const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

// Watch for external content changes
watch(() => props.modelValue, (newValue) => {
  const converted = getEditorContent(newValue)
  if (converted !== currentMarkdown.value) {
    milkdownRef.value?.setContent?.(converted)
  }
})

// Keyboard shortcuts
onMounted(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      save()
    }
  }
  document.addEventListener('keydown', handler)
  onBeforeUnmount(() => document.removeEventListener('keydown', handler))
})

// Expose methods
defineExpose({
  save,
  getMarkdown: () => currentMarkdown.value,
  getHTML: () => milkdownRef.value?.getHTML?.() || '',
  getText: () => currentMarkdown.value.replace(/[#*_~`>\-\[\]()!|]/g, '').trim(),
  focus: () => milkdownRef.value?.focus?.(),
  blur: () => milkdownRef.value?.blur?.(),
})
</script>

<style scoped>
.rich-text-editor {
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  overflow: hidden;
  background-color: var(--card);
}

.rich-text-editor.is-focused {
  outline: 2px solid var(--ring);
  outline-offset: -1px;
  border-color: transparent;
}

.editor-status-bar {
  border-color: var(--border);
  background-color: var(--muted);
}
</style>
