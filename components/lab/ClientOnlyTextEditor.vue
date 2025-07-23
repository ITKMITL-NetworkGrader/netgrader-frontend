<template>
  <ClientOnly>
    <TextEditor
      v-model="modelValue"
      :title="title"
      :readonly="readonly"
      :selected-play="selectedPlay"
      :show-validation="showValidation"
      @update:title="$emit('update:title', $event)"
    />
    <template #fallback>
      <div class="flex flex-col h-full border rounded-lg overflow-hidden">
        <div class="border-b border-border p-2 flex items-center space-x-2 bg-muted/30">
          <!-- Toolbar placeholder -->
          <div class="h-6 w-full bg-muted/50 animate-pulse rounded"></div>
        </div>
        <div class="border-b border-border p-4">
          <!-- Title placeholder -->
          <div class="h-10 w-full bg-muted/50 animate-pulse rounded"></div>
        </div>
        <div class="flex-1 p-4">
          <!-- Content placeholder -->
          <div class="space-y-2">
            <div class="h-4 w-full bg-muted/50 animate-pulse rounded"></div>
            <div class="h-4 w-3/4 bg-muted/50 animate-pulse rounded"></div>
            <div class="h-4 w-5/6 bg-muted/50 animate-pulse rounded"></div>
          </div>
        </div>
      </div>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import TextEditor from './TextEditor.vue'

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
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  selectedPlay: null,
  showValidation: false
})

const emit = defineEmits<Emits>()

// Forward v-model updates to parent
const modelValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
</script>