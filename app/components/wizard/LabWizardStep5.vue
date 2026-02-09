<template>
  <div class="space-y-6">
    <!-- Step Header -->
    <div class="border-b pb-4">
      <h2 class="text-xl font-semibold">Schedule & Publishing</h2>
      <p class="text-muted-foreground mt-1">
        Configure when the lab will be available to students and set deadlines.
      </p>
    </div>

    <!-- Schedule Configuration -->
    <div class="space-y-6">
      <!-- Available From -->
      <div class="space-y-2">
        <Label class="text-sm font-medium flex items-center">
          <Calendar class="w-4 h-4 mr-2" />
          Available From
          <span class="text-muted-foreground font-normal ml-1">(Optional)</span>
        </Label>
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-2">
            <Checkbox
              id="enable-available-from"
              :model-value="enableAvailableFrom"
              @update:model-value="toggleAvailableFrom"
            />
            <Label for="enable-available-from" class="text-sm cursor-pointer">
              Set availability start date
            </Label>
          </div>
        </div>

        <div v-if="enableAvailableFrom" class="space-y-3">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Date -->
            <div class="space-y-2">
              <Label class="text-xs font-medium">Date</Label>
              <DatePicker
                v-model="availableFromDateObj"
                placeholder="Pick availability start date"
              />
            </div>

            <!-- Time -->
            <div class="space-y-2">
              <Label class="text-xs font-medium">Time</Label>
              <TimePicker
                v-model="availableFromTime"
                @update:model-value="updateAvailableFrom"
              />
            </div>
          </div>

          <div class="flex items-center space-x-2 text-sm text-muted-foreground">
            <Info class="w-4 h-4" />
            <span>Students will be able to access the lab starting from this date and time</span>
          </div>
        </div>
      </div>

      <!-- Due Date -->
      <div class="space-y-2">
        <Label class="text-sm font-medium flex items-center">
          <Clock class="w-4 h-4 mr-2" />
          Due Date
          <span class="text-muted-foreground font-normal ml-1">(Optional)</span>
        </Label>
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-2">
            <Checkbox
              id="enable-due-date"
              :model-value="enableDueDate"
              @update:model-value="toggleDueDate"
            />
            <Label for="enable-due-date" class="text-sm cursor-pointer">
              Set submission deadline
            </Label>
          </div>
        </div>
        
        <div v-if="enableDueDate" class="space-y-3">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Date -->
            <div class="space-y-2">
              <Label class="text-xs font-medium">Date</Label>
              <DatePicker
                v-model="dueDateDateObj"
                placeholder="Pick due date"
                :class="{
                  'border-destructive': hasError('dueDate'),
                  'border-green-500': !hasError('dueDate') && dueDateDateObj
                }"
              />
              <p v-if="hasError('dueDate')" class="text-xs text-destructive">
                {{ getError('dueDate') }}
              </p>
            </div>

            <!-- Time -->
            <div class="space-y-2">
              <Label class="text-xs font-medium">Time</Label>
              <TimePicker
                v-model="dueDateTime"
                @update:model-value="updateDueDate"
              />
            </div>
          </div>

          <div class="flex items-center space-x-2 text-sm text-muted-foreground">
            <Info class="w-4 h-4" />
            <span>Student submissions will be due by this date and time</span>
          </div>

          <!-- Late Penalty Configuration -->
          <div class="mt-4 p-4 bg-muted/30 rounded-lg space-y-3">
            <Label class="text-sm font-medium flex items-center">
              <AlertTriangle class="w-4 h-4 mr-2 text-amber-500" />
              Late Submission Penalty
            </Label>
            <div class="flex items-center gap-4">
              <Slider
                v-model="latePenaltySliderValue"
                :min="0"
                :max="100"
                :step="5"
                class="flex-1"
                @update:model-value="onLatePenaltySliderChange"
              />
              <div class="flex items-center gap-1">
                <Input
                  v-model.number="latePenaltyPercent"
                  type="number"
                  :min="0"
                  :max="100"
                  class="w-16 text-center"
                  @input="onLatePenaltyInputChange"
                />
                <span class="text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <p class="text-sm text-muted-foreground">
              Students submitting after the due date will receive 
              <span class="font-medium text-foreground">{{ 100 - latePenaltyPercent }}%</span> 
              of their earned score
            </p>
          </div>
        </div>
      </div>

      <!-- Available Until -->
      <div class="space-y-2">
        <Label class="text-sm font-medium flex items-center">
          <CalendarX class="w-4 h-4 mr-2" />
          Available Until
          <span class="text-muted-foreground font-normal ml-1">(Optional)</span>
        </Label>
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-2">
            <Checkbox
              id="enable-available-until"
              :model-value="enableAvailableUntil"
              @update:model-value="toggleAvailableUntil"
            />
            <Label for="enable-available-until" class="text-sm cursor-pointer">
              Set availability end date
            </Label>
          </div>
        </div>
        
        <div v-if="enableAvailableUntil" class="space-y-3">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Date -->
            <div class="space-y-2">
              <Label class="text-xs font-medium">Date</Label>
              <DatePicker
                v-model="availableUntilDateObj"
                placeholder="Pick availability end date"
                :class="{
                  'border-destructive': hasError('availableUntil'),
                  'border-green-500': !hasError('availableUntil') && availableUntilDateObj
                }"
              />
              <p v-if="hasError('availableUntil')" class="text-xs text-destructive">
                {{ getError('availableUntil') }}
              </p>
            </div>

            <!-- Time -->
            <div class="space-y-2">
              <Label class="text-xs font-medium">Time</Label>
              <TimePicker
                v-model="availableUntilTime"
                @update:model-value="updateAvailableUntil"
              />
            </div>
          </div>

          <div class="flex items-center space-x-2 text-sm text-muted-foreground">
            <Info class="w-4 h-4" />
            <span>Lab will become unavailable after this date and time</span>
          </div>
        </div>
      </div>

      <!-- Schedule Summary Card -->
      <Card class="bg-muted/30">
        <CardHeader>
          <CardTitle class="text-lg flex items-center">
            <CalendarCheck class="w-5 h-5 mr-2" />
            Schedule Summary
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Available From -->
            <div class="space-y-2">
              <div class="text-sm font-medium text-muted-foreground">Available From</div>
              <div class="p-3 bg-background rounded-md border">
                <div class="text-sm">
                  {{ enableAvailableFrom && localData.availableFrom 
                    ? formatDateTime(localData.availableFrom) 
                    : 'Immediately' }}
                </div>
              </div>
            </div>

            <!-- Due Date -->
            <div class="space-y-2">
              <div class="text-sm font-medium text-muted-foreground">Due Date</div>
              <div class="p-3 bg-background rounded-md border">
                <div class="text-sm">
                  {{ enableDueDate && localData.dueDate 
                    ? formatDateTime(localData.dueDate) 
                    : 'No deadline' }}
                </div>
              </div>
            </div>

            <!-- Available Until -->
            <div class="space-y-2">
              <div class="text-sm font-medium text-muted-foreground">Available Until</div>
              <div class="p-3 bg-background rounded-md border">
                <div class="text-sm">
                  {{ enableAvailableUntil && localData.availableUntil 
                    ? formatDateTime(localData.availableUntil) 
                    : 'Always available' }}
                </div>
              </div>
            </div>
          </div>

          <!-- Duration Calculation -->
          <div v-if="scheduleInfo.duration" class="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-800">
            <div class="flex items-center space-x-2">
              <Clock class="w-4 h-4 text-blue-600" />
              <div class="text-sm">
                <span class="font-medium">Lab Duration: </span>
                <span class="text-blue-700 dark:text-blue-300">{{ scheduleInfo.duration }}</span>
              </div>
            </div>
          </div>

          <!-- Warnings -->
          <div v-if="scheduleInfo.warnings.length > 0" class="space-y-2">
            <Alert
              v-for="warning in scheduleInfo.warnings"
              :key="warning"
              variant="default"
            >
              <AlertTriangle class="h-4 w-4" />
              <AlertDescription>{{ warning }}</AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
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
import {
  Calendar,
  Clock,
  CalendarX,
  CalendarCheck,
  Info,
  AlertTriangle,
  AlertCircle
} from 'lucide-vue-next'

