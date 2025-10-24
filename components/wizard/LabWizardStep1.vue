<template>
  <div class="space-y-6">
    <!-- Step Header -->
    <div class="border-b pb-4">
      <h2 class="text-xl font-semibold">Basic Lab Information</h2>
      <p class="text-muted-foreground mt-1">
        Provide fundamental details about your lab including name, description, and student instructions.
      </p>
    </div>

    <!-- Course Context Display -->
    <div class="bg-muted/50 p-4 rounded-lg">
      <div class="flex items-center space-x-2">
        <BookOpen class="h-5 w-5 text-muted-foreground" />
        <span class="font-medium">Course Context:</span>
        <span class="text-muted-foreground">{{ courseContext.courseName }}</span>
        <Badge variant="secondary">{{ courseContext.courseCode }}</Badge>
      </div>
    </div>

    <!-- Form Fields -->
    <div class="space-y-6">
      <!-- Lab Name -->
      <div class="space-y-2">
        <Label for="lab-name" class="text-sm font-medium">
          Lab Name <span class="text-destructive">*</span>
        </Label>
        <Input
          id="lab-name"
          v-model="localData.name"
          placeholder="Enter lab name (e.g., 'OSPF Routing Configuration')"
          :class="{
            'border-destructive': hasError('name'),
            'border-green-500': !hasError('name') && localData.name.length > 0
          }"
          maxlength="100"
          @input="validateField('name')"
          @blur="validateField('name')"
        />
        <div class="flex justify-between items-center">
          <p v-if="hasError('name')" class="text-sm text-destructive">
            {{ getError('name') }}
          </p>
          <p class="text-xs text-muted-foreground ml-auto">
            {{ localData.name.length }}/100 characters
          </p>
        </div>
      </div>

      <!-- Description (Optional) -->
      <div class="space-y-2">
        <Label for="lab-description" class="text-sm font-medium">
          Description <span class="text-muted-foreground">(Optional)</span>
        </Label>
        <Textarea
          id="lab-description"
          v-model="localData.description"
          placeholder="Brief description of what students will learn in this lab..."
          :class="{
            'border-destructive': hasError('description'),
            'border-green-500': !hasError('description') && localData.description.length > 0
          }"
          rows="3"
          maxlength="2000"
          @input="validateField('description')"
          @blur="validateField('description')"
        />
        <div class="flex justify-between items-center">
          <p v-if="hasError('description')" class="text-sm text-destructive">
            {{ getError('description') }}
          </p>
          <p class="text-xs text-muted-foreground ml-auto">
            {{ localData.description.length }}/2000 characters
          </p>
        </div>
      </div>

      <!-- Student Instructions -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <Label class="text-sm font-medium">
            Student Instructions <span class="text-destructive">*</span>
          </Label>
          <Button
            variant="outline"
            size="sm"
            class="flex items-center gap-2"
            @click="openInstructionsEditor"
          >
            <BookOpen class="w-4 h-4" />
            Edit Instructions
          </Button>
        </div>

        <div class="rounded-md border border-dashed border-border/60 bg-muted/20 p-4">
          <div
            class="min-h-[160px] prose prose-sm max-w-none text-foreground"
            v-html="renderedInstructions"
          ></div>
        </div>

        <div class="flex items-center justify-between text-xs text-muted-foreground">
          <div class="flex items-center gap-2">
            <Info class="w-3 h-3" />
            <span>Use the rich text editor to craft announcements, rules, or lab guidelines.</span>
          </div>
          <div>
            {{ localData.instructions.html.length }} characters
          </div>
        </div>

        <p v-if="hasError('instructions')" class="text-sm text-destructive">
          {{ getError('instructions') }}
        </p>
      </div>
    </div>

    <!-- Validation Summary -->
    <div v-if="validation && validation.errors.length > 0" class="mt-6">
      <Alert variant="destructive">
        <AlertCircle class="h-4 w-4" />
        <AlertTitle>Please fix the following issues:</AlertTitle>
        <AlertDescription>
          <ul class="list-disc list-inside space-y-1 mt-2">
            <li v-for="error in validation.errors" :key="error">{{ error }}</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  </div>

  <ClientOnly>
    <FullScreenEditor
      v-model="showInstructionsEditor"
      :content="localData.instructions.html"
      title="Student Instructions"
      :subtitle="courseContext.courseName"
      :auto-save-enabled="false"
      placeholder="Add the information students must read before starting the lab..."
      @save="handleInstructionsSave"
      @close="handleInstructionsClose"
    />
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, watch, ref, onMounted, nextTick } from 'vue'
import DOMPurify from 'dompurify'
import {
  BookOpen,
  Info,
  AlertCircle
} from 'lucide-vue-next'

// UI Components
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import FullScreenEditor from '@/components/editor/FullScreenEditor.vue'

// Types
import type { CourseContext, ValidationResult, RichTextContent } from '@/types/wizard'

// Props
interface Props {
  modelValue: {
    name: string
    description: string
    instructions: RichTextContent
  }
  courseContext: CourseContext
  validation?: ValidationResult
}

