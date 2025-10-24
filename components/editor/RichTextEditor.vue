<template>
  <div class="rich-text-editor" :class="{ 'is-focused': editor?.isFocused }">
    <!-- Toolbar -->
    <div
      v-if="showToolbar && editor"
      class="editor-toolbar border-b border-gray-200 dark:border-gray-700 p-2 flex flex-wrap gap-1 bg-gray-50 dark:bg-gray-800"
      role="toolbar"
      aria-label="Text Formatting"
    >
      <!-- Text Formatting -->
      <div class="toolbar-group">
        <button
          @click="editor.commands.toggleBold()"
          :class="{ 'is-active': editor.isActive('bold') }"
          class="toolbar-btn"
          :aria-pressed="editor.isActive('bold')"
          title="Bold (Ctrl+B)"
        >
          <Icon name="lucide:bold" class="w-4 h-4" />
        </button>

        <button
          @click="editor.commands.toggleItalic()"
          :class="{ 'is-active': editor.isActive('italic') }"
          class="toolbar-btn"
          :aria-pressed="editor.isActive('italic')"
          title="Italic (Ctrl+I)"
        >
          <Icon name="lucide:italic" class="w-4 h-4" />
        </button>

        <button
          @click="editor.commands.toggleStrike()"
          :class="{ 'is-active': editor.isActive('strike') }"
          class="toolbar-btn"
          :aria-pressed="editor.isActive('strike')"
          title="Strikethrough"
        >
          <Icon name="lucide:strikethrough" class="w-4 h-4" />
        </button>

        <button
          @click="editor.commands.toggleCode()"
          :class="{ 'is-active': editor.isActive('code') }"
          class="toolbar-btn"
          :aria-pressed="editor.isActive('code')"
          title="Code"
        >
          <Icon name="lucide:code" class="w-4 h-4" />
        </button>
      </div>

      <div class="toolbar-separator"></div>

      <!-- Headings -->
      <div class="toolbar-group">
        <button
          @click="editor.commands.toggleHeading({ level: 1 })"
          :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }"
          class="toolbar-btn"
          title="Heading 1"
        >
          H1
        </button>

        <button
          @click="editor.commands.toggleHeading({ level: 2 })"
          :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }"
          class="toolbar-btn"
          title="Heading 2"
        >
          H2
        </button>

        <button
          @click="editor.commands.toggleHeading({ level: 3 })"
          :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }"
          class="toolbar-btn"
          title="Heading 3"
        >
          H3
        </button>
      </div>

      <div class="toolbar-separator"></div>

      <!-- Lists -->
      <div class="toolbar-group">
        <button
          @click="editor.commands.toggleBulletList()"
          :class="{ 'is-active': editor.isActive('bulletList') }"
          class="toolbar-btn"
          title="Bullet List"
        >
          <Icon name="lucide:list" class="w-4 h-4" />
        </button>

        <button
          @click="editor.commands.toggleOrderedList()"
          :class="{ 'is-active': editor.isActive('orderedList') }"
          class="toolbar-btn"
          title="Numbered List"
        >
          <Icon name="lucide:list-ordered" class="w-4 h-4" />
        </button>

        <button
          @click="editor.commands.toggleBlockquote()"
          :class="{ 'is-active': editor.isActive('blockquote') }"
          class="toolbar-btn"
          title="Quote"
        >
          <Icon name="lucide:quote" class="w-4 h-4" />
        </button>
      </div>

      <div class="toolbar-separator"></div>

      <!-- Alignment -->
      <div class="toolbar-group">
        <button
          @click="editor.commands.setTextAlign('left')"
          :class="{ 'is-active': editor.isActive({ textAlign: 'left' }) }"
          class="toolbar-btn"
          title="Align Left"
        >
          <Icon name="lucide:align-left" class="w-4 h-4" />
        </button>

        <button
          @click="editor.commands.setTextAlign('center')"
          :class="{ 'is-active': editor.isActive({ textAlign: 'center' }) }"
          class="toolbar-btn"
          title="Align Center"
        >
          <Icon name="lucide:align-center" class="w-4 h-4" />
        </button>

        <button
          @click="editor.commands.setTextAlign('right')"
          :class="{ 'is-active': editor.isActive({ textAlign: 'right' }) }"
          class="toolbar-btn"
          title="Align Right"
        >
          <Icon name="lucide:align-right" class="w-4 h-4" />
        </button>
      </div>

      <div class="toolbar-separator"></div>

      <!-- Image and Link -->
      <div class="toolbar-group">
        <button
          @click="showImageDialog = true"
          class="toolbar-btn"
          title="Insert Image"
        >
          <Icon name="lucide:image" class="w-4 h-4" />
        </button>

        <button
          @click="toggleLink"
          :class="{ 'is-active': editor.isActive('link') }"
          class="toolbar-btn"
          title="Insert Link"
        >
          <Icon name="lucide:link" class="w-4 h-4" />
        </button>

        <button
          @click="editor.commands.setHorizontalRule()"
          class="toolbar-btn"
          title="Horizontal Rule"
        >
          <Icon name="lucide:minus" class="w-4 h-4" />
        </button>
      </div>

      <div class="toolbar-separator"></div>

      <!-- Code Block -->
      <div class="toolbar-group">
        <button
          @click="editor.commands.toggleCodeBlock()"
          :class="{ 'is-active': editor.isActive('codeBlock') }"
          class="toolbar-btn"
          title="Code Block"
        >
          <Icon name="lucide:code-2" class="w-4 h-4" />
        </button>
      </div>

      <div class="toolbar-separator"></div>

      <!-- Undo/Redo -->
      <div class="toolbar-group">
        <button
          @click="editor.commands.undo()"
          :disabled="!editor.can().undo()"
          class="toolbar-btn"
          title="Undo (Ctrl+Z)"
        >
          <Icon name="lucide:undo" class="w-4 h-4" />
        </button>

        <button
          @click="editor.commands.redo()"
          :disabled="!editor.can().redo()"
          class="toolbar-btn"
          title="Redo (Ctrl+Y)"
        >
          <Icon name="lucide:redo" class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Editor Content -->
    <div class="editor-content-wrapper relative flex-1 overflow-hidden">
      <EditorContent
        :editor="editor"
        class="prose prose-sm max-w-none dark:prose-invert focus:outline-none h-full"
        :class="editorClass"
        role="textbox"
        aria-multiline="true"
        :aria-label="`Rich text editor${props.placeholder ? ': ' + props.placeholder : ''}`"
        :aria-describedby="showStatusBar ? `${editorId}-status` : undefined"
      />

      <!-- Upload Progress -->
      <div
        v-if="isUploading"
        class="absolute inset-0 bg-black/20 flex items-center justify-center backdrop-blur-sm"
      >
        <div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
          <div class="flex items-center gap-3">
            <Icon name="lucide:upload" class="w-5 h-5 animate-spin" />
            <span>Uploading image... {{ uploadProgress }}%</span>
          </div>
          <div class="w-48 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-2">
            <div
              class="h-2 bg-blue-500 rounded-full transition-all duration-300"
              :style="{ width: `${uploadProgress}%` }"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Status Bar -->
    <div
      v-if="showStatusBar && editor"
      :id="`${editorId}-status`"
      class="editor-status-bar border-t border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800"
      role="status"
      aria-live="polite"
    >
      <div class="flex justify-between items-center">
        <div class="flex gap-4">
          <span>{{ characterCount.words }} words</span>
          <span>{{ characterCount.characters }} characters</span>
        </div>
        <div v-if="lastSaved" class="text-xs">
          Last saved: {{ formatTime(lastSaved) }}
        </div>
      </div>
    </div>

    <!-- Image Dialog -->
    <ImageInsertDialog
      :show="showImageDialog"
      @update:show="showImageDialog = $event"
      @insert="insertImage"
    />

    <!-- Link Dialog -->
    <LinkInsertDialog
      :show="showLinkDialog"
      @update:show="showLinkDialog = $event"
      :current-url="currentLinkUrl"
      @insert="insertLink"
      @remove="removeLink"
    />
  </div>
