/**
 * Composable for sharing timer state between lab page and navbar
 */
interface TimerState {
    isActive: boolean
    availableFrom?: Date | string | null
    dueDate?: Date | string | null
    availableUntil?: Date | string | null
    labId?: string
    createdAt?: Date | string | null
    pollIntervalMs?: number
}

const timerState = ref<TimerState>({
    isActive: false
})

export function useNavbarTimer() {
    const setTimer = (config: Omit<TimerState, 'isActive'>) => {
        timerState.value = {
            isActive: true,
            ...config
        }
    }

    const clearTimer = () => {
        timerState.value = { isActive: false }
    }

    return {
        timerState: readonly(timerState),
        setTimer,
        clearTimer
    }
}

// Event emitter for timer events
const timerEvents = ref<{
    onTimerExpired?: () => void
    onDeadlineExtended?: (payload: any) => void
}>({})

export function useNavbarTimerEvents() {
    const setEventHandlers = (handlers: {
        onTimerExpired?: () => void
        onDeadlineExtended?: (payload: any) => void
    }) => {
        timerEvents.value = handlers
    }

    const clearEventHandlers = () => {
        timerEvents.value = {}
    }

    const emitTimerExpired = () => {
        timerEvents.value.onTimerExpired?.()
    }

    const emitDeadlineExtended = (payload: any) => {
        timerEvents.value.onDeadlineExtended?.(payload)
    }

    return {
        timerEvents: readonly(timerEvents),
        setEventHandlers,
        clearEventHandlers,
        emitTimerExpired,
        emitDeadlineExtended
    }
}
