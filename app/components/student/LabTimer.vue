<template>
  <Card v-if="shouldShowTimer" :class="[cardBaseClasses, cardVariantClasses]">
    <Accordion type="single" collapsible v-model="accordionValue">
      <AccordionItem value="timer">
        <AccordionTrigger class="flex items-center gap-2 py-2 hover:no-underline">
          <TimerIcon v-if="!isExpired" class="w-4 h-4" :class="timerIconClass" />
          <TimerOffIcon v-else class="w-4 h-4 text-destructive-foreground" />
          <span :class="['text-sm font-semibold', headerTextClasses]">
            {{ isExpired ? 'Time Expired' : (remainingMs === null && !isTimerExpanded ? 'No Remaining Time' :
            'RemainingTime') }}
          </span>
          <code v-if="!isTimerExpanded && !isExpired && remainingMs !== null" class="font-mono text-sm ml-auto fade-in"
            :class="timerTextClass">
            {{ formattedTimeCollapsed }}
          </code>
          <span v-else-if="!isTimerExpanded && isExpired"
            class="ml-auto text-sm font-bold text-destructive-foreground fade-in">
            Expired
          </span>
        </AccordionTrigger>

        <AccordionContent class="fade-in">
          <div class="pb-2">
            <div v-if="isExpired" class="text-center py-3 space-y-1.5">
              <p class="text-destructive-foreground text-lg font-bold">Time's Up!</p>
              <p class="text-destructive-foreground/80 text-xs">
                This lab attempt is no longer available.
              </p>
            </div>

            <div v-else class="font-mono select-none">
              <p class="text-3xl font-bold text-center transition-colors" :class="timerTextClass">
                {{ formattedTimeExpanded }}
              </p>

              <div class="mt-3 pt-2 flex flex-col gap-1.5 border-t border-border/60 text-xs text-muted-foreground">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1.5">
                    <TimerIcon :size="12" />
                    <span class="font-sans">Start</span>
                  </div>
                  <code class="font-mono text-[11px] text-muted-foreground/80">
                    {{ formatDateTime(startTime) }}
                  </code>
                </div>

                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1.5">
                    <TimerOffIcon :size="12" />
                    <span class="font-sans">{{ deadlineLabel }}</span>
                  </div>
                  <code class="font-mono text-[11px]" :class="deadlineTextClasses">
                    {{ formatDateTime(effectiveDeadline) }}
                  </code>
                </div>
              </div>

              <div class="text-center mt-2">
                <Badge variant="outline" class="text-[10px] px-2 py-0.5 border-border/70 text-muted-foreground">
                  {{ deadlineTypeLabel }}
                </Badge>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </Card>

  <transition name="totem-overlay">
    <div v-if="showTotemAnimation" class="totem-overlay">
      <div class="totem-backdrop" />
      <div class="totem-container">
        <div class="totem-image-wrapper">
          <img src="/Totem_of_Undying_Bedrock_Animation.webp" alt="Totem of Undying Animation" class="totem-image" />
        </div>
        <div class="totem-text">
          <p class="totem-title">Extra Time Granted!</p>
          <p class="totem-subtitle">Your instructor has extended this attempt.</p>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Timer as TimerIcon, TimerOff as TimerOffIcon } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

interface Props {
  availableFrom?: Date | string | null
  dueDate?: Date | string | null
  availableUntil?: Date | string | null
  labId?: string
  createdAt?: Date | string | null
  pollIntervalMs?: number
  onTimerExpire?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  pollIntervalMs: 30000
})

const emit = defineEmits<{
  (e: 'timer-expired'): void
  (e: 'deadline-extended', payload: {
    labId: string
    labTitle?: string
    fields: Array<{
      type: 'dueDate' | 'availableUntil'
      previous: string | null
      next: string | null
      diffMs: number
    }>
  }): void
}>()

const currentTime = ref(Date.now())
const timerInterval = ref<NodeJS.Timeout | null>(null)
const pollInterval = ref<NodeJS.Timeout | null>(null)
const eventSource = ref<EventSource | null>(null)
const reconnectTimeout = ref<NodeJS.Timeout | null>(null)
const totemTimeout = ref<NodeJS.Timeout | null>(null)
const isPolling = ref(false)
const hasPolledOnce = ref(false)
const accordionValue = ref('timer')
const isTimerExpanded = ref(true)
const showTotemAnimation = ref(false)
const totemAudio = ref<HTMLAudioElement | null>(null)
const runtimeConfig = useRuntimeConfig()