</template>

<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import CharacterCount from '@tiptap/extension-character-count'
import Placeholder from '@tiptap/extension-placeholder'

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
  maxLength: 50000
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'save': [content: string]
  'focus': []
  'blur': []
}>()

// Image upload composable
const {
  isUploading,
  uploadProgress,
  uploadFile,
  setupDragDrop,
  setupClipboardPaste,
  insertImageFromUrl
} = useImageUpload()

// Reactive state
const showImageDialog = ref(false)
const showLinkDialog = ref(false)
const currentLinkUrl = ref('')
const lastSaved = ref<Date | null>(null)
const editorId = ref(`editor-${Math.random().toString(36).substr(2, 9)}`)

// TipTap Editor
const editor = useEditor({
  content: props.modelValue,
  editable: props.editable,
  autofocus: props.autofocus,

  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3, 4, 5, 6]
      },
      link: false // Disable StarterKit's link extension to avoid duplicate
    }),
    Image.configure({
      allowBase64: false,
      HTMLAttributes: {
        class: 'editor-image max-w-full h-auto rounded-lg'
      }
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-blue-500 hover:text-blue-700 underline',
        target: '_blank',
        rel: 'noopener noreferrer'
      }
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph']
    }),
    CharacterCount.configure({
      limit: props.maxLength
    }),
    Placeholder.configure({
      placeholder: props.placeholder
    })
  ],

  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  },

  onFocus: () => {
    emit('focus')
  },

  onBlur: () => {
    emit('blur')
  },

  onCreate: ({ editor }) => {
    // Setup drag and drop
    const { handleDrop } = setupDragDrop(editor)
    editor.view.dom.addEventListener('drop', handleDrop)

    // Setup clipboard paste
    const { handlePaste } = setupClipboardPaste(editor)
    editor.view.dom.addEventListener('paste', handlePaste)
  }
})

