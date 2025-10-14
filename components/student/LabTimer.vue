<template>
  <Card
    v-if="shouldShowTimer"
    :class="[
      'fixed bottom-4 left-6 px-3 z-50 w-[380px] rounded-lg backdrop-blur-md drop-shadow-lg transition-all duration-300',
      timerColorClass,
      isExpired ? 'bg-red-500/90' : 'bg-gradient-to-tl from-neutral-50/90 to-neutral-100/90 dark:from-neutral-900/90 dark:to-neutral-800/90'
    ]"
  >
    <Accordion type="single" collapsible v-model="accordionValue">
      <AccordionItem value="item-1">
        <AccordionTrigger class="font-bold flex items-center py-2 hover:no-underline">
          <div class="flex items-center gap-2 flex-1">
            <TimerIcon v-if="!isExpired" class="w-4 h-4" :class="timerIconClass" />
            <TimerOffIcon v-else class="w-4 h-4 text-white" />
            <span :class="['text-sm', isExpired ? 'text-white' : '']">
              {{ isExpired ? 'Time Expired' : (remainingMs === null && !isTimerExpanded ? 'No Remaining Time' : 'Remaining Time') }}
            </span>
            <code
              v-if="!isTimerExpanded && !isExpired && remainingMs !== null"
              class="font-mono text-sm ml-1 fade-in"
              :class="timerTextClass"
            >
              {{ formattedTimeCollapsed }}
            </code>
            <span v-if="!isTimerExpanded && isExpired" class="text-white font-bold text-sm ml-1 fade-in">
              Expired
            </span>
          </div>
        </AccordionTrigger>

        <AccordionContent class="fade-in">
          <div class="pb-3">
            <!-- Expired State -->
            <div v-if="isExpired" class="text-center py-3">
              <p class="text-white text-xl font-bold">Time's Up!</p>
              <p class="text-white/80 text-xs mt-1">
                This lab/exam is no longer available
              </p>
            </div>

            <!-- Active Timer State -->
            <div v-else class="font-mono select-none">
              <p
                class="text-3xl font-bold text-center transition-colors"
                :class="timerTextClass"
              >
                {{ formattedTimeExpanded }}
              </p>

              <div class="flex gap-x-2 items-center justify-center text-xs text-gray-600 dark:text-gray-400 pt-2 mt-2 border-t border-border">
                <span class="flex gap-x-1 items-center">
                  <TimerIcon :size="12" />
                  <span class="font-sans">Start:</span>
                  <code class="font-mono text-[10px]">{{ formatDateTime(startTime) }}</code>
                </span>
                <span class="flex gap-x-1 items-center">
                  <TimerOffIcon :size="12" />
                  <span class="font-sans">{{ deadlineLabel }}:</span>
                  <code class="font-mono text-[10px]">{{ formatDateTime(effectiveDeadline) }}</code>
                </span>
              </div>

              <!-- Timer Type Indicator -->
              <div class="text-center mt-1.5">
                <Badge variant="outline" class="text-[10px] py-0 px-1.5">
                  {{ deadlineTypeLabel }}
                </Badge>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { Timer as TimerIcon, TimerOff as TimerOffIcon } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

interface Props {
  availableFrom?: Date | string | null
  dueDate?: Date | string | null
  availableUntil?: Date | string | null
  onTimerExpire?: () => void
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'timer-expired'): void
}>()

// State
const currentTime = ref(Date.now())
const timerInterval = ref<NodeJS.Timeout | null>(null)
const accordionValue = ref('item-1') // Start expanded
const isTimerExpanded = ref(true)

// Watch accordion state
watch(accordionValue, (newValue) => {
  isTimerExpanded.value = newValue === 'item-1'
}, { immediate: true })

// Parse dates
const startTime = computed(() => {
  if (!props.availableFrom) return new Date()
  return typeof props.availableFrom === 'string'
    ? new Date(props.availableFrom)
    : props.availableFrom
})

const parsedDueDate = computed(() => {
  if (!props.dueDate) return null
  return typeof props.dueDate === 'string'
    ? new Date(props.dueDate)
    : props.dueDate
})

const parsedAvailableUntil = computed(() => {
  if (!props.availableUntil) return null
  return typeof props.availableUntil === 'string'
    ? new Date(props.availableUntil)
    : props.availableUntil
})

