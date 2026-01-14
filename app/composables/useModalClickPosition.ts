/**
 * Composable for tracking click positions to use as modal animation origin.
 * When a modal trigger is clicked, the click coordinates are captured and 
 * converted to CSS custom properties for dynamic transform-origin.
 */

const clickPosition = ref({ x: 0, y: 0 })
const hasPosition = ref(false)

export function useModalClickPosition() {
    /**
     * Capture the click position from an event.
     * Call this in the trigger element's click handler.
     */
    const captureClickPosition = (event: MouseEvent) => {
        clickPosition.value = {
            x: event.clientX,
            y: event.clientY
        }
        hasPosition.value = true
    }

    /**
     * Get CSS custom properties for the modal's transform origin.
     * Returns pixel values relative to viewport.
     */
    const getOriginStyles = computed(() => {
        if (!hasPosition.value) {
            return {
                '--modal-origin-x': '50vw',
                '--modal-origin-y': '50vh'
            }
        }
        return {
            '--modal-origin-x': `${clickPosition.value.x}px`,
            '--modal-origin-y': `${clickPosition.value.y}px`
        }
    })

    /**
     * Reset the position (optional, called after modal closes)
     */
    const resetPosition = () => {
        hasPosition.value = false
    }

    return {
        clickPosition: readonly(clickPosition),
        hasPosition: readonly(hasPosition),
        captureClickPosition,
        getOriginStyles,
        resetPosition
    }
}
