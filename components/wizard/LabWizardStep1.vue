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
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <Label for="lab-instructions" class="text-sm font-medium">
            Student Instructions <span class="text-destructive">*</span>
          </Label>
          <div class="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              @click="togglePreviewMode"
              :class="{ 'bg-muted': isPreviewMode }"
            >
              <Eye v-if="!isPreviewMode" class="w-4 h-4 mr-1" />
              <Edit3 v-else class="w-4 h-4 mr-1" />
              {{ isPreviewMode ? 'Edit' : 'Preview' }}
            </Button>
          </div>
        </div>

        <!-- Markdown Editor -->
        <div v-if="!isPreviewMode" class="space-y-2">
          <Textarea
            id="lab-instructions"
            v-model="localData.instructions"
            placeholder="# Lab Objectives&#10;&#10;Students will:&#10;- Configure network devices&#10;- Test connectivity&#10;- Verify configurations&#10;&#10;## Prerequisites&#10;&#10;Basic networking knowledge required..."
            :class="{
              'border-destructive': hasError('instructions'),
              'border-green-500': !hasError('instructions') && localData.instructions.length > 0
            }"
            rows="12"
            class="font-mono text-sm"
            @input="validateField('instructions')"
            @blur="validateField('instructions')"
          />
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2 text-xs text-muted-foreground">
              <Info class="w-3 h-3" />
              <span>Supports Markdown formatting</span>
            </div>
            <p class="text-xs text-muted-foreground">
              {{ localData.instructions.length }} characters
            </p>
          </div>
        </div>

        <!-- Markdown Preview -->
        <div v-else class="space-y-2">
          <div
            class="min-h-[200px] p-4 border rounded-md bg-background prose prose-sm max-w-none"
            v-html="renderedMarkdown"
          ></div>
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2 text-xs text-muted-foreground">
              <Eye class="w-3 h-3" />
              <span>Preview of student instructions</span>
            </div>
            <Button variant="ghost" size="sm" @click="togglePreviewMode">
              <Edit3 class="w-4 h-4 mr-1" />
              Continue Editing
            </Button>
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
</template>

<script setup lang="ts">
import { computed, watch, ref, onMounted, nextTick } from 'vue'
import { marked } from 'marked'
import {
  BookOpen,
  Eye,
  Edit3,
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

// Types
import type { CourseContext, ValidationResult } from '@/types/wizard'

// Props
interface Props {
  modelValue: {
    name: string
    description: string
    instructions: string
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
const localData = ref({ ...props.modelValue })
const isPreviewMode = ref(false)
const fieldErrors = ref<Record<string, string>>({})
const isUpdatingFromProps = ref(false)

// Computed
const renderedMarkdown = computed(() => {
  if (!localData.value.instructions) return '<p class="text-muted-foreground">No instructions provided</p>'
  
  try {
    return marked(localData.value.instructions, {
      breaks: true,
      gfm: true
    })
  } catch (error) {
    return `<p class="text-destructive">Error rendering markdown: ${error}</p>`
  }
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
      if (!localData.value.instructions.trim()) {
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

  if (!localData.value.instructions.trim()) {
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
  emitValidation()
}

const togglePreviewMode = () => {
  isPreviewMode.value = !isPreviewMode.value
}

// Watchers
watch(
  localData,
  (newValue) => {
    if (!isUpdatingFromProps.value) {
      emit('update:modelValue', newValue)
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
    localData.value = { ...newValue }
    nextTick(() => {
      isUpdatingFromProps.value = false
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