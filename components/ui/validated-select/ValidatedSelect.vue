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
    <template #default="{ fieldId, hasError, errorClass, value, updateValue }">
      <Select
        :model-value="value"
        @update:model-value="updateValue"
      >
        <SelectTrigger :id="fieldId" :class="[errorClass, selectClass]">
          <SelectValue :placeholder="placeholder" />
        </SelectTrigger>
        <SelectContent>
          <slot />
        </SelectContent>
      </Select>
    </template>
  </BaseFormField>
</template>

<script setup lang="ts">
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BaseFormField } from '@/components/ui/form-field'

interface Props {
  label?: string
  modelValue?: string
  placeholder?: string
  error?: string | null
  required?: boolean
  helpText?: string
  selectClass?: string
  fieldId?: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'blur'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const updateValue = (value: string) => {
  emit('update:modelValue', value)
}

const handleBlur = () => {
  emit('blur')
}
</script>