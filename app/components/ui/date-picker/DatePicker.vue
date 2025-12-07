<template>
  <Popover v-model:open="isOpen">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        :class="cn(
          'w-full justify-start text-left font-normal',
          !modelValue && 'text-muted-foreground',
          props.class
        )"
      >
        <CalendarIcon class="mr-2 h-4 w-4" />
        <span v-if="modelValue">{{ formatDate(modelValue) }}</span>
        <span v-else>{{ placeholder }}</span>
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0" align="start">
      <Calendar
        v-model="calendarValue"
        initial-focus
        @update:model-value="handleDateSelect"
      />
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Calendar as CalendarIcon } from 'lucide-vue-next'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { CalendarDate, type DateValue } from '@internationalized/date'

interface Props {
  modelValue?: Date
  placeholder?: string
  class?: string
}

interface Emits {
  (e: 'update:modelValue', value: Date | undefined): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Pick a date'
})

const emit = defineEmits<Emits>()

const isOpen = ref(false)
const calendarValue = ref<DateValue>()

// Convert JavaScript Date to CalendarDate
const dateToCalendarDate = (date: Date | undefined): DateValue | undefined => {
  if (!date) return undefined
  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

// Convert CalendarDate to JavaScript Date
const calendarDateToDate = (calendarDate: DateValue | undefined): Date | undefined => {
  if (!calendarDate) return undefined
  return new Date(calendarDate.year, calendarDate.month - 1, calendarDate.day)
}

// Initialize calendar value from modelValue
watch(() => props.modelValue, (newValue) => {
  calendarValue.value = dateToCalendarDate(newValue)
}, { immediate: true })

// Handle date selection
const handleDateSelect = (value: DateValue | undefined) => {
  const jsDate = calendarDateToDate(value)
  emit('update:modelValue', jsDate)
  isOpen.value = false
}

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>
