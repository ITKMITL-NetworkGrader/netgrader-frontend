<template>
  <div class="flex flex-col h-full border rounded-lg overflow-hidden">
    <!-- Part Title Input -->
    <div class="border-b border-border p-4">
      <div class="space-y-2">
        <Input
          v-model="partTitle"
          placeholder="Part Title (Required)"
          :class="[
            'text-lg font-semibold',
            {
              'border-destructive focus:border-destructive focus:ring-destructive':
                !readonly && showValidation && (!partTitle || !partTitle.trim())
            }
          ]"
          :readonly="readonly"
          @input="updateTitle"
          @blur="validateTitle"
        />
        <div
          v-if="!readonly && showValidation && titleError"
          class="flex items-center space-x-1 text-sm text-destructive"
        >
          <AlertCircle class="w-4 h-4" />
          <span>{{ titleError }}</span>
        </div>
      </div>
    </div>

    <!-- Content Editor with Play Selection -->
    <div class="flex-1 flex flex-col">
      <!-- Play Selection Header -->
      <div v-if="!readonly" class="border-b border-border p-3 bg-muted/30">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium">Content & Play Configuration</span>
          <div class="flex items-center space-x-2">
            <button
              class="px-3 py-1 text-sm border rounded hover:bg-muted flex items-center space-x-2"
              @click="openPlayModal"
            >
              <Settings class="w-4 h-4" />
              <span>Select Play</span>
            </button>

            <div v-if="!selectedPlay" class="flex items-center space-x-1">
              <span class="text-sm text-muted-foreground">A Play must be selected to save this part</span>
              <AlertCircle v-if="showValidation" class="w-4 h-4 text-destructive" />
            </div>
            <div v-else class="flex items-center space-x-1">
              <span class="text-sm">{{ selectedPlay.title }}</span>
              <button class="p-1 rounded hover:bg-muted text-destructive" @click="clearPlay">
                <X class="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Quill Editor -->
      <div class="flex-1 p-4">
        <ClientOnly>
          <QuillEditor
            v-model:content="content"
            :options="quillOptions"
            :disabled="readonly"
            content-type="html"
            class="h-full"
            :class="{
              'border border-destructive rounded-md': !readonly && showValidation && contentError
            }"
            @text-change="handleContentChange"
          />
          <template #fallback>
            <div class="h-full border rounded-md p-4 bg-gray-50">
              <p class="text-gray-500">Loading editor...</p>
            </div>
          </template>
        </ClientOnly>
        <div
          v-if="!readonly && showValidation && contentError"
          class="flex items-center space-x-1 text-sm text-destructive mt-2"
        >
          <AlertCircle class="w-4 h-4" />
          <span>{{ contentError }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Input } from '@/components/ui/input'
import { Settings, X, AlertCircle } from 'lucide-vue-next'
import '@vueup/vue-quill/dist/vue-quill.snow.css'

interface Play {
  id: string
  title: string
  description: string
}

interface Props {
  modelValue: string
  title: string
  readonly?: boolean
  selectedPlay?: Play | null
  showValidation?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'update:title', value: string): void
  (e: 'open-play-modal'): void
  (e: 'clear-play'): void
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  selectedPlay: null,
  showValidation: false
})

const emit = defineEmits<Emits>()

// Dynamic import for Quill Editor
const { QuillEditor } = await import('@vueup/vue-quill')

// State
const partTitle = ref(props.title)
const content = ref(props.modelValue)

// Validation states
const titleError = ref<string | null>(null)
const contentError = ref<string | null>(null)

// Quill configuration
const quillOptions = computed(() => ({
  theme: 'snow',
  placeholder: 'Start writing your lab instructions...',
  modules: {
    toolbar: props.readonly ? false : [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['blockquote', 'code-block'],
      [{ 'color': [] }, { 'background': [] }],
      ['link'],
      ['clean']
    ]
  },
  readOnly: props.readonly
}))

// Watch for prop changes
watch(() => props.modelValue, (newValue) => {
  if (newValue !== content.value) {
    content.value = newValue
  }
})

watch(() => props.title, (newTitle) => {
  if (newTitle !== partTitle.value) {
    partTitle.value = newTitle
  }
})

// Handle content changes with debouncing
let contentChangeTimeout: NodeJS.Timeout | null = null
const handleContentChange = () => {
  if (contentChangeTimeout) {
    clearTimeout(contentChangeTimeout)
  }
  contentChangeTimeout = setTimeout(() => {
    emit('update:modelValue', content.value)
    if (props.showValidation) {
      validateContent()
    }
  }, 300)
}

// Handle title changes with debouncing
let titleChangeTimeout: NodeJS.Timeout | null = null
const updateTitle = () => {
  if (titleChangeTimeout) {
    clearTimeout(titleChangeTimeout)
  }
  titleChangeTimeout = setTimeout(() => {
    emit('update:title', partTitle.value)
    if (props.showValidation) {
      validateTitle()
    }
  }, 300)
}

const validateTitle = () => {
  if (!props.readonly && props.showValidation) {
    if (!partTitle.value || !partTitle.value.trim()) {
      titleError.value = 'Part title is required'
    } else if (partTitle.value.trim().length < 3) {
      titleError.value = 'Part title must be at least 3 characters'
    } else if (partTitle.value.trim().length > 100) {
      titleError.value = 'Part title must be less than 100 characters'
    } else {
      titleError.value = null
    }
  }
}

const validateContent = () => {
  if (!props.readonly && props.showValidation) {
    // Extract text content from HTML
    const textContent = content.value.replace(/<[^>]*>/g, '').trim()
    if (!textContent) {
      contentError.value = 'Part content is required'
    } else if (textContent.length < 10) {
      contentError.value = 'Part content must be at least 10 characters'
    } else {
      contentError.value = null
    }
  }
}

// Play modal functions
const openPlayModal = () => {
  emit('open-play-modal')
}

const clearPlay = () => {
  emit('clear-play')
}

// Cleanup
onBeforeUnmount(() => {
  if (contentChangeTimeout) {
    clearTimeout(contentChangeTimeout)
  }
  if (titleChangeTimeout) {
    clearTimeout(titleChangeTimeout)
  }
})
</script>

<style>
/* Custom Quill styles */
.ql-container {
  font-size: 14px;
  height: calc(100% - 42px) !important;
}

.ql-editor {
  min-height: 200px;
  line-height: 1.6;
}

.ql-editor.ql-blank::before {
  color: #6b7280;
  font-style: normal;
}

/* Ensure toolbar is visible but not too prominent */
.ql-toolbar {
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

/* Make the editor area fill available space */
.quill-editor {
  height: 100%;
}

.ql-container.ql-snow {
  border: none;
}

.ql-toolbar.ql-snow {
  border: none;
  border-bottom: 1px solid #e5e7eb;
}
</style>