const parseDateInput = (value: Date | string | null | undefined): Date | null => {
  if (!value) return null
  if (value instanceof Date) return value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const startTimeRef = ref<Date>(parseDateInput(props.availableFrom ?? props.createdAt) ?? new Date())
const dueDateRef = ref<Date | null>(parseDateInput(props.dueDate))
const availableUntilRef = ref<Date | null>(parseDateInput(props.availableUntil))

watch(accordionValue, (value) => {
  isTimerExpanded.value = value === 'timer'
}, { immediate: true })

watch(() => props.availableFrom, value => {
  const parsed = parseDateInput(value)
  if (parsed) {
    startTimeRef.value = parsed
  }
})

watch(() => props.createdAt, value => {
  if (props.availableFrom) {
    return
  }
  const parsed = parseDateInput(value)
  if (parsed) {
    startTimeRef.value = parsed
  }
})

watch(() => props.dueDate, value => {
  if (value === null || value === undefined) {
    dueDateRef.value = null
    return
  }
  const parsed = parseDateInput(value)
  if (parsed) {
    dueDateRef.value = parsed
  }
})

watch(() => props.availableUntil, value => {
  if (value === null || value === undefined) {
    availableUntilRef.value = null
    return
  }
  const parsed = parseDateInput(value)
  if (parsed) {
    availableUntilRef.value = parsed
  }
})

const startTime = computed(() => startTimeRef.value)
const parsedDueDate = computed(() => dueDateRef.value)
const parsedAvailableUntil = computed(() => availableUntilRef.value)

const effectiveDeadline = computed(() => {
  const now = currentTime.value
  const due = parsedDueDate.value
  const until = parsedAvailableUntil.value

  if (due && !until) return due
  if (!due && until) return until
  if (due && until) {
    return now < due.getTime() ? due : until
  }
  return null
})

const deadlineLabel = computed(() => {
  const now = currentTime.value
  const due = parsedDueDate.value
  const until = parsedAvailableUntil.value

  if (due && until) return now < due.getTime() ? 'Due' : 'Ends'
  if (due) return 'Due'
  if (until) return 'Ends'
  return 'End'
})

const deadlineTypeLabel = computed(() => {
  const now = currentTime.value
  const due = parsedDueDate.value
  const until = parsedAvailableUntil.value

  if (!due && !until) return 'No Deadline'
  if (due && until) return now < due.getTime() ? 'Due Date Active' : 'Final Deadline Active'
  if (due) return 'Due Date'
  if (until) return 'Available Until'
  return 'Timer'
})

const shouldShowTimer = computed(() => {
  return effectiveDeadline.value !== null || (!parsedDueDate.value && !parsedAvailableUntil.value)
})

const remainingMs = computed(() => {
  if (!effectiveDeadline.value) return null
  return effectiveDeadline.value.getTime() - currentTime.value
})

const isExpired = computed(() => {
  const until = parsedAvailableUntil.value
  if (!until) return false
  return currentTime.value >= until.getTime()
})

const isUnder10Minutes = computed(() => {
  if (remainingMs.value === null) return false
  return remainingMs.value > 0 && remainingMs.value < 10 * 60 * 1000
})

const formatTimeRemaining = (ms: number | null, includeMilliseconds = false) => {
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

  if (years >= 1) {
    return `${years} Year${years > 1 ? 's' : ''} ${months} Month${months !== 1 ? 's' : ''}`
  }

  if (months >= 1) {
    return `${months} Month${months > 1 ? 's' : ''} ${days} Day${days !== 1 ? 's' : ''}`
  }

  if (days >= 1) {
    const hh = hours.toString().padStart(2, '0')
    const mm = minutes.toString().padStart(2, '0')
    const ss = seconds.toString().padStart(2, '0')
    return `${days} Day${days > 1 ? 's' : ''} ${hh}:${mm}:${ss}`
  }

  if (hours >= 1) {
    const hh = hours.toString().padStart(2, '0')
    const mm = minutes.toString().padStart(2, '0')
    const ss = seconds.toString().padStart(2, '0')
    const mmm = milliseconds.toString().padStart(3, '0')
    return includeMilliseconds ? `${hh}:${mm}:${ss}.${mmm}` : `${hh}:${mm}:${ss}`
  }

  if (minutes >= 1) {
    const mm = minutes.toString().padStart(2, '0')
    const ss = seconds.toString().padStart(2, '0')
    const mmm = milliseconds.toString().padStart(3, '0')
    return includeMilliseconds ? `${mm}:${ss}.${mmm}` : `${mm}:${ss}`
  }

  const ss = seconds.toString().padStart(2, '0')
  const mmm = milliseconds.toString().padStart(3, '0')
  return `${ss}.${mmm}`
}

const formattedTimeExpanded = computed(() => formatTimeRemaining(remainingMs.value, true))

const formattedTimeCollapsed = computed(() => {
  const ms = remainingMs.value
  if (ms === null) return 'Indefinite'
  if (ms <= 0) return 'Expired'

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

const cardBaseClasses = 'fixed z-40 w-[360px] rounded-2xl px-4 py-3 backdrop-blur-xl border select-none left-6 top-1/2 -translate-y-1/2'
const cardVariantClasses = computed(() => {
  if (isExpired.value) {
    return 'bg-destructive/95 text-destructive-foreground border-destructive/60 shadow-[0_24px_48px_-20px_rgba(220,38,38,0.55)]'
  }
  if (isUnder10Minutes.value) {
    return 'bg-card/95 text-card-foreground border-destructive/40 ring-2 ring-destructive/30 shadow-[0_20px_45px_-20px_rgba(220,38,38,0.35)]'
  }
  return 'bg-card/95 text-card-foreground border-border/60 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.35)] dark:shadow-[0_18px_40px_-24px_rgba(100,116,139,0.25)]'
})

const headerTextClasses = computed(() => {
  if (isExpired.value) return 'text-destructive-foreground'
  if (isUnder10Minutes.value) return 'text-destructive'
  return 'text-muted-foreground'
})

const timerTextClass = computed(() => {
  if (isExpired.value) return 'text-destructive-foreground'
  if (isUnder10Minutes.value) return 'text-destructive font-semibold glow-text'
  return 'text-foreground'
})

const timerIconClass = computed(() => {
  if (isUnder10Minutes.value) return 'text-destructive animate-pulse'
  return 'text-muted-foreground'
})

const deadlineTextClasses = computed(() => {
  if (isExpired.value) return 'text-destructive-foreground'
  if (isUnder10Minutes.value) return 'text-destructive'
  return 'text-muted-foreground/80'
})

const sanitizedPollInterval = computed(() => Math.max(20000, props.pollIntervalMs ?? 30000))

const updateTimer = () => {
  const previouslyExpired = isExpired.value
  currentTime.value = Date.now()

  if (!previouslyExpired && isExpired.value) {
    emit('timer-expired')
  }
}

const EXTENSION_THRESHOLD_MS = 1000

const hasDeadlineExtended = (previous: Date | null, next: Date | null) => {
  if (!next) return false
  if (!previous) return true
  return next.getTime() - previous.getTime() > EXTENSION_THRESHOLD_MS
}

const triggerTotemAnimation = (extendedFields: Array<{ type: 'dueDate' | 'availableUntil'; diffMs: number }>) => {
  const positiveChanges = extendedFields.filter(field => field && typeof field.diffMs === 'number' && field.diffMs > 0)

  if (positiveChanges.length === 0) {
    return
  }

  if (showTotemAnimation.value) {
    if (totemTimeout.value) {
      clearTimeout(totemTimeout.value)
    }
    totemTimeout.value = setTimeout(() => {
      showTotemAnimation.value = false
    }, 2600)
    // Play totem sound again if animation is retriggered
    playTotemSound()
    return
  }

  if (totemTimeout.value) {
    clearTimeout(totemTimeout.value)
  }

  showTotemAnimation.value = true
  playTotemSound()
  totemTimeout.value = setTimeout(() => {
    showTotemAnimation.value = false
  }, 2600)
}

const playTotemSound = () => {
  try {
    // Create audio element if not already created
    if (!totemAudio.value) {
      totemAudio.value = new Audio('/minecraft-totem-sound.mp3')
    }

    // Reset audio to start and play
    totemAudio.value.currentTime = 0
    totemAudio.value.play().catch((error) => {
      console.warn('Failed to play totem sound:', error)
    })
  } catch (error) {
    console.warn('Error creating totem audio:', error)
  }
}

const teardownEventSource = () => {
  if (eventSource.value) {
    eventSource.value.close()
    eventSource.value = null
  }

  if (reconnectTimeout.value) {
    clearTimeout(reconnectTimeout.value)
    reconnectTimeout.value = null
  }
}

const scheduleReconnect = () => {
  if (reconnectTimeout.value) {
    return
  }

  reconnectTimeout.value = setTimeout(() => {
    if (!props.labId) {
      reconnectTimeout.value = null
      return
    }
    reconnectTimeout.value = null
    setupEventSource()
  }, 5000)
}

const applyTimerPayload = (payload: any, options?: { animate?: boolean; changes?: Array<{ type: 'dueDate' | 'availableUntil'; diffMs: number }> }) => {
  if (!payload || typeof payload !== 'object') {
    return
  }

  const startSource = Object.prototype.hasOwnProperty.call(payload, 'availableFrom')
    ? payload.availableFrom
    : Object.prototype.hasOwnProperty.call(payload, 'createdAt')
      ? payload.createdAt
      : null

  const parsedStart = parseDateInput(startSource ?? null)
  if (parsedStart) {
    startTimeRef.value = parsedStart
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'dueDate')) {
    dueDateRef.value = parseDateInput(payload.dueDate ?? null)
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'availableUntil')) {
    availableUntilRef.value = parseDateInput(payload.availableUntil ?? null)
  }

  if (options?.animate && options.changes && options.changes.length > 0) {
    triggerTotemAnimation(options.changes)
  }
}

const setupEventSource = () => {
  if (!props.labId || typeof window === 'undefined' || typeof EventSource === 'undefined') {
    return
  }

  teardownEventSource()

  try {
    const url = new URL(`${runtimeConfig.public.backendurl}/v0/labs/${props.labId}/stream`)
    const source = new EventSource(url.toString(), { withCredentials: true })
    eventSource.value = source

    source.addEventListener('timer_snapshot', (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data)
        applyTimerPayload(payload, { animate: false })
        hasPolledOnce.value = true
      } catch (error) {
        console.error('[LabTimer SSE] Failed to parse snapshot payload:', error)
      }
    })

    source.addEventListener('timer_update', (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data)
        const changes = Array.isArray(payload?.changes) ? payload.changes : []
        applyTimerPayload(payload, { animate: true, changes })
        hasPolledOnce.value = true

        if (changes.length > 0) {
          emit('deadline-extended', {
            labId: props.labId,
            labTitle: payload?.labTitle,
            fields: changes.map((change: any) => ({
              type: change.type,
              diffMs: typeof change.diffMs === 'number' ? change.diffMs : 0
            }))
          })
        }
      } catch (error) {
        console.error('[LabTimer SSE] Failed to parse timer update:', error)
      }
    })

    source.onerror = (event) => {
      console.error('[LabTimer SSE] connection error:', event)
      teardownEventSource()
      scheduleReconnect()
    }
  } catch (error) {
    console.error('[LabTimer SSE] Failed to open stream:', error)
    scheduleReconnect()
  }
}