// Timer Logic Priority
// 1. If has Due Date → show Due Date - Current Time
// 2. If no Due Date but has Available Until → show Available Until - Current Time
// 3. If both exist:
//    - Show Due Date - Current Time if current < Due Date
//    - Show Available Until - Current Time if current >= Due Date
// 4. If neither → show "Indefinite"

const effectiveDeadline = computed(() => {
  const now = currentTime.value
  const due = parsedDueDate.value
  const until = parsedAvailableUntil.value

  // Case 1: Has Due Date
  if (due && !until) {
    return due
  }

  // Case 2: No Due Date but has Available Until
  if (!due && until) {
    return until
  }

  // Case 3: Both exist
  if (due && until) {
    if (now < due.getTime()) {
      return due // Show due date if before due
    } else {
      return until // Show available until if after due
    }
  }

  // Case 4: Neither exists
  return null
})

const deadlineLabel = computed(() => {
  const now = currentTime.value
  const due = parsedDueDate.value
  const until = parsedAvailableUntil.value

  if (due && until) {
    return now < due.getTime() ? 'Due' : 'Ends'
  }
  if (due) return 'Due'
  if (until) return 'Ends'
  return 'End'
})

const deadlineTypeLabel = computed(() => {
  const now = currentTime.value
  const due = parsedDueDate.value
  const until = parsedAvailableUntil.value

  if (!due && !until) return 'No Deadline'
  if (due && until) {
    return now < due.getTime() ? 'Due Date Active' : 'Final Deadline Active'
  }
  if (due) return 'Due Date'
  if (until) return 'Available Until'
  return 'Timer'
})

const shouldShowTimer = computed(() => {
  // Always show if there's a deadline
  return effectiveDeadline.value !== null || (!parsedDueDate.value && !parsedAvailableUntil.value)
})

const remainingMs = computed(() => {
  if (!effectiveDeadline.value) return null
  return effectiveDeadline.value.getTime() - currentTime.value
})

const isExpired = computed(() => {
  if (!parsedAvailableUntil.value) return false
  return currentTime.value >= parsedAvailableUntil.value.getTime()
})

const isUnder10Minutes = computed(() => {
  if (remainingMs.value === null) return false
  return remainingMs.value > 0 && remainingMs.value < 10 * 60 * 1000
})

// Format time based on remaining duration
const formatTimeRemaining = (ms: number | null, includeMilliseconds: boolean = false) => {
  if (ms === null) return 'Indefinite'
  if (ms <= 0) return 'Expired'

  const totalSeconds = Math.floor(ms / 1000)
  const milliseconds = ms % 1000

  const years = Math.floor(totalSeconds / (365 * 24 * 60 * 60))
  const months = Math.floor((totalSeconds % (365 * 24 * 60 * 60)) / (30 * 24 * 60 * 60))
  const days = Math.floor((totalSeconds % (30 * 24 * 60 * 60)) / (24 * 60 * 60))
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60))
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60)
  const seconds = totalSeconds % 60

  // >= 1 year: "Y Years MM Months"
  if (years >= 1) {
    return `${years} Year${years > 1 ? 's' : ''} ${months} Month${months !== 1 ? 's' : ''}`
  }

  // >= 1 month: "M Months DD Days"
  if (months >= 1) {
    return `${months} Month${months > 1 ? 's' : ''} ${days} Day${days !== 1 ? 's' : ''}`
  }

  // > 1 day: "D Days HH:MM:SS"
  if (days >= 1) {
    const hh = hours.toString().padStart(2, '0')
    const mm = minutes.toString().padStart(2, '0')
    const ss = seconds.toString().padStart(2, '0')
    return `${days} Day${days > 1 ? 's' : ''} ${hh}:${mm}:${ss}`
  }

  // >= 1 hour: "HH:MM:SS.mmm"
  if (hours >= 1) {
    const hh = hours.toString().padStart(2, '0')
    const mm = minutes.toString().padStart(2, '0')
    const ss = seconds.toString().padStart(2, '0')
    const mmm = milliseconds.toString().padStart(3, '0')
    return includeMilliseconds ? `${hh}:${mm}:${ss}.${mmm}` : `${hh}:${mm}:${ss}`
  }

  // >= 1 minute: "MM:SS.mmm"
  if (minutes >= 1) {
    const mm = minutes.toString().padStart(2, '0')
    const ss = seconds.toString().padStart(2, '0')
    const mmm = milliseconds.toString().padStart(3, '0')
    return includeMilliseconds ? `${mm}:${ss}.${mmm}` : `${mm}:${ss}`
  }

  // < 1 minute: "SS.mmm"
  const ss = seconds.toString().padStart(2, '0')
  const mmm = milliseconds.toString().padStart(3, '0')
  return `${ss}.${mmm}`
}