// UI Components
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { DatePicker } from '@/components/ui/date-picker'
import { TimePicker } from '@/components/ui/time-picker'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'

// Types
import type { ValidationResult } from '@/types/wizard'

// Props
interface Props {
  modelValue: {
    availableFrom?: Date
    availableUntil?: Date
    dueDate?: Date
    latePenaltyPercent?: number  // 0-100, default 50
  }
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
const fieldErrors = ref<Record<string, string>>({})
const isUpdatingFromProps = ref(false)

// Form controls
const enableAvailableFrom = ref(false)
const enableDueDate = ref(false)
const enableAvailableUntil = ref(false)

// Late penalty controls
const latePenaltyPercent = ref(props.modelValue.latePenaltyPercent ?? 50)
// Slider expects number[] - convert between scalar and array
const latePenaltySliderValue = ref([latePenaltyPercent.value])

// Date/time inputs
const availableFromDateObj = ref<Date>()
const availableFromTime = ref('09:00')
const dueDateDateObj = ref<Date>()
const dueDateTime = ref('23:59')
const availableUntilDateObj = ref<Date>()
const availableUntilTime = ref('23:59')

// Computed
const todayString = computed(() => {
  return new Date().toISOString().split('T')[0]
})

const scheduleInfo = computed(() => {
  const info = {
    duration: '',
    warnings: [] as string[]
  }

  const now = new Date()
  const availableFrom = localData.value.availableFrom
  const dueDate = localData.value.dueDate
  const availableUntil = localData.value.availableUntil

  // Calculate duration
  if (availableFrom && (dueDate || availableUntil)) {
    const endDate = dueDate || availableUntil!
    const durationMs = endDate.getTime() - availableFrom.getTime()
    const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24))
    
    if (durationDays === 1) {
      info.duration = '1 day'
    } else if (durationDays < 7) {
      info.duration = `${durationDays} days`
    } else if (durationDays < 30) {
      const weeks = Math.floor(durationDays / 7)
      const remainingDays = durationDays % 7
      info.duration = `${weeks} week${weeks !== 1 ? 's' : ''}${remainingDays > 0 ? ` ${remainingDays} day${remainingDays !== 1 ? 's' : ''}` : ''}`
    } else {
      const months = Math.floor(durationDays / 30)
      info.duration = `${months} month${months !== 1 ? 's' : ''}`
    }
  }

