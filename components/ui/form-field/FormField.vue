<template>
  <div class="space-y-2">
    <Label v-if="label" :for="fieldId" :class="{ 'text-destructive': hasError }">
      {{ label }}
      <span v-if="required" class="text-destructive">*</span>
    </Label>
    
    <div class="relative">
      <slot 
        :field-id="fieldId"
        :has-error="hasError"
        :error-class="errorClass"
        :value="modelValue"
        :update-value="updateValue"
        :on-blur="handleBlur"
      />
      
      <!-- Error Icon -->
      <div v-if="hasError" class="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
        <AlertCircle class="w-4 h-4 text-destructive" />
      </div>
    </div>
    
    <!-- Error Message -->
    <div v-if="hasError" class="flex items-center space-x-1 text-sm text-destructive">
      <span>{{ error }}</span>
    </div>
    
    <!-- Help Text -->
    <div v-if="helpText && !hasError" class="text-sm text-muted-foreground">
      {{ helpText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Label } from '@/components/ui/label'
import { AlertCircle } from 'lucide-vue-next'

interface Props {
  label?: string
  modelValue?: any
  error?: string | null
  required?: boolean
  helpText?: string
  fieldId?: string
}

interface Emits {
  (e: 'update:modelValue', value: any): void
  (e: 'blur'): void
}

const props = withDefaults(defineProps<Props>(), {
  fieldId: () => `field-${Math.random().toString(36).substr(2, 9)}`
})

const emit = defineEmits<Emits>()

const hasError = computed(() => Boolean(props.error))

const errorClass = computed(() => ({
  'border-destructive focus:border-destructive focus:ring-destructive': hasError.value
}))

const updateValue = (value: any) => {
  emit('update:modelValue', value)
}

const handleBlur = () => {
  emit('blur')
}
</script>