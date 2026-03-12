<template>
  <div v-if="shouldShowTimer" class="navbar-timer-wrapper">
    <!-- Timer Display -->
    <TooltipProvider :delay-duration="200">
      <Tooltip>
        <TooltipTrigger as-child>
          <div 
            :class="[
              'timer-container',
              {
                'timer-expired': isExpired,
                'timer-warning': isUnder10Minutes && !isExpired,
                'timer-normal': !isExpired && !isUnder10Minutes
              }
            ]"
          >
            <component 
              :is="isExpired ? TimerOffIcon : TimerIcon" 
              :class="[
                'timer-icon',
                { 'animate-pulse': isUnder10Minutes && !isExpired }
              ]"
            />
            <code class="timer-display">
              {{ isExpired ? 'Expired' : formattedTime }}
            </code>
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          :side-offset="8"
          class="timer-tooltip z-[200]"
        >
          <div class="tooltip-content">
            <div class="tooltip-row">
              <TimerIcon :size="14" class="tooltip-icon" />
              <span class="tooltip-label">Start</span>
              <code class="tooltip-value">{{ formatDateTime(startTime) }}</code>
            </div>
            <div class="tooltip-row">
              <TimerOffIcon :size="14" class="tooltip-icon" />
              <span class="tooltip-label">{{ deadlineLabel }}</span>
              <code class="tooltip-value" :class="{ 'text-destructive': isExpired || isUnder10Minutes }">
                {{ formatDateTime(effectiveDeadline) }}
              </code>
            </div>
            <div class="tooltip-badge-row">
              <Badge variant="outline" class="tooltip-badge">
                {{ deadlineTypeLabel }}
              </Badge>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <!-- Totem Animation Overlay -->
    <Transition name="totem-overlay">
      <div v-if="showTotemAnimation" class="totem-overlay">
        <div class="totem-backdrop" />
        <div class="totem-container">
          <div class="totem-image-wrapper">
            <img 
              src="/Totem_of_Undying_Bedrock_Animation.webp" 
              alt="Totem of Undying Animation" 
              class="totem-image" 
            />
          </div>
          <div class="totem-text">
            <p class="totem-title">Extra Time Granted!</p>
            <p class="totem-subtitle">Your instructor has extended this attempt.</p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Timer as TimerIcon, TimerOff as TimerOffIcon } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface Props {
  availableFrom?: Date | string | null
  dueDate?: Date | string | null
  availableUntil?: Date | string | null
  labId?: string
  createdAt?: Date | string | null
  pollIntervalMs?: number
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
      diffMs: number
    }>
  }): void
}>()

const currentTime = ref(Date.now())
const timerInterval = ref<ReturnType<typeof setInterval> | null>(null)
const pollInterval = ref<ReturnType<typeof setInterval> | null>(null)
const eventSource = ref<EventSource | null>(null)
const reconnectTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
const totemTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
const isPolling = ref(false)
const hasPolledOnce = ref(false)
const showTotemAnimation = ref(false)
const totemAudio = ref<HTMLAudioElement | null>(null)
const runtimeConfig = useRuntimeConfig()

