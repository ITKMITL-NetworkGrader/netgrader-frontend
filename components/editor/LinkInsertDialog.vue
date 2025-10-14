<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-black/50 backdrop-blur-sm"
      @click="$emit('update:show', false)"
    />

    <!-- Dialog -->
    <div class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
      <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {{ currentUrl ? 'Edit Link' : 'Insert Link' }}
        </h3>
        <button
          @click="$emit('update:show', false)"
          class="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Icon name="lucide:x" class="w-5 h-5" />
        </button>
      </div>

      <div class="p-4 space-y-4">
        <!-- URL Input -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            URL <span class="text-red-500">*</span>
          </label>
          <input
            ref="urlInput"
            v-model="linkUrl"
            type="url"
            placeholder="https://example.com"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            @keyup.enter="insertLink"
            required
          />
          <div v-if="urlError" class="mt-1 text-sm text-red-600 dark:text-red-400">
            {{ urlError }}
          </div>
        </div>

        <!-- Link Text Input -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Link Text (Optional)
          </label>
          <input
            v-model="linkText"
            type="text"
            placeholder="Display text for the link"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            @keyup.enter="insertLink"
          />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            If empty, the URL will be used as the link text
          </p>
        </div>

        <!-- Link Options -->
        <div class="space-y-2">
          <label class="flex items-center">
            <input
              v-model="openInNewTab"
              type="checkbox"
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">
              Open in new tab
            </span>
          </label>
        </div>

        <!-- URL Preview -->
        <div v-if="linkUrl && isValidUrl(linkUrl)" class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div class="flex items-start gap-2">
            <Icon name="lucide:external-link" class="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
            <div class="min-w-0 flex-1">
              <div class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {{ linkText || linkUrl }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
                {{ linkUrl }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
        <div>
          <button
            v-if="currentUrl"
            @click="removeLink"
            class="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-md"
          >
            Remove Link
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="$emit('update:show', false)"
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
          >
            Cancel
          </button>
          <button
            @click="insertLink"
            :disabled="!canInsert"
            class="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ currentUrl ? 'Update Link' : 'Insert Link' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  show: boolean
  currentUrl?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:show': [show: boolean]
  'insert': [url: string, text?: string, openInNewTab?: boolean]
  'remove': []
}>()

// Reactive state
const linkUrl = ref('')
const linkText = ref('')
const openInNewTab = ref(true)
const urlError = ref('')

// Refs
const urlInput = ref<HTMLInputElement>()

// Computed
const canInsert = computed(() => {
  return linkUrl.value && isValidUrl(linkUrl.value)
})

// Methods
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

const validateUrl = () => {
  urlError.value = ''

  if (!linkUrl.value) {
    urlError.value = 'URL is required'
    return false
  }

  if (!isValidUrl(linkUrl.value)) {
    urlError.value = 'Please enter a valid URL'
    return false
  }

  return true
}

const insertLink = () => {
  if (!validateUrl()) return

  emit('insert', linkUrl.value, linkText.value || undefined, openInNewTab.value)
  resetForm()
}

const removeLink = () => {
  emit('remove')
  resetForm()
}

const resetForm = () => {
  linkUrl.value = ''
  linkText.value = ''
  openInNewTab.value = true
  urlError.value = ''
}

// Watchers
watch(() => props.show, (visible) => {
  if (visible) {
    // Pre-populate if editing existing link
    if (props.currentUrl) {
      linkUrl.value = props.currentUrl
    }

    nextTick(() => {
      urlInput.value?.focus()
    })
  } else {
    if (!props.currentUrl) {
      resetForm()
    }
  }
})

watch(() => props.currentUrl, (url) => {
  if (url) {
    linkUrl.value = url
  }
})

// Real-time validation
watch(linkUrl, () => {
  if (urlError.value) {
    validateUrl()
  }
})

// Auto-format URL
const formatUrl = () => {
  if (linkUrl.value && !linkUrl.value.startsWith('http://') && !linkUrl.value.startsWith('https://')) {
    linkUrl.value = 'https://' + linkUrl.value
  }
}

onMounted(() => {
  // Auto-format URL when input loses focus
  const input = urlInput.value
  if (input) {
    input.addEventListener('blur', formatUrl)
  }
})
</script>