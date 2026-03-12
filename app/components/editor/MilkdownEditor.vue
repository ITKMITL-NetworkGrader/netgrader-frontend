<template>
  <div class="milkdown-wrapper" :class="editorClass">
    <!-- Toolbar is built-in via Crepe.Feature.Toolbar -->
    <Milkdown />
  </div>
</template>

<script setup lang="ts">
import { Crepe } from '@milkdown/crepe'
import { Milkdown, useEditor } from '@milkdown/vue'
import { editorViewCtx } from '@milkdown/kit/core'
import { DOMSerializer } from '@milkdown/kit/prose/model'
import { replaceAll } from '@milkdown/kit/utils'

// Import Crepe theme CSS
import '@milkdown/crepe/theme/common/prosemirror.css'
import '@milkdown/crepe/theme/common/reset.css'
import '@milkdown/crepe/theme/common/toolbar.css'
import '@milkdown/crepe/theme/common/block-edit.css'
import '@milkdown/crepe/theme/common/link-tooltip.css'
import '@milkdown/crepe/theme/common/image-block.css'
import '@milkdown/crepe/theme/common/code-mirror.css'
import '@milkdown/crepe/theme/common/list-item.css'
import '@milkdown/crepe/theme/common/placeholder.css'
import '@milkdown/crepe/theme/common/cursor.css'
import '@milkdown/crepe/theme/common/table.css'
import '@milkdown/crepe/theme/classic.css'

interface Props {
  defaultValue?: string
  placeholder?: string
  editable?: boolean
  showToolbar?: boolean
  editorClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  defaultValue: '',
  placeholder: 'Start typing...',
  editable: true,
  showToolbar: true,
  editorClass: '',
})

const emit = defineEmits<{
  update: [markdown: string]
  focus: []
  blur: []
  ready: []
}>()

let crepeInstance: Crepe | null = null

const { get } = useEditor((root) => {
  const crepe = new Crepe({
    root,
    defaultValue: props.defaultValue,
    features: {
      [Crepe.Feature.Toolbar]: props.showToolbar,
      [Crepe.Feature.BlockEdit]: true,
      [Crepe.Feature.LinkTooltip]: true,
      [Crepe.Feature.ImageBlock]: true,
      [Crepe.Feature.CodeMirror]: true,
      [Crepe.Feature.ListItem]: true,
      [Crepe.Feature.Placeholder]: true,
      [Crepe.Feature.Cursor]: true,
      [Crepe.Feature.Table]: true,
      [Crepe.Feature.Latex]: false,
    },
    featureConfigs: {
      [Crepe.Feature.Placeholder]: {
        text: props.placeholder,
        mode: 'doc',
      },
      [Crepe.Feature.ImageBlock]: {
        onUpload: handleImageUpload,
      },
    },
  })

  // Register event listeners
  crepe.on((listener: any) => {
    listener.markdownUpdated((_ctx: any, markdown: string, prevMarkdown: string) => {
      if (markdown !== prevMarkdown) {
        emit('update', markdown)
      }
    })

    listener.focus(() => {
      emit('focus')
    })

    listener.blur(() => {
      emit('blur')
    })
  })

  crepeInstance = crepe

  // Set readonly if needed
  if (!props.editable) {
    nextTick(() => crepe.setReadonly(true))
  }

  // Notify parent that editor is ready
  nextTick(() => emit('ready'))

  return crepe
})