// Character count computed
const characterCount = computed(() => {
  if (!editor.value) return { words: 0, characters: 0 }

  const storage = editor.value.storage.characterCount
  return {
    words: storage.words(),
    characters: storage.characters()
  }
})

// Methods
const toggleLink = () => {
  if (editor.value?.isActive('link')) {
    editor.value.commands.unsetLink()
  } else {
    const url = editor.value?.getAttributes('link').href
    currentLinkUrl.value = url || ''
    showLinkDialog.value = true
  }
}

const insertLink = (url: string, text?: string, openInNewTab?: boolean) => {
  if (text) {
    editor.value?.commands.insertContent(`<a href="${url}"${openInNewTab ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`)
  } else {
    editor.value?.commands.setLink({ href: url, target: openInNewTab ? '_blank' : undefined })
  }
  showLinkDialog.value = false
}

const removeLink = () => {
  editor.value?.commands.unsetLink()
  showLinkDialog.value = false
}

const insertImage = async (data: { type: 'url' | 'file', value: string | File, alt?: string }) => {
  try {
    if (data.type === 'file' && data.value instanceof File) {
      const result = await uploadFile(data.value)
      insertImageFromUrl(editor.value, result.url, data.alt || result.originalName)
    } else if (data.type === 'url' && typeof data.value === 'string') {
      insertImageFromUrl(editor.value, data.value, data.alt)
    }
    showImageDialog.value = false
  } catch (error) {
    console.error('Failed to insert image:', error)
    // Handle error (show toast, etc.)
  }
}

const save = () => {
  const content = editor.value?.getHTML() || ''
  emit('save', content)
  lastSaved.value = new Date()
}

const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// Keyboard shortcuts
onMounted(() => {
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 's':
          e.preventDefault()
          save()
          break
      }
    }
  })
})

// Watch for external content changes
watch(() => props.modelValue, (newValue) => {
  const currentValue = editor.value?.getHTML()
  if (newValue !== currentValue) {
    editor.value?.commands.setContent(newValue, false)
  }
})

// Cleanup
onBeforeUnmount(() => {
  editor.value?.destroy()
})