const refreshLabDeadlines = async () => {
  if (!props.labId || isPolling.value) return

  isPolling.value = true

  try {
    const url = new URL(`${runtimeConfig.public.backendurl}/v0/labs/${props.labId}`)
    url.searchParams.set('fields', 'timer')

    const response = await fetch(
      url.toString(),
      {
        credentials: 'include'
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    if (!result.success || !result.data) {
      return
    }

    const lab = result.data
    const nextDue = parseDateInput(lab.dueDate)
    const nextAvailableUntil = parseDateInput(lab.availableUntil)

    const extendedFields: Array<{
      type: 'dueDate' | 'availableUntil'
      previous: Date | null
      next: Date | null
      diffMs: number
    }> = []

    if (hasPolledOnce.value) {
      if (hasDeadlineExtended(dueDateRef.value, nextDue)) {
        extendedFields.push({
          type: 'dueDate',
          previous: dueDateRef.value,
          next: nextDue,
          diffMs: (nextDue?.getTime() ?? 0) - (dueDateRef.value?.getTime() ?? 0)
        })
      }

      if (hasDeadlineExtended(availableUntilRef.value, nextAvailableUntil)) {
        extendedFields.push({
          type: 'availableUntil',
          previous: availableUntilRef.value,
          next: nextAvailableUntil,
          diffMs: (nextAvailableUntil?.getTime() ?? 0) - (availableUntilRef.value?.getTime() ?? 0)
        })
      }
    }

    applyTimerPayload({
      availableFrom: lab.availableFrom ?? null,
      createdAt: lab.createdAt ?? null,
      dueDate: lab.dueDate ?? null,
      availableUntil: lab.availableUntil ?? null
    }, {
      animate: hasPolledOnce.value,
      changes: extendedFields
    })

    if (hasPolledOnce.value && extendedFields.length > 0) {
      emit('deadline-extended', {
        labId: props.labId,
        labTitle: lab?.title,
        fields: extendedFields.map(field => ({
          type: field.type,
          diffMs: field.diffMs
        }))
      })
    }

    hasPolledOnce.value = true
  } catch (error) {
    console.error('[LabTimer] Failed to refresh lab deadlines:', error)
  } finally {
    isPolling.value = false
  }
}

const startPolling = () => {
  if (pollInterval.value) {
    clearInterval(pollInterval.value)
  }

  if (!props.labId) return

  refreshLabDeadlines()
  pollInterval.value = setInterval(() => {
    refreshLabDeadlines()
  }, sanitizedPollInterval.value)
}

watch(() => props.labId, () => {
  hasPolledOnce.value = false
  startPolling()
  setupEventSource()
})

watch(sanitizedPollInterval, () => {
  startPolling()
})

onMounted(() => {
  timerInterval.value = setInterval(updateTimer, 9)
  startPolling()
  setupEventSource()
})

onBeforeUnmount(() => {
  if (timerInterval.value) clearInterval(timerInterval.value)
  if (pollInterval.value) clearInterval(pollInterval.value)
  if (totemTimeout.value) clearTimeout(totemTimeout.value)
  teardownEventSource()
})
</script>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.fade-in {
  animation: fade-in 0.25s ease-in-out;
}

@keyframes glow-text {

  0%,
  100% {
    text-shadow: 0 0 6px color-mix(in oklch, var(--destructive) 60%, transparent);
  }

  50% {
    text-shadow: 0 0 15px color-mix(in oklch, var(--destructive) 75%, transparent);
  }
}

.glow-text {
  animation: glow-text 1.2s ease-in-out infinite;
}

.totem-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.totem-backdrop {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(56, 189, 248, 0.22), rgba(15, 23, 42, 0.7));
  backdrop-filter: blur(10px);
  animation: totem-backdrop 0.35s ease-out;
}

.totem-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  transform: scale(0.85);
  animation: totem-zoom 0.5s cubic-bezier(0.26, 1.12, 0.46, 1) forwards;
  pointer-events: none;
}