// Image upload handler using the backend storage endpoint
// Returns markdown image syntax with object path for persistence
async function handleImageUpload(file: File): Promise<string> {
  try {
    const config = useRuntimeConfig()
    const backendUrl = config.public.backendurl || 'http://localhost:3001'

    const formData = new FormData()
    formData.append('file', file)

    const response = await $fetch<{
      success: boolean;
      data: { url: string; path: string };
    }>(`${backendUrl}/v0/storage/editor-image`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (response.success && response.data?.path) {
      // Return markdown image syntax with object path for persistent storage
      // The path will be replaced with presigned URL when rendering
      const filename = file.name || 'image'
      return `![${filename}](${response.data.path})`
    }

    throw new Error('Upload failed')
  } catch (error) {
    console.error('Image upload failed:', error)
    // Fallback: create object URL for local preview (temporary)
    return `![image](${URL.createObjectURL(file)})`
  }
}

// Expose methods for parent
const focus = () => {
  try {
    const editor = get()
    if (!editor) return
    const ctx = (editor as any).ctx
    ctx?.get(editorViewCtx)?.focus()
  } catch {
    // Silently fail
  }
}

const blur = () => {
  const el = document.querySelector('.milkdown-wrapper .ProseMirror') as HTMLElement
  el?.blur()
}

const getHTML = (): string => {
  try {
    const editor = get()
    if (!editor) return ''
    const ctx = (editor as any).ctx
    if (!ctx) return ''
    const view = ctx.get(editorViewCtx)
    if (!view) return ''
    const fragment = DOMSerializer.fromSchema(view.state.schema)
      .serializeFragment(view.state.doc.content)
    const div = document.createElement('div')
    div.appendChild(fragment)
    return div.innerHTML
  } catch {
    return ''
  }
}

const setContent = (markdown: string) => {
  try {
    const editor = get()
    if (editor) {
      ;(editor as any).action?.(replaceAll(markdown))
    }
  } catch {
    // Silently fail
  }
}

defineExpose({
  focus,
  blur,
  getHTML,
  setContent,
})

// Watch editable prop
watch(() => props.editable, (val) => {
  if (crepeInstance) {
    crepeInstance.setReadonly(!val)
  }
})

onBeforeUnmount(() => {
  crepeInstance = null
})
</script>

<style>
/* Map Crepe CSS variables to site design tokens */
.milkdown-wrapper .crepe .milkdown,
.milkdown-wrapper .milkdown {
  --crepe-color-primary: var(--primary);
  --crepe-color-primary-light: var(--accent);
  --crepe-color-background: var(--card);
  --crepe-color-on-background: var(--foreground);
  --crepe-color-surface: var(--muted);
  --crepe-color-surface-low: var(--background);
  --crepe-color-outline: var(--border);
  --crepe-color-on-surface: var(--muted-foreground);
  --crepe-font-default: var(--font-sans);
  --crepe-font-code: var(--font-mono);
  --crepe-shadow-1: none;
  --crepe-shadow-2: none;
}

/* Dark mode overrides */
.dark .milkdown-wrapper .crepe .milkdown,
.dark .milkdown-wrapper .milkdown {
  --crepe-color-primary: var(--primary);
  --crepe-color-primary-light: var(--accent);
  --crepe-color-background: var(--card);
  --crepe-color-on-background: var(--foreground);
  --crepe-color-surface: var(--muted);
  --crepe-color-surface-low: var(--background);
  --crepe-color-outline: var(--border);
  --crepe-color-on-surface: var(--muted-foreground);
}

/* Editor content area */
.milkdown-wrapper .ProseMirror {
  padding: 1rem;
  outline: none;
  min-height: 200px;
}

.milkdown-wrapper .ProseMirror img {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
}

/* Headings */
.milkdown-wrapper .ProseMirror h1 {
  font-size: 1.875rem;
  font-weight: 700;
  margin-top: 1.5rem;
  margin-bottom: 1rem;
}

.milkdown-wrapper .ProseMirror h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 1.25rem;
  margin-bottom: 0.75rem;
}

.milkdown-wrapper .ProseMirror h3 {
  font-size: 1.25rem;
  font-weight: 700;
  margin-top: 1rem;
  margin-bottom: 0.75rem;
}

/* Blockquotes */
.milkdown-wrapper .ProseMirror blockquote {
  border-left: 4px solid var(--border);
  padding-left: 1rem;
  font-style: italic;
  color: var(--muted-foreground);
  margin: 1rem 0;
}

/* Code */
.milkdown-wrapper .ProseMirror pre {
  background-color: var(--muted);
  border-radius: 0.5rem;
  padding: 1rem;
  overflow-x: auto;
}

.milkdown-wrapper .ProseMirror code {
  background-color: var(--muted);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

/* Lists */
.milkdown-wrapper .ProseMirror ul {
  padding-left: 1.5rem;
  list-style-type: disc;
  margin: 1rem 0;
}

.milkdown-wrapper .ProseMirror ol {
  padding-left: 1.75rem;
  list-style-type: decimal;
  margin: 1rem 0;
}

.milkdown-wrapper .ProseMirror li {
  margin: 0.25rem 0;
}

/* Horizontal rule */
.milkdown-wrapper .ProseMirror hr {
  border-color: var(--border);
  margin: 1.5rem 0;
}
</style>
