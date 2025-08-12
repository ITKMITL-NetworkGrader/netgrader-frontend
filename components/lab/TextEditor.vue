<template>
  <div class="h-full border rounded-lg overflow-hidden flex flex-col">
    <!-- Part Title Input -->
    <div class="border-b border-border p-4 flex-shrink-0">
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

    <!-- Play Selection Header -->
    <div v-if="!readonly" class="border-b border-border p-3 bg-muted/30 flex-shrink-0">
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
            <span class="text-sm">{{ selectedPlay.name }}</span>
            <button class="p-1 rounded hover:bg-muted text-destructive" @click="clearPlay">
              <X class="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Toolbar -->
    <div v-show="!readonly" class="border-b border-border p-2 flex items-center space-x-2 bg-background shadow-sm flex-shrink-0">
      <!-- Formatting Controls -->
      <div class="flex items-center space-x-1">
        <button
          class="p-1 rounded hover:bg-muted" 
          :class="{ 'bg-muted': editor?.isActive('bold') }" 
          title="Bold (Ctrl+B)"
          @click="toggleBold"
        >
          <Bold class="w-4 h-4" />
        </button>
        <button
          class="p-1 rounded hover:bg-muted" 
          :class="{ 'bg-muted': editor?.isActive('italic') }"
          title="Italic (Ctrl+I)" 
          @click="toggleItalic"
        >
          <Italic class="w-4 h-4" />
        </button>
        <button
          class="p-1 rounded hover:bg-muted" 
          :class="{ 'bg-muted': editor?.isActive('strike') }"
          title="Strikethrough" 
          @click="toggleStrikethrough"
        >
          <Strikethrough class="w-4 h-4" />
        </button>
      </div>
      <div class="h-4 border-l border-border"/>
      <!-- Headings -->
      <div class="flex items-center space-x-1">
        <button
          class="p-1 rounded hover:bg-muted" 
          :class="{ 'bg-muted': editor?.isActive('heading', { level: 1 }) }"
          title="Heading 1" 
          @click="toggleHeading(1)"
        >
          <Heading1 class="w-4 h-4" />
        </button>
        <button
          class="p-1 rounded hover:bg-muted" 
          :class="{ 'bg-muted': editor?.isActive('heading', { level: 2 }) }"
          title="Heading 2" 
          @click="toggleHeading(2)"
        >
          <Heading2 class="w-4 h-4" />
        </button>
        <button
          class="p-1 rounded hover:bg-muted" 
          :class="{ 'bg-muted': editor?.isActive('heading', { level: 3 }) }"
          title="Heading 3" 
          @click="toggleHeading(3)"
        >
          <Heading3 class="w-4 h-4" />
        </button>
      </div>
      <div class="h-4 border-l border-border"/>
      <!-- List Controls -->
      <div class="flex items-center space-x-1">
        <button
          class="p-1 rounded hover:bg-muted" 
          :class="{ 'bg-muted': editor?.isActive('bulletList') }"
          title="Bullet List" 
          @click="toggleBulletList"
        >
          <List class="w-4 h-4" />
        </button>
        <button
          class="p-1 rounded hover:bg-muted" 
          :class="{ 'bg-muted': editor?.isActive('orderedList') }"
          title="Numbered List" 
          @click="toggleOrderedList"
        >
          <ListOrdered class="w-4 h-4" />
        </button>
      </div>
      <div class="h-4 border-l border-border"/>
      <!-- Code and Quote -->
      <div class="flex items-center space-x-1">
        <button
          class="p-1 rounded hover:bg-muted" 
          :class="{ 'bg-muted': editor?.isActive('code') }" 
          title="Inline Code"
          @click="toggleCode"
        >
          <Code class="w-4 h-4" />
        </button>
        <button
          class="p-1 rounded hover:bg-muted" 
          :class="{ 'bg-muted': editor?.isActive('blockquote') }"
          title="Quote" 
          @click="toggleBlockquote"
        >
          <Quote class="w-4 h-4" />
        </button>
      </div>
      <div class="h-4 border-l border-border"/>
      <!-- Horizontal Rule -->
      <div class="flex items-center space-x-1">
        <button 
          class="p-1 rounded hover:bg-muted" 
          title="Horizontal Rule" 
          @click="addHorizontalRule"
        >
          <Minus class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Editor Content Area -->
    <div class="flex-1 p-4 overflow-y-auto">
      <div
        :class="{
          'border border-destructive rounded-md p-2': !readonly && showValidation && contentError
        }"
      >
        <EditorContent
          :editor="editor"
          class="prose prose-sm max-w-none focus:outline-none min-h-[300px]"
          :class="{
            'cursor-text': !readonly,
            'cursor-default': readonly,
            'bg-muted/30': readonly
          }"
        />
      </div>
      <div
        v-if="!readonly && showValidation && contentError"
        class="flex items-center space-x-1 text-sm text-destructive mt-2"
      >
        <AlertCircle class="w-4 h-4" />
        <span>{{ contentError }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

import { Input } from '@/components/ui/input'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Settings,
  X,
  AlertCircle,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus
} from 'lucide-vue-next'

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