// Emits
interface Emits {
  (e: 'update:modelValue', value: Props['modelValue']): void
  (e: 'validate', result: ValidationResult): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Local state
const cloneInstructions = (content?: RichTextContent): RichTextContent => ({
  html: content?.html || '',
  json: content?.json ? JSON.parse(JSON.stringify(content.json)) : { type: 'doc', content: [] }
})

const localData = ref({
  name: props.modelValue.name,
  description: props.modelValue.description,
  instructions: cloneInstructions(props.modelValue.instructions)
})
const showInstructionsEditor = ref(false)
const fieldErrors = ref<Record<string, string>>({})
const isUpdatingFromProps = ref(false)

// Computed
const renderedInstructions = computed(() => {
  const html = localData.value.instructions?.html?.trim()
  if (!html) {
    return '<p class="text-muted-foreground">No instructions provided</p>'
  }
  return DOMPurify.sanitize(html)
})

// Methods
const hasError = (field: string): boolean => {
  return !!fieldErrors.value[field]
}

const getError = (field: string): string => {
  return fieldErrors.value[field] || ''
}

const validateField = (field: string) => {
  switch (field) {
    case 'name':
      if (!localData.value.name.trim()) {
        fieldErrors.value.name = 'Lab name is required'
      } else if (localData.value.name.length > 100) {
        fieldErrors.value.name = 'Lab name must be 100 characters or less'
      } else {
        delete fieldErrors.value.name
      }
      break

    case 'description':
      if (localData.value.description.length > 2000) {
        fieldErrors.value.description = 'Description must be 2000 characters or less'
      } else {
        delete fieldErrors.value.description
      }
      break

    case 'instructions':
      if (!localData.value.instructions.html.trim()) {
        fieldErrors.value.instructions = 'Student instructions are required'
      } else {
        delete fieldErrors.value.instructions
      }
      break
  }
  
  // Trigger step validation after field validation
  nextTick(() => {
    emitValidation()
  })
}

const validateAllFields = () => {
  // Validate all fields without calling validateField to avoid recursion
  if (!localData.value.name.trim()) {
    fieldErrors.value.name = 'Lab name is required'
  } else if (localData.value.name.length > 100) {
    fieldErrors.value.name = 'Lab name must be 100 characters or less'
  } else {
    delete fieldErrors.value.name
  }

  if (localData.value.description.length > 2000) {
    fieldErrors.value.description = 'Description must be 2000 characters or less'
  } else {
    delete fieldErrors.value.description
  }

  if (!localData.value.instructions.html.trim()) {
    fieldErrors.value.instructions = 'Student instructions are required'
  } else {
    delete fieldErrors.value.instructions
  }
}

const emitValidation = () => {
  const errors = Object.values(fieldErrors.value).filter(Boolean)
  const isValid = errors.length === 0

  const validationResult: ValidationResult = {
    isValid,
    errors
  }

  emit('validate', validationResult)
}

const validateStep = () => {
  validateAllFields()
  // Only emit validation if not updating from props to prevent loops
  if (!isUpdatingFromProps.value) {
    emitValidation()
  }
}

const openInstructionsEditor = () => {
  showInstructionsEditor.value = true
}

const handleInstructionsSave = (payload: { html: string; json: any }) => {
  localData.value.instructions = cloneInstructions(payload)
  showInstructionsEditor.value = false
  validateField('instructions')
}

const handleInstructionsClose = (payload: { html: string; json: any }) => {
  localData.value.instructions = cloneInstructions(payload)
  showInstructionsEditor.value = false
  validateField('instructions')
}

// Watchers
watch(
  localData,
  (newValue) => {
    if (!isUpdatingFromProps.value) {
      emit('update:modelValue', {
        name: newValue.name,
        description: newValue.description,
        instructions: cloneInstructions(newValue.instructions)
      })
      // Use nextTick to avoid recursive validation loops
      nextTick(() => {
        emitValidation()
      })
    }
  },
  { deep: true }
)

watch(
  () => props.modelValue,
  (newValue) => {
    isUpdatingFromProps.value = true
    localData.value = {
      name: newValue.name,
      description: newValue.description,
      instructions: cloneInstructions(newValue.instructions)
    }
    nextTick(() => {
      isUpdatingFromProps.value = false
      // Trigger validation after props update
      validateStep()
    })
  },
  { deep: true }
)

// Lifecycle
onMounted(() => {
  validateStep()
})
</script>

<style scoped>
/* Markdown preview styles */
:deep(.prose) {
  color: hsl(var(--foreground));
}

:deep(.prose h1) {
  color: hsl(var(--foreground));
  font-size: 1.5rem;
  font-weight: 600;
  margin-top: 0;
  margin-bottom: 1rem;
}

:deep(.prose h2) {
  color: hsl(var(--foreground));
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

:deep(.prose h3) {
  color: hsl(var(--foreground));
  font-size: 1.125rem;
  font-weight: 600;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
}

:deep(.prose p) {
  margin-bottom: 1rem;
  line-height: 1.6;
}

:deep(.prose ul) {
  margin-bottom: 1rem;
  padding-left: 1.5rem;
}

:deep(.prose li) {
  margin-bottom: 0.25rem;
}

:deep(.prose code) {
  background-color: hsl(var(--muted));
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

:deep(.prose pre) {
  background-color: hsl(var(--muted));
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin: 1rem 0;
}

:deep(.prose blockquote) {
  border-left: 4px solid hsl(var(--border));
  padding-left: 1rem;
  margin: 1rem 0;
  font-style: italic;
  color: hsl(var(--muted-foreground));
}
</style>
