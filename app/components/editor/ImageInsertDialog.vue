<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-black/50 backdrop-blur-sm"
      @click="$emit('update:show', false)"
    />

    <!-- Dialog -->
    <div class="relative bg-background border border-border rounded-lg shadow-xl w-full max-w-md mx-4">
      <div class="flex items-center justify-between p-4 border-b border-border">
        <h3 class="text-lg font-semibold text-foreground">
          Insert Image
        </h3>
        <button
          @click="$emit('update:show', false)"
          class="p-1 rounded-md hover:bg-accent hover:text-accent-foreground"
        >
          <Icon name="lucide:x" class="w-5 h-5" />
        </button>
      </div>

      <div class="p-4">
        <!-- Tab Navigation -->
        <div class="flex mb-4 border-b border-border">
          <button
            @click="activeTab = 'url'"
            :class="{
              'border-primary text-primary': activeTab === 'url',
              'border-transparent text-muted-foreground hover:text-foreground': activeTab !== 'url'
            }"
            class="px-4 py-2 border-b-2 font-medium text-sm"
          >
            From URL
          </button>
          <button
            @click="activeTab = 'upload'"
            :class="{
              'border-primary text-primary': activeTab === 'upload',
              'border-transparent text-muted-foreground hover:text-foreground': activeTab !== 'upload'
            }"
            class="px-4 py-2 border-b-2 font-medium text-sm"
          >
            Upload File
          </button>
        </div>

        <!-- URL Tab -->
        <div v-if="activeTab === 'url'" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-foreground mb-2">
              Image URL
            </label>
            <input
              v-model="imageUrl"
              type="url"
              placeholder="https://example.com/image.jpg"
              class="w-full px-3 py-2 border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-ring bg-background text-foreground"
              @keyup.enter="insertFromUrl"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-foreground mb-2">
              Alt Text (Optional)
            </label>
            <input
              v-model="altText"
              type="text"
              placeholder="Description of the image"
              class="w-full px-3 py-2 border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-ring bg-background text-foreground"
              @keyup.enter="insertFromUrl"
            />
          </div>

          <!-- Preview -->
          <div v-if="imageUrl && isValidUrl(imageUrl)" class="mt-4">
            <label class="block text-sm font-medium text-foreground mb-2">
              Preview
            </label>
            <div class="border border-border rounded-lg p-2 bg-muted">
              <img
                :src="imageUrl"
                :alt="altText"
                class="max-w-full max-h-32 object-contain mx-auto rounded"
                @error="imageError = true"
                @load="imageError = false"
              />
              <div v-if="imageError" class="text-center text-destructive text-sm py-8">
                Failed to load image
              </div>
            </div>
          </div>
        </div>

        <!-- Upload Tab -->
        <div v-if="activeTab === 'upload'" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-foreground mb-2">
              Choose File
            </label>

            <!-- File Input -->
            <div
              @drop.prevent="handleFileDrop"
              @dragover.prevent
              @dragenter.prevent
              :class="{ 'border-primary bg-primary/10': isDragOver }"
              class="relative border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-foreground/30 transition-colors"
            >
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                @change="handleFileSelect"
                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                multiple="false"
              />

              <div v-if="!selectedFile">
                <Icon name="lucide:upload-cloud" class="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p class="text-sm text-foreground">
                  <span class="font-medium">Click to upload</span> or drag and drop
                </p>
                <p class="text-xs text-muted-foreground mt-1">
                  PNG, JPG, GIF, WEBP up to 5MB
                </p>
              </div>

              <!-- File Selected -->
              <div v-else class="flex items-center justify-center gap-2 text-sm text-foreground">
                <Icon name="lucide:file-image" class="w-5 h-5" />
                <span>{{ selectedFile.name }}</span>
                <button
                  @click.stop="selectedFile = null"
                  class="text-destructive hover:text-destructive/70"
                >
                  <Icon name="lucide:x" class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-foreground mb-2">
              Alt Text (Optional)
            </label>
            <input
              v-model="altText"
              type="text"
              placeholder="Description of the image"
              class="w-full px-3 py-2 border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-ring bg-background text-foreground"
            />
          </div>

          <!-- File Preview -->
          <div v-if="selectedFile && filePreview" class="mt-4">
            <label class="block text-sm font-medium text-foreground mb-2">
              Preview
            </label>
            <div class="border border-border rounded-lg p-2 bg-muted">
              <img
                :src="filePreview"
                :alt="selectedFile.name"
                class="max-w-full max-h-32 object-contain mx-auto rounded"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end gap-2 p-4 border-t border-border">
        <button
          @click="$emit('update:show', false)"
          class="px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground rounded-md"
        >
          Cancel
        </button>
        <button
          @click="insertImage"
          :disabled="!canInsert"
          class="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Insert Image
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  show: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:show': [show: boolean]
  'insert': [data: { type: 'url' | 'file', value: string | File, alt?: string }]
}>()

// Reactive state
const activeTab = ref<'url' | 'upload'>('url')
const imageUrl = ref('')
const altText = ref('')
const selectedFile = ref<File | null>(null)
const filePreview = ref('')
const imageError = ref(false)
const isDragOver = ref(false)

// File input ref
const fileInput = ref<HTMLInputElement>()

// Computed
const canInsert = computed(() => {
  if (activeTab.value === 'url') {
    return imageUrl.value && isValidUrl(imageUrl.value) && !imageError.value
  } else {
    return selectedFile.value !== null
  }
})

// Methods
const isValidUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url)
    return ['http:', 'https:'].includes(urlObj.protocol)
  } catch {
    return false
  }
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    setSelectedFile(file)
  }
}

const handleFileDrop = (event: DragEvent) => {
  isDragOver.value = false
  const file = event.dataTransfer?.files[0]
  if (file && file.type.startsWith('image/')) {
    setSelectedFile(file)
  }
}

const setSelectedFile = (file: File) => {
  selectedFile.value = file

  // Generate preview
  const reader = new FileReader()
  reader.onload = (e) => {
    filePreview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)

  // Set default alt text
  if (!altText.value) {
    altText.value = file.name.replace(/\.[^/.]+$/, '')
  }
}

const insertFromUrl = () => {
  if (canInsert.value) {
    emit('insert', {
      type: 'url',
      value: imageUrl.value,
      alt: altText.value
    })
    resetForm()
  }
}

const insertImage = () => {
  if (!canInsert.value) return

  if (activeTab.value === 'url') {
    insertFromUrl()
  } else if (selectedFile.value) {
    emit('insert', {
      type: 'file',
      value: selectedFile.value,
      alt: altText.value
    })
    resetForm()
  }
}

const resetForm = () => {
  imageUrl.value = ''
  altText.value = ''
  selectedFile.value = null
  filePreview.value = ''
  imageError.value = false
  activeTab.value = 'url'

  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// Watch for dialog visibility
watch(() => props.show, (visible) => {
  if (visible) {
    nextTick(() => {
      // Focus first input when dialog opens
      const firstInput = document.querySelector('.image-insert-dialog input') as HTMLInputElement
      firstInput?.focus()
    })
  } else {
    resetForm()
  }
})

// Drag and drop handlers
onMounted(() => {
  document.addEventListener('dragenter', (e) => {
    if (props.show && activeTab.value === 'upload') {
      e.preventDefault()
      isDragOver.value = true
    }
  })

  document.addEventListener('dragleave', (e) => {
    if (!e.relatedTarget || !document.contains(e.relatedTarget as Node)) {
      isDragOver.value = false
    }
  })

  document.addEventListener('drop', () => {
    isDragOver.value = false
  })
})
</script>
