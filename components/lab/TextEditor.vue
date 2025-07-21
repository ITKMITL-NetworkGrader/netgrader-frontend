<template>
  <div class="flex-1 flex flex-col h-full">
    <!-- Part Title Input -->
    <div class="border-b border-border p-4">
      <Input
        v-model="partTitle"
        placeholder="Part Title (Required)"
        class="text-lg font-semibold"
        :readonly="readonly"
        @input="updateTitle"
      />
    </div>
    
    <!-- Formatting Toolbar -->
    <div v-if="!readonly" class="border-b border-border p-2">
      <div class="flex items-center space-x-2 flex-wrap gap-2">
        <!-- Text Formatting -->
        <div class="flex items-center space-x-1">
          <Button 
            variant="ghost" 
            size="sm" 
            @click="toggleBold"
            :class="{ 'bg-accent': isBold }"
            title="Bold"
          >
            <Bold class="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            @click="toggleItalic"
            :class="{ 'bg-accent': isItalic }"
            title="Italic"
          >
            <Italic class="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            @click="toggleUnderline"
            :class="{ 'bg-accent': isUnderline }"
            title="Underline"
          >
            <Underline class="w-4 h-4" />
          </Button>
        </div>
        
        <Separator orientation="vertical" class="h-6" />
        
        <!-- Font Size -->
        <div class="flex items-center space-x-2">
          <Label class="text-sm">Size:</Label>
          <Select v-model="fontSize" @update:model-value="updateFontSize">
            <SelectTrigger class="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12">12px</SelectItem>
              <SelectItem value="14">14px</SelectItem>
              <SelectItem value="16">16px</SelectItem>
              <SelectItem value="18">18px</SelectItem>
              <SelectItem value="20">20px</SelectItem>
              <SelectItem value="24">24px</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Separator orientation="vertical" class="h-6" />
        
        <!-- Text Color -->
        <div class="flex items-center space-x-2">
          <Label class="text-sm">Color:</Label>
          <input
            v-model="textColor"
            type="color"
            class="w-8 h-8 rounded border border-border cursor-pointer"
            @change="updateTextColor"
            title="Text Color"
          />
        </div>
        
        <Separator orientation="vertical" class="h-6" />
        
        <!-- List Controls -->
        <div class="flex items-center space-x-1">
          <Button 
            variant="ghost" 
            size="sm" 
            @click="insertUnorderedList"
            title="Bullet List"
          >
            <List class="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            @click="insertOrderedList"
            title="Numbered List"
          >
            <ListOrdered class="w-4 h-4" />
          </Button>
        </div>
        
        <Separator orientation="vertical" class="h-6" />
        
        <!-- Code and Link -->
        <div class="flex items-center space-x-1">
          <Button 
            variant="ghost" 
            size="sm" 
            @click="insertCode"
            title="Code Block"
          >
            <Code class="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            @click="insertLink"
            title="Insert Link"
          >
            <Link class="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
    
    <!-- Content Editor -->
    <div class="flex-1 p-4 overflow-auto">
      <div
        ref="editorRef"
        :contenteditable="!readonly"
        class="min-h-96 prose prose-sm max-w-none focus:outline-none"
        :class="{
          'cursor-text': !readonly,
          'cursor-default': readonly,
          'bg-muted/30': readonly
        }"
        @input="updateContent"
        @keydown="handleKeydown"
        @paste="handlePaste"
        v-html="content"
      />
    </div>
    
    <!-- Play Selection Section -->
    <div v-if="!readonly" class="border-t border-border p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <Button @click="openPlayModal" variant="outline" size="sm">
            <Settings class="w-4 h-4 mr-2" />
            Select Play
          </Button>
          
          <div v-if="selectedPlay" class="flex items-center space-x-2">
            <Badge variant="secondary">{{ selectedPlay.name }}</Badge>
            <span class="text-sm text-muted-foreground">
              {{ selectedPlay.taskCount }} tasks, {{ selectedPlay.totalPoints }} points
            </span>
            <Button 
              @click="clearPlay" 
              variant="ghost" 
              size="sm"
              class="text-destructive hover:text-destructive"
            >
              <X class="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div v-if="!selectedPlay" class="text-sm text-muted-foreground">
          A Play must be selected to save this part
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Code, 
  Link, 
  Settings,
  X
} from 'lucide-vue-next'
import type { Play } from '@/types/lab'

