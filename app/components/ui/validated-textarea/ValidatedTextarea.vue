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
      <Textarea
        :id="fieldId"
        :value="value"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :rows="rows"
        :class="[errorClass, textareaClass]"
        @input="handleInput"
        @blur="onBlur"
      />
    </template>
  </BaseFormField>
</template>

<script setup lang="ts">
import { Textarea } from '@/components/ui/textarea'
import { BaseFormField } from '@/components/ui/form-field'

interface Props {
  label?: string
  modelValue?: string
  placeholder?: string
  error?: string | null
  required?: boolean
  helpText?: string
  disabled?: boolean
  readonly?: boolean
  rows?: number
  textareaClass?: string
  fieldId?: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'blur'): void
}

const props = withDefaults(defineProps<Props>(), {
  rows: 3
})

const emit = defineEmits<Emits>()

const updateValue = (value: string) => {
  emit('update:modelValue', value)
}

const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  updateValue(target.value)
}

const handleBlur = () => {
  emit('blur')
}
</script>