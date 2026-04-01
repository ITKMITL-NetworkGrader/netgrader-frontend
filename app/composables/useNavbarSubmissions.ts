/**
 * Composable for sharing submissions URL state between lab page and navbar.
 * Also provides a trigger for the +1 animation on submission.
 */

const submissionsUrl = ref<string | null>(null)
const plusOneTrigger = ref(0)

export function useNavbarSubmissions() {
    const setSubmissionsUrl = (url: string) => {
        submissionsUrl.value = url
    }

    const clearSubmissionsUrl = () => {
        submissionsUrl.value = null
    }

    const triggerPlusOne = () => {
        plusOneTrigger.value++
    }

    return {
        submissionsUrl: readonly(submissionsUrl),
        plusOneTrigger: readonly(plusOneTrigger),
        setSubmissionsUrl,
        clearSubmissionsUrl,
        triggerPlusOne,
    }
}