const formattedTimeExpanded = computed(() => {
  return formatTimeRemaining(remainingMs.value, true)
})

const formattedTimeCollapsed = computed(() => {
  const ms = remainingMs.value
  if (ms === null) return 'Indefinite'
  if (ms <= 0) return 'Expired'

  // For collapsed view, only show HH:MM:SS (no milliseconds)
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / (24 * 60 * 60))

  if (days >= 1) {
    return `${days}d remaining`
  }

  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60))
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60)
  const seconds = totalSeconds % 60

  const hh = hours.toString().padStart(2, '0')
  const mm = minutes.toString().padStart(2, '0')
  const ss = seconds.toString().padStart(2, '0')

  return `${hh}:${mm}:${ss}`
})

const formatDateTime = (date: Date | null) => {
  if (!date) return 'N/A'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

// Styling classes
const timerColorClass = computed(() => {
  if (isExpired.value) {
    return 'outline outline-2 outline-offset-1 outline-red-500 bg-red-500/90'
  }
  if (isUnder10Minutes.value) {
    return 'flash-red outline outline-[0.5px] outline-offset-1 outline-red-200/50'
  }
  return 'outline outline-[0.5px] outline-offset-1 outline-neutral-200/50 dark:outline-neutral-700/50'
})

const timerTextClass = computed(() => {
  if (isExpired.value) return 'text-white'
  if (isUnder10Minutes.value) return 'text-red-600 dark:text-red-400 blink-text'
  return 'text-foreground'
})

const timerIconClass = computed(() => {
  if (isUnder10Minutes.value) return 'text-red-600 dark:text-red-400 blink-icon'
  return 'text-foreground'
})

// Timer update
const updateTimer = () => {
  const previousExpired = isExpired.value
  currentTime.value = Date.now()

  // Check if just expired
  if (!previousExpired && isExpired.value) {
    emit('timer-expired')
  }
}

// Lifecycle
onMounted(() => {
  // Update every 9ms
  timerInterval.value = setInterval(updateTimer, 9)
})

onBeforeUnmount(() => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }
})
</script>

<style scoped>
/* Fade in animation for accordion content and collapsed timer */
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.fade-in {
  animation: fade-in 0.3s ease-in-out;
}

/* Red flash animation for < 10 minutes using CSS variables */
@keyframes flash-red-light {
  0%, 100% {
    background: linear-gradient(to top left, color-mix(in oklch, var(--destructive) 20%, transparent), color-mix(in oklch, var(--destructive) 30%, transparent));
  }
  50% {
    background: linear-gradient(to top left, color-mix(in oklch, var(--destructive) 30%, transparent), color-mix(in oklch, var(--destructive) 40%, transparent));
  }
}

@keyframes flash-red-dark {
  0%, 100% {
    background: linear-gradient(to top left, color-mix(in oklch, var(--destructive) 40%, transparent), color-mix(in oklch, var(--destructive) 50%, transparent));
  }
  50% {
    background: linear-gradient(to top left, color-mix(in oklch, var(--destructive) 50%, transparent), color-mix(in oklch, var(--destructive) 60%, transparent));
  }
}

.flash-red {
  animation: flash-red-light 1s ease-in-out infinite;
}

:global(.dark) .flash-red {
  animation: flash-red-dark 1s ease-in-out infinite;
}

/* Blink animation for text */
@keyframes blink-text {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.blink-text {
  animation: blink-text 1s ease-in-out infinite;
}

/* Blink animation for icon */
@keyframes blink-icon {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.1);
  }
}

.blink-icon {
  animation: blink-icon 1s ease-in-out infinite;
}
</style>