.totem-image-wrapper {
  width: min(320px, 60vw);
  aspect-ratio: 1 / 1.4;
  filter: drop-shadow(0 35px 60px rgba(8, 47, 73, 0.55));
}

.totem-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  animation: totem-pulse 1.4s ease-in-out infinite;
}

.totem-text {
  text-align: center;
  color: var(--primary-foreground);
  text-shadow: 0 14px 40px rgba(8, 47, 73, 0.55);
}

.totem-title {
  font-size: clamp(1.5rem, 2.8vw, 2.25rem);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.totem-subtitle {
  font-size: clamp(0.85rem, 2vw, 1.1rem);
  margin-top: 0.3rem;
  opacity: 0.85;
}

.totem-overlay-enter-active,
.totem-overlay-leave-active {
  transition: opacity 0.3s ease;
}

.totem-overlay-enter-from,
.totem-overlay-leave-to {
  opacity: 0;
}

@keyframes totem-backdrop {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes totem-zoom {
  0% {
    transform: scale(0.7) translateY(40px);
    opacity: 0;
  }

  60% {
    transform: scale(1.05) translateY(-12px);
    opacity: 1;
  }

  100% {
    transform: scale(1) translateY(0);
  }
}

@keyframes totem-pulse {

  0%,
  100% {
    filter: drop-shadow(0 24px 40px rgba(45, 212, 191, 0.35));
  }

  50% {
    filter: drop-shadow(0 32px 60px rgba(56, 189, 248, 0.4));
  }
}
</style>