// Date parsing utility
const parseDateInput = (value: Date | string | null | undefined): Date | null => {
  if (!value) return null
  if (value instanceof Date) return value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

// Reactive date refs
const startTimeRef = ref<Date>(parseDateInput(props.availableFrom ?? props.createdAt) ?? new Date())
const dueDateRef = ref<Date | null>(parseDateInput(props.dueDate))
const availableUntilRef = ref<Date | null>(parseDateInput(props.availableUntil))

// Watch for prop changes
watch(() => props.availableFrom, value => {
  const parsed = parseDateInput(value)
  if (parsed) startTimeRef.value = parsed
})

watch(() => props.createdAt, value => {
  if (props.availableFrom) return
  const parsed = parseDateInput(value)
  if (parsed) startTimeRef.value = parsed
})

watch(() => props.dueDate, value => {
  dueDateRef.value = value === null || value === undefined ? null : parseDateInput(value)
})

watch(() => props.availableUntil, value => {
  availableUntilRef.value = value === null || value === undefined ? null : parseDateInput(value)
})

// Computed values
const startTime = computed(() => startTimeRef.value)
const parsedDueDate = computed(() => dueDateRef.value)
const parsedAvailableUntil = computed(() => availableUntilRef.value)

const effectiveDeadline = computed(() => {
  const now = currentTime.value
  const due = parsedDueDate.value
  const until = parsedAvailableUntil.value

  if (due && !until) return due
  if (!due && until) return until
  if (due && until) return now < due.getTime() ? due : until
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

// Format time for display
const formattedTime = computed(() => {
  const ms = remainingMs.value
  if (ms === null) return '∞'
  if (ms <= 0) return 'Expired'

  const totalSeconds = Math.floor(ms / 1000)
  const years = Math.floor(totalSeconds / (365 * 24 * 60 * 60))
  const months = Math.floor((totalSeconds % (365 * 24 * 60 * 60)) / (30 * 24 * 60 * 60))
  const days = Math.floor((totalSeconds % (30 * 24 * 60 * 60)) / (24 * 60 * 60))
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60))
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60)
  const seconds = totalSeconds % 60

  if (years >= 1) return `${years}y ${months}mo`
  if (months >= 1) return `${months}mo ${days}d`
  if (days >= 1) return `${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
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

const sanitizedPollInterval = computed(() => Math.max(20000, props.pollIntervalMs ?? 30000))

// Timer update
const updateTimer = () => {
  const previouslyExpired = isExpired.value
  currentTime.value = Date.now()

  if (!previouslyExpired && isExpired.value) {
    emit('timer-expired')
  }
}

// Deadline extension detection
const EXTENSION_THRESHOLD_MS = 1000

const hasDeadlineExtended = (previous: Date | null, next: Date | null) => {
  if (!next) return false
  if (!previous) return true
  return next.getTime() - previous.getTime() > EXTENSION_THRESHOLD_MS
}

// Totem animation
const triggerTotemAnimation = (extendedFields: Array<{ type: 'dueDate' | 'availableUntil'; diffMs: number }>) => {
  const positiveChanges = extendedFields.filter(field => field && typeof field.diffMs === 'number' && field.diffMs > 0)
  if (positiveChanges.length === 0) return

  if (showTotemAnimation.value) {
    if (totemTimeout.value) clearTimeout(totemTimeout.value)
    totemTimeout.value = setTimeout(() => {
      showTotemAnimation.value = false
    }, 2600)
    playTotemSound()
    return
  }

  if (totemTimeout.value) clearTimeout(totemTimeout.value)
  showTotemAnimation.value = true
  playTotemSound()
  totemTimeout.value = setTimeout(() => {
    showTotemAnimation.value = false
  }, 2600)
}

const playTotemSound = () => {
  try {
    if (!totemAudio.value) {
      totemAudio.value = new Audio('/minecraft-totem-sound.mp3')
    }
    totemAudio.value.currentTime = 0
    totemAudio.value.play().catch(error => {
      console.warn('Failed to play totem sound:', error)
    })
  } catch (error) {
    console.warn('Error creating totem audio:', error)
  }
}

// SSE Management
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
  if (reconnectTimeout.value) return
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
  if (!payload || typeof payload !== 'object') return

  const startSource = Object.prototype.hasOwnProperty.call(payload, 'availableFrom')
    ? payload.availableFrom
    : Object.prototype.hasOwnProperty.call(payload, 'createdAt')
      ? payload.createdAt
      : null

  const parsedStart = parseDateInput(startSource ?? null)
  if (parsedStart) startTimeRef.value = parsedStart

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
  if (!props.labId || typeof window === 'undefined' || typeof EventSource === 'undefined') return

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
        console.error('[NavbarTimer SSE] Failed to parse snapshot:', error)
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
            labId: props.labId!,
            labTitle: payload?.labTitle,
            fields: changes.map((change: any) => ({
              type: change.type,
              diffMs: typeof change.diffMs === 'number' ? change.diffMs : 0
            }))
          })
        }
      } catch (error) {
        console.error('[NavbarTimer SSE] Failed to parse update:', error)
      }
    })

    source.onerror = () => {
      teardownEventSource()
      scheduleReconnect()
    }
  } catch (error) {
    console.error('[NavbarTimer SSE] Failed to open stream:', error)
    scheduleReconnect()
  }
}

// Polling fallback
const refreshLabDeadlines = async () => {
  if (!props.labId || isPolling.value) return

  isPolling.value = true

  try {
    const url = new URL(`${runtimeConfig.public.backendurl}/v0/labs/${props.labId}`)
    url.searchParams.set('fields', 'timer')

    const response = await fetch(url.toString(), { credentials: 'include' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const result = await response.json()
    if (!result.success || !result.data) return

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
    console.error('[NavbarTimer] Failed to refresh deadlines:', error)
  } finally {
    isPolling.value = false
  }
}

const startPolling = () => {
  if (pollInterval.value) clearInterval(pollInterval.value)
  if (!props.labId) return

  refreshLabDeadlines()
  pollInterval.value = setInterval(() => {
    refreshLabDeadlines()
  }, sanitizedPollInterval.value)
}

// Watchers for labId changes
watch(() => props.labId, () => {
  hasPolledOnce.value = false
  startPolling()
  setupEventSource()
})

watch(sanitizedPollInterval, () => {
  startPolling()
})

// Lifecycle
onMounted(() => {
  timerInterval.value = setInterval(updateTimer, 100)
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
.navbar-timer-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

.timer-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace;
  cursor: default;
  transition: all 0.2s ease-out;
  user-select: none;
}

.timer-normal {
  background: color-mix(in oklch, var(--muted) 50%, transparent);
  border: 1px solid color-mix(in oklch, var(--border) 80%, transparent);
  color: var(--foreground);
}

.timer-normal:hover {
  background: var(--accent);
  border-color: var(--border);
}

.timer-warning {
  background: color-mix(in oklch, var(--destructive) 10%, transparent);
  border: 1px solid color-mix(in oklch, var(--destructive) 40%, transparent);
  color: var(--destructive);
  animation: warning-glow 1.5s ease-in-out infinite;
}

.timer-expired {
  background: var(--destructive);
  border: 1px solid var(--destructive);
  color: var(--destructive-foreground);
}

.timer-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  display: block;
}

.timer-display {
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.025em;
  white-space: nowrap;
  line-height: 1rem;
  vertical-align: middle;
}

/* Tooltip styles */
.timer-tooltip {
  padding: 0.75rem;
  min-width: 180px;
}

.tooltip-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tooltip-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.tooltip-icon {
  color: var(--muted-foreground);
  flex-shrink: 0;
}

.tooltip-label {
  color: var(--muted-foreground);
  min-width: 2.5rem;
}

.tooltip-value {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.6875rem;
  color: var(--foreground);
  margin-left: auto;
}

.tooltip-badge-row {
  display: flex;
  justify-content: center;
  margin-top: 0.25rem;
  padding-top: 0.5rem;
  border-top: 1px solid color-mix(in oklch, var(--border) 50%, transparent);
}

.tooltip-badge {
  font-size: 0.625rem;
  padding: 0.125rem 0.5rem;
}

/* Warning glow animation */
@keyframes warning-glow {
  0%, 100% {
    box-shadow: 0 0 8px color-mix(in oklch, var(--destructive) 30%, transparent);
  }
  50% {
    box-shadow: 0 0 16px color-mix(in oklch, var(--destructive) 50%, transparent);
  }
}

/* Totem overlay styles */
.totem-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
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
  from { opacity: 0; }
  to { opacity: 1; }
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
  0%, 100% {
    filter: drop-shadow(0 24px 40px rgba(45, 212, 191, 0.35));
  }
  50% {
    filter: drop-shadow(0 32px 60px rgba(56, 189, 248, 0.4));
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .timer-warning {
    animation: none;
  }
  .timer-icon.animate-pulse {
    animation: none;
  }
  .totem-image {
    animation: none;
  }
}
</style>
