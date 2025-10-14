<template>
  <BaseFormField
    :label="label"
    :model-value="modelValue"
    :error="error"
    :required="required"
    :help-text="helpText"
    :field-id="fieldId"
    @update:model-value="updateValue"
    @blur="handleBlur"
  >
    <template #default="{ fieldId, hasError, errorClass, value, updateValue, onBlur }">
      <Input
        :id="fieldId"
        :type="type"
        :value="value"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :min="min"
        :max="max"
        :step="step"
        :class="[errorClass, inputClass]"
        @input="handleInput"
        @blur="onBlur"
      />
    </template>
  </BaseFormField>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Input } from '@/components/ui/input'
import { BaseFormField } from '@/components/ui/form-field'

interface Props {
  label?: string
  modelValue?: string | number
  type?: 'text' | 'email' | 'password' | 'number' | 'url' | 'tel'
  placeholder?: string
  error?: string | null
  required?: boolean
  helpText?: string
  disabled?: boolean
  readonly?: boolean
  min?: number
  max?: number
  step?: number
  inputClass?: string
  fieldId?: string
}

interface Emits {
  (e: 'update:modelValue', value: string | number): void
  (e: 'blur'): void
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text'
})

const emit = defineEmits<Emits>()

const updateValue = (value: string | number) => {
  emit('update:modelValue', value)
}

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  let value: string | number = target.value
  
  if (props.type === 'number') {
    value = target.valueAsNumber || 0
  }
  
  updateValue(value)
}

const handleBlur = () => {
  emit('blur')
}
</script>