// Expose methods
defineExpose({
  editor,
  save,
  getHTML: () => editor.value?.getHTML(),
  getJSON: () => editor.value?.getJSON(),
  getText: () => editor.value?.getText(),
  focus: () => editor.value?.commands.focus(),
  blur: () => editor.value?.commands.blur()
})
</script>

<style scoped>
.rich-text-editor {
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  overflow: hidden;
  background-color: hsl(var(--card));
}

.dark .rich-text-editor {
  border-color: hsl(var(--border));
  background-color: hsl(var(--card));
}

.rich-text-editor.is-focused {
  --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);
  box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
  --tw-ring-color: hsl(var(--ring));
  border-color: transparent;
}

.toolbar-btn {
  padding: 0.375rem 0.5rem;
  border-radius: 0.25rem;
  color: hsl(var(--muted-foreground));
  background-color: transparent;
  border: none;
  transition: all 0.15s ease;
}

.dark .toolbar-btn {
  color: hsl(var(--muted-foreground));
}

.toolbar-btn:hover {
  background-color: hsl(var(--muted));
  color: hsl(var(--foreground));
}

.dark .toolbar-btn:hover {
  background-color: hsl(var(--accent));
  color: hsl(var(--accent-foreground));
}

.toolbar-btn.is-active {
  background-color: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.dark .toolbar-btn.is-active {
  background-color: hsl(var(--primary) / 0.2);
  color: hsl(var(--primary));
}

.toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar-group {
  display: flex;
  gap: 0.25rem;
}

.toolbar-separator {
  width: 1px;
  background-color: hsl(var(--border));
  margin: 0 0.25rem;
}

.dark .toolbar-separator {
  background-color: hsl(var(--border));
}

.editor-content-wrapper {
  min-height: 200px;
}

:deep(.ProseMirror) {
  padding: 1rem;
  outline: none;
  min-height: 200px;
}

:deep(.ProseMirror img) {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
}

:deep(.ProseMirror .ProseMirror-selectednode) {
  --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);
  box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
  --tw-ring-color: hsl(var(--ring));
}

:deep(.ProseMirror) {
  height: 100%;
  overflow-y: auto;
  padding: 1rem;
}

:deep(.ProseMirror p.is-editor-empty:first-child::before) {
  color: hsl(var(--muted-foreground));
  pointer-events: none;
  content: attr(data-placeholder);
  white-space: pre-wrap;
  position: absolute;
  opacity: 0.7;
}

.dark :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  color: hsl(var(--muted-foreground));
}

:deep(.ProseMirror h1) {
  font-size: 1.875rem;
  font-weight: 700;
  margin-top: 1.5rem;
  margin-bottom: 1rem;
}

:deep(.ProseMirror h2) {
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 1.25rem;
  margin-bottom: 0.75rem;
}

:deep(.ProseMirror h3) {
  font-size: 1.25rem;
  font-weight: 700;
  margin-top: 1rem;
  margin-bottom: 0.75rem;
}

:deep(.ProseMirror blockquote) {
  border-left: 4px solid hsl(var(--border));
  padding-left: 1rem;
  font-style: italic;
  color: hsl(var(--muted-foreground));
  margin: 1rem 0;
}

.dark :deep(.ProseMirror blockquote) {
  border-left-color: hsl(var(--border));
  color: hsl(var(--muted-foreground));
}

:deep(.ProseMirror pre) {
  background-color: hsl(var(--muted));
  border-radius: 0.5rem;
  padding: 1rem;
  overflow-x: auto;
}

:deep(.ProseMirror code) {
  background-color: hsl(var(--muted));
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

:deep(.ProseMirror ul, .ProseMirror ol) {
  padding-left: 1.5rem;
  margin: 1rem 0;
}

:deep(.ProseMirror li) {
  margin: 0.25rem 0;
}

:deep(.ProseMirror hr) {
  border-color: hsl(var(--border));
  margin: 1.5rem 0;
}

.dark :deep(.ProseMirror hr) {
  border-color: hsl(var(--border));
}
</style>