interface Props {
  modelValue: string
  title: string
  readonly?: boolean
  selectedPlay?: Play | null
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'update:title', title: string): void
  (e: 'open-play-modal'): void
  (e: 'clear-play'): void
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  selectedPlay: null
})

const emit = defineEmits<Emits>()

const editorRef = ref<HTMLElement>()
const partTitle = ref(props.title)
const content = ref(props.modelValue)
const fontSize = ref('16')
const textColor = ref('#000000')

// Formatting states
const isBold = ref(false)
const isItalic = ref(false)
const isUnderline = ref(false)

onMounted(() => {
  if (editorRef.value) {
    editorRef.value.innerHTML = props.modelValue
  }
})

const updateTitle = () => {
  emit('update:title', partTitle.value)
}

const updateContent = () => {
  if (editorRef.value) {
    const htmlContent = editorRef.value.innerHTML
    content.value = htmlContent
    emit('update:modelValue', htmlContent)
  }
}

const updateFontSize = (size: string) => {
  document.execCommand('fontSize', false, '7')
  const fontElements = document.querySelectorAll('font[size="7"]')
  fontElements.forEach(element => {
    element.removeAttribute('size')
    ;(element as HTMLElement).style.fontSize = `${size}px`
  })
}

const updateTextColor = () => {
  document.execCommand('foreColor', false, textColor.value)
}

const toggleBold = () => {
  document.execCommand('bold')
  isBold.value = document.queryCommandState('bold')
}

const toggleItalic = () => {
  document.execCommand('italic')
  isItalic.value = document.queryCommandState('italic')
}

const toggleUnderline = () => {
  document.execCommand('underline')
  isUnderline.value = document.queryCommandState('underline')
}

const insertUnorderedList = () => {
  document.execCommand('insertUnorderedList')
}

const insertOrderedList = () => {
  document.execCommand('insertOrderedList')
}

const insertCode = () => {
  const selection = window.getSelection()
  if (selection && selection.toString()) {
    document.execCommand('insertHTML', false, `<code>${selection.toString()}</code>`)
  } else {
    document.execCommand('insertHTML', false, '<code>code here</code>')
  }
}

const insertLink = () => {
  const url = prompt('Enter URL:')
  if (url) {
    const selection = window.getSelection()
    const text = selection?.toString() || url
    document.execCommand('insertHTML', false, `<a href="${url}" target="_blank">${text}</a>`)
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  // Handle common keyboard shortcuts
  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case 'b':
        event.preventDefault()
        toggleBold()
        break
      case 'i':
        event.preventDefault()
        toggleItalic()
        break
      case 'u':
        event.preventDefault()
        toggleUnderline()
        break
    }
  }
  
  // Update content after keydown
  nextTick(() => {
    updateContent()
  })
}

const handlePaste = (event: ClipboardEvent) => {
  event.preventDefault()
  const text = event.clipboardData?.getData('text/plain') || ''
  document.execCommand('insertText', false, text)
}

const openPlayModal = () => {
  emit('open-play-modal')
}

const clearPlay = () => {
  emit('clear-play')
}

// Update formatting states based on cursor position
const updateFormattingStates = () => {
  isBold.value = document.queryCommandState('bold')
  isItalic.value = document.queryCommandState('italic')
  isUnderline.value = document.queryCommandState('underline')
}

// Watch for selection changes to update formatting states
document.addEventListener('selectionchange', updateFormattingStates)
</script>

<style scoped>
.prose {
  color: hsl(var(--foreground));
}

.prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
  color: hsl(var(--foreground));
}

.prose a {
  color: hsl(var(--primary));
}

.prose a:hover {
  color: hsl(var(--primary) / 0.8);
}

.prose code {
  background-color: hsl(var(--muted));
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.prose ul, .prose ol {
  margin-left: 1.5rem;
}

.prose li {
  margin-bottom: 0.25rem;
}
</style>