// State
const partTitle = ref(props.title)

// Validation states
const titleError = ref<string | null>(null)
const contentError = ref<string | null>(null)

// Initialize editor
const editor = useEditor({
  content: props.modelValue,
  editable: !props.readonly,
  extensions: [
    StarterKit,
    Placeholder.configure({
      placeholder: 'Type "/" for commands, or start writing...',
    }),
  ],
  onUpdate: ({ editor }) => {
    const html = editor.getHTML()
    emit('update:modelValue', html)
    if (props.showValidation) {
      validateContent()
    }
  },
})

// Watch for prop changes
watch(() => props.modelValue, (newValue) => {
  if (editor.value && newValue !== editor.value.getHTML()) {
    editor.value.commands.setContent(newValue)
  }
})

watch(() => props.title, (newTitle) => {
  if (newTitle !== partTitle.value) {
    partTitle.value = newTitle
  }
})

watch(() => props.readonly, (readonly) => {
  if (editor.value) {
    editor.value.setEditable(!readonly)
  }
})

// Debounced title update
let titleTimeout: NodeJS.Timeout | null = null
const updateTitle = () => {
  if (titleTimeout) {
    clearTimeout(titleTimeout)
  }
  titleTimeout = setTimeout(() => {
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
  if (!props.readonly && props.showValidation && editor.value) {
    const textContent = editor.value.getText()
    if (!textContent.trim()) {
      contentError.value = 'Part content is required'
    } else if (textContent.trim().length < 10) {
      contentError.value = 'Part content must be at least 10 characters'
    } else {
      contentError.value = null
    }
  }
}

// Editor commands
const toggleBold = () => {
  editor.value?.chain().focus().toggleBold().run()
}

const toggleItalic = () => {
  editor.value?.chain().focus().toggleItalic().run()
}

const toggleStrikethrough = () => {
  editor.value?.chain().focus().toggleStrike().run()
}

const toggleHeading = (level: 1 | 2 | 3) => {
  editor.value?.chain().focus().toggleHeading({ level }).run()
}

const toggleBulletList = () => {
  editor.value?.chain().focus().toggleBulletList().run()
}

const toggleOrderedList = () => {
  editor.value?.chain().focus().toggleOrderedList().run()
}

const toggleCode = () => {
  editor.value?.chain().focus().toggleCode().run()
}

const toggleBlockquote = () => {
  editor.value?.chain().focus().toggleBlockquote().run()
}

const addHorizontalRule = () => {
  editor.value?.chain().focus().setHorizontalRule().run()
}

// Play modal functions
const openPlayModal = () => {
  emit('open-play-modal')
}

const clearPlay = () => {
  emit('clear-play')
}

// Clean up
onBeforeUnmount(() => {
  if (titleTimeout) {
    clearTimeout(titleTimeout)
  }
  editor.value?.destroy()
})
</script>

<style>
.ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: #adb5bd;
  pointer-events: none;
  height: 0;
}

.ProseMirror:focus {
  outline: none;
}

/* Add some basic styling for the editor content */
.ProseMirror h1 {
  font-size: 1.75rem;
  font-weight: 700;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.ProseMirror h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.ProseMirror h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.ProseMirror p {
  margin-bottom: 0.5rem;
}

.ProseMirror ul {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin-bottom: 0.5rem;
}

.ProseMirror ol {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin-bottom: 0.5rem;
}

.ProseMirror blockquote {
  border-left: 3px solid #e2e8f0;
  padding-left: 1rem;
  margin-left: 0;
  margin-right: 0;
  font-style: italic;
}

.ProseMirror code {
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
  padding: 0.2em 0.4em;
  font-family: monospace;
}

.ProseMirror hr {
  border: none;
  border-top: 2px solid #e2e8f0;
  margin: 1rem 0;
}

/* Make the editor content properly positioned */
.ProseMirror {
  padding: 1rem;
  min-height: 300px;
}
</style>