  // Generate warnings
  if (availableFrom && availableFrom <= now) {
    info.warnings.push('Lab will be available immediately (start date is in the past)')
  }

  if (dueDate && dueDate <= now) {
    info.warnings.push('Due date is in the past')
  }

  if (availableFrom && dueDate && availableFrom >= dueDate) {
    info.warnings.push('Due date should be after the availability start date')
  }

  if (dueDate && availableUntil && dueDate > availableUntil) {
    info.warnings.push('Due date should be before or equal to the availability end date')
  }

  if (availableFrom && availableUntil) {
    const durationMs = availableUntil.getTime() - availableFrom.getTime()
    if (durationMs < 24 * 60 * 60 * 1000) { // Less than 24 hours
      info.warnings.push('Lab duration is less than 24 hours')
    }
  }

  return info
})

// Methods
const formatDateTime = (date: Date): string => {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const hasError = (field: string): boolean => {
  return !!fieldErrors.value[field]
}

const getError = (field: string): string => {
  return fieldErrors.value[field] || ''
}

const toggleAvailableFrom = (checked: boolean | 'indeterminate') => {
  const isChecked = checked === true
  enableAvailableFrom.value = isChecked

  if (!isChecked) {
    localData.value.availableFrom = undefined
    availableFromDateObj.value = undefined
    delete fieldErrors.value.availableFrom
  } else {
    // Set default date to today if not already set
    if (!availableFromDateObj.value) {
      availableFromDateObj.value = new Date()
    }
    updateAvailableFrom()
  }
  validateStep()
}

const toggleDueDate = (checked: boolean | 'indeterminate') => {
  const isChecked = checked === true
  enableDueDate.value = isChecked

  if (!isChecked) {
    localData.value.dueDate = undefined
    dueDateDateObj.value = undefined
    delete fieldErrors.value.dueDate
  } else {
    // Set default date to tomorrow if not already set
    if (!dueDateDateObj.value) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      dueDateDateObj.value = tomorrow
    }
    updateDueDate()
  }
  // Reset penalty to default when disabling due date
  if (!isChecked) {
    latePenaltyPercent.value = 50
    latePenaltySliderValue.value = [50]
  }
  validateStep()
}

const toggleAvailableUntil = (checked: boolean | 'indeterminate') => {
  const isChecked = checked === true
  enableAvailableUntil.value = isChecked

  if (!isChecked) {
    localData.value.availableUntil = undefined
    availableUntilDateObj.value = undefined
    delete fieldErrors.value.availableUntil
  } else {
    // Set default date to one week from now if not already set
    if (!availableUntilDateObj.value) {
      const oneWeek = new Date()
      oneWeek.setDate(oneWeek.getDate() + 7)
      availableUntilDateObj.value = oneWeek
    }
    updateAvailableUntil()
  }
  validateStep()
}

const updateAvailableFrom = () => {
  if (availableFromDateObj.value && availableFromTime.value) {
    const [hours, minutes] = availableFromTime.value.split(':')
    const dateTime = new Date(availableFromDateObj.value)
    dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    localData.value.availableFrom = dateTime
  } else {
    localData.value.availableFrom = undefined
  }
  validateStep()
}

const updateDueDate = () => {
  if (dueDateDateObj.value && dueDateTime.value) {
    const [hours, minutes] = dueDateTime.value.split(':')
    const dateTime = new Date(dueDateDateObj.value)
    dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    localData.value.dueDate = dateTime
  } else {
    localData.value.dueDate = undefined
  }
  validateStep()
}

const updateAvailableUntil = () => {
  if (availableUntilDateObj.value && availableUntilTime.value) {
    const [hours, minutes] = availableUntilTime.value.split(':')
    const dateTime = new Date(availableUntilDateObj.value)
    dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    localData.value.availableUntil = dateTime
  } else {
    localData.value.availableUntil = undefined
  }
  validateStep()
}

const validateStep = () => {
  fieldErrors.value = {}

  const { availableFrom, dueDate, availableUntil } = localData.value

  // Validate date logic
  if (availableFrom && dueDate && availableFrom >= dueDate) {
    fieldErrors.value.dueDate = 'Due date must be after availability start date'
  }

  if (dueDate && availableUntil && dueDate > availableUntil) {
    fieldErrors.value.availableUntil = 'Availability end date must be after due date'
  }

  if (availableFrom && availableUntil && availableFrom >= availableUntil) {
    fieldErrors.value.availableUntil = 'Availability end date must be after start date'
  }

  const errors = Object.values(fieldErrors.value).filter(Boolean)
  const isValid = errors.length === 0

  const validationResult: ValidationResult = {
    isValid,
    errors,
    warnings: scheduleInfo.value.warnings
  }

  // Only emit validation if not updating from props to prevent loops
  if (!isUpdatingFromProps.value) {
    emit('validate', validationResult)
  }
}

const initializeFromExistingData = () => {
  if (props.modelValue.availableFrom) {
    enableAvailableFrom.value = true
    const date = new Date(props.modelValue.availableFrom)
    availableFromDateObj.value = date
    availableFromTime.value = date.toTimeString().slice(0, 5)
  }

  if (props.modelValue.dueDate) {
    enableDueDate.value = true
    const date = new Date(props.modelValue.dueDate)
    dueDateDateObj.value = date
    // Initialize late penalty from props
    latePenaltyPercent.value = props.modelValue.latePenaltyPercent ?? 50
    latePenaltySliderValue.value = [latePenaltyPercent.value]
    dueDateTime.value = date.toTimeString().slice(0, 5)
  }

  if (props.modelValue.availableUntil) {
    enableAvailableUntil.value = true
    const date = new Date(props.modelValue.availableUntil)
    availableUntilDateObj.value = date
    availableUntilTime.value = date.toTimeString().slice(0, 5)
  }
}

// Watchers
// Handler for slider change - keep in sync with input
const onLatePenaltySliderChange = (value: number[] | undefined) => {
  if (!value || value.length === 0) return
  latePenaltyPercent.value = value[0]
  localData.value.latePenaltyPercent = value[0]
}

// Handler for input change - keep in sync with slider
const onLatePenaltyInputChange = () => {
  // Clamp value to 0-100
  const clamped = Math.max(0, Math.min(100, latePenaltyPercent.value || 0))
  latePenaltyPercent.value = clamped
  latePenaltySliderValue.value = [clamped]
  localData.value.latePenaltyPercent = clamped
}

watch(
  localData,
  (newValue) => {
    if (!isUpdatingFromProps.value) {
      emit('update:modelValue', newValue)
    }
  },
  { deep: true }
)

watch(
  () => props.modelValue,
  (newValue) => {
    isUpdatingFromProps.value = true
    localData.value = { ...newValue }
    initializeFromExistingData()
    nextTick(() => {
      isUpdatingFromProps.value = false
    })
  },
  { deep: true }
)

// Watch date object changes
watch(availableFromDateObj, () => {
  if (enableAvailableFrom.value) {
    updateAvailableFrom()
  }
})

watch(dueDateDateObj, () => {
  if (enableDueDate.value) {
    updateDueDate()
  }
})

watch(availableUntilDateObj, () => {
  if (enableAvailableUntil.value) {
    updateAvailableUntil()
  }
})

// Lifecycle
onMounted(() => {
  initializeFromExistingData()
  validateStep()
})
</script>