<template>
  <div :class="cn('flex items-center gap-2', props.class)">
    <Select v-model="hours">
      <SelectTrigger class="w-[80px]">
        <SelectValue :placeholder="hours" />
      </SelectTrigger>
      <SelectContent position="popper" side="bottom" :side-offset="4" class="max-h-[200px]">
        <SelectGroup>
          <SelectItem
            v-for="hour in 24"
            :key="hour - 1"
            :value="String(hour - 1).padStart(2, '0')"
          >
            {{ String(hour - 1).padStart(2, '0') }}
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>

    <span class="text-muted-foreground">:</span>

    <Select v-model="minutes">
      <SelectTrigger class="w-[80px]">
        <SelectValue :placeholder="minutes" />
      </SelectTrigger>
      <SelectContent position="popper" side="bottom" :side-offset="4" class="max-h-[200px]">
        <SelectGroup>
          <SelectItem
            v-for="minute in 60"
            :key="minute - 1"
            :value="String(minute - 1).padStart(2, '0')"
          >
            {{ String(minute - 1).padStart(2, '0') }}
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface Props {
  modelValue?: string // Format: "HH:mm" (24-hour format)
  class?: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '09:00'
})

const emit = defineEmits<Emits>()

const hours = ref('09')
const minutes = ref('00')

// Initialize from modelValue
const initializeFromModel = () => {
  if (props.modelValue) {
    const [h, m] = props.modelValue.split(':')
    hours.value = h
    minutes.value = m
  }
}

// Update modelValue when time changes
const updateModelValue = () => {
  const timeString = `${hours.value}:${minutes.value}`
  emit('update:modelValue', timeString)
}

// Watch for changes
watch([hours, minutes], () => {
  updateModelValue()
})

watch(() => props.modelValue, () => {
  initializeFromModel()
})

// Initialize on mount
onMounted(() => {
  initializeFromModel()
})
</script>
