<template>
  <Card class="border-2" :class="{ 'border-primary': !hasSubmitted, 'border-green-500': hasSubmitted && isPassed }">
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        <FileQuestion class="w-5 h-5" />
        {{ cardTitle }}
      </CardTitle>
      <p class="text-sm text-muted-foreground mt-2">
        {{ cardSubtitle }}
      </p>
    </CardHeader>

    <CardContent class="space-y-6">
      <!-- Questions List -->
      <div class="space-y-4">
        <div
          v-for="(question, index) in questions"
          :key="question.questionId"
          class="p-4 border rounded-lg space-y-3 transition-all"
          :class="{
            'border-green-500 bg-green-50 dark:bg-green-950': results[question.questionId]?.isCorrect,
            'border-destructive bg-destructive/5': hasSubmitted && !results[question.questionId]?.isCorrect,
            'border-secondary bg-secondary/10': isUpdateMode && hasAnswerChanged(question.questionId)
          }"
        >
          <!-- Question Label -->
          <div class="flex items-start justify-between">
            <label class="text-sm font-medium flex-1">
              <span class="flex items-center gap-2">
                <span class="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {{ index + 1 }}
                </span>
                {{ question.questionText }}
              </span>
            </label>
            <Badge variant="outline" class="ml-2">
              {{ question.questionType === 'ip_table_questionnaire' ? ipTablePoints(question) : question.points }} pts
            </Badge>
          </div>

          <!-- IP Table Questionnaire Component -->
          <div v-if="question.questionType === 'ip_table_questionnaire' && question.ipTableQuestionnaire">
            <IpTableQuestionnaire
              :ref="el => setIpTableRef(question.questionId, el)"
              :tableData="question.ipTableQuestionnaire"
              v-model="ipTableAnswers[question.questionId]"
              :readonly="hasSubmitted && !isUpdateMode"
            />
          </div>

          <!-- Regular Question Input -->
          <template v-else>
            <!-- Show previous answer if in update mode -->
            <div v-if="isUpdateMode && previousAnswers[question.questionId]" class="flex items-center gap-2 text-xs text-muted-foreground bg-accent/50 p-2 rounded">
              <History class="w-4 h-4 flex-shrink-0" />
              <span class="font-medium">Previous:</span>
              <code class="bg-muted px-2 py-1 rounded font-mono">{{ previousAnswers[question.questionId] }}</code>
            </div>

            <!-- Input Field -->
            <div class="space-y-2">
              <Input
                v-model="answers[question.questionId]"
                :type="getInputType(question.inputFormat)"
                :placeholder="question.placeholder || getPlaceholderForType(question.questionType)"
                :disabled="hasSubmitted && !isUpdateMode"
                class="font-mono"
                :class="{
                  'border-green-500 bg-green-50 dark:bg-green-950': results[question.questionId]?.isCorrect,
                  'border-destructive': hasSubmitted && !results[question.questionId]?.isCorrect,
                  'border-secondary bg-secondary/10': isUpdateMode && hasAnswerChanged(question.questionId)
                }"
              />

              <!-- Result Feedback -->
              <div v-if="hasSubmitted && results[question.questionId]" class="flex items-center justify-between text-xs">
                <div class="flex items-center gap-2">
                  <CheckCircle v-if="results[question.questionId].isCorrect" class="w-4 h-4 text-green-600" />
                  <XCircle v-else class="w-4 h-4 text-destructive" />
                  <span :class="results[question.questionId].isCorrect ? 'text-green-700 font-medium' : 'text-destructive font-medium'">
                    {{ results[question.questionId].isCorrect ? 'Correct' : 'Incorrect' }}
                  </span>
                </div>
                <span class="font-medium">
                  {{ results[question.questionId].pointsEarned }} / {{ question.points }} pts
                </span>
              </div>

              <!-- Change Indicator -->
              <div
                v-if="isUpdateMode && hasAnswerChanged(question.questionId)"
                class="text-xs text-secondary-foreground flex items-center gap-1"
              >
                <AlertCircle class="w-3 h-3" />
                {{ isNetworkingQuestion(question.questionId)
                  ? 'Answer changed - will update your IP schema'
                  : 'Answer changed - your previous response will be replaced' }}
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- DHCP Pool Validation Warning -->
      <Alert v-if="dhcpPoolValidation && hasNetworkingQuestions" class="border-secondary bg-secondary/10">
        <AlertTriangle class="w-4 h-4 text-secondary-foreground" />
        <AlertTitle>DHCP Pool Validation</AlertTitle>
        <AlertDescription class="text-sm">
          Device IP addresses must be within the lecturer-defined DHCP pool:
          <code class="bg-secondary/20 px-2 py-1 rounded font-mono text-xs ml-1">
            {{ dhcpPoolValidation.startIp }} - {{ dhcpPoolValidation.endIp }}
          </code>
        </AlertDescription>
      </Alert>

      <!-- Submit Button -->
      <div
        class="flex items-center pt-4 border-t"
        :class="showSubmitButton ? 'justify-between' : 'justify-start'"
      >
        <div v-if="hasSubmitted" class="text-sm">
          <div class="font-semibold flex items-center gap-2">
            <Trophy class="w-5 h-5 text-secondary-foreground" />
            Total Score: {{ totalPointsEarned }} / {{ totalPoints }} pts
            <Badge :variant="isPassed ? 'default' : 'destructive'" class="ml-2">
              {{ isPassed ? 'Passed' : 'Not Passed' }}
            </Badge>
          </div>
          <p v-if="isPassed && successFooterMessage" class="text-xs text-muted-foreground mt-1">
            {{ successFooterMessage }}
          </p>
        </div>
        <div v-else class="text-sm text-muted-foreground">
          {{ answeredCount }} / {{ questions.length }} questions answered
        </div>

        <Button
          v-if="showSubmitButton"
          @click="submitAnswers"
          :disabled="isSubmitting || (hasSubmitted && isPassed && !isUpdateMode)"
          class="min-w-[150px]"
          :variant="isUpdateMode ? 'default' : 'default'"
        >
          <Loader2 v-if="isSubmitting" class="w-4 h-4 mr-2 animate-spin" />
          <Send v-else class="w-4 h-4 mr-2" />
          {{ submitButtonLabel }}
        </Button>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import { useLocalStorage } from '@vueuse/core'
import type { UseStorageOptions } from '@vueuse/core'
import {
  FileQuestion,
  CheckCircle,
  XCircle,
  Send,
  Loader2,
  History,
  AlertCircle,
  AlertTriangle,
  Trophy
} from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import IpTableQuestionnaire from '@/components/student/IpTableQuestionnaire.vue'
import type { Question } from '@/types/wizard'
import { useUserState } from '~/composables/states'

const LOCAL_STORAGE_PREFIX = 'fillin:'
const SESSION_MARKER_KEY = `${LOCAL_STORAGE_PREFIX}session-active`

interface AnswerResult {
  questionId: string
  isCorrect: boolean
  pointsEarned: number
}

interface FillInBlankSubmissionResult {
  results: AnswerResult[]
  totalPointsEarned: number
  totalPoints: number
  passed: boolean
  submission?: {
    id?: string
    attempt?: number
    status?: string
    submittedAt?: string
  }
}

interface DhcpPoolValidation {
  startIp: string
  endIp: string
}

interface FillInBlankStoragePayload {
  answers: Record<string, string>
  ipTableAnswers: Record<string, string[][]>
  timestamp: number
}

interface Props {
  questions: Question[]
  labId: string
  partId: string
  dhcpPoolValidation?: DhcpPoolValidation
  showSubmitButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showSubmitButton: true
})
const route = useRoute()
const userState = useUserState()
const emit = defineEmits<{
  submitted: [FillInBlankSubmissionResult]
}>()

// State
const answers = ref<Record<string, string>>({})
const previousAnswers = ref<Record<string, string>>({})
const ipTableAnswers = ref<Record<string, string[][]>>({})
const ipTableRefs = ref<Record<string, any>>({})
const results = ref<Record<string, AnswerResult>>({})
const isSubmitting = ref(false)
const hasSubmitted = ref(false)
const isRestoringFromStorage = ref(false)

const resolvedUserId = computed(() => userState.value?.u_id || null)

const buildStorageKey = (identifier: string) =>
  `${LOCAL_STORAGE_PREFIX}${identifier}:${props.labId}:${props.partId}`

const primaryStorageKey = computed(() =>
  resolvedUserId.value ? buildStorageKey(resolvedUserId.value) : null
)

const fallbackStorageKey = computed(() => buildStorageKey('anonymous'))
const storageKey = computed(() => primaryStorageKey.value ?? fallbackStorageKey.value)

const storageOptions: UseStorageOptions<FillInBlankStoragePayload | null> = {
  listenToStorageChanges: true,
  writeDefaults: false,
  serializer: {
    read: (value: string) => {
      if (!value) return null
      try {
        return JSON.parse(value) as FillInBlankStoragePayload
      } catch (error) {
        console.warn('Failed to parse saved answers from local storage:', error)
        return null
      }
    },
    write: (value: FillInBlankStoragePayload | null) => (value ? JSON.stringify(value) : '')
  }
}

const storedPayload = useLocalStorage<FillInBlankStoragePayload | null>(storageKey, null, storageOptions)

// Initialize IP table answers for all IP table questions
const initializeIpTableAnswers = () => {
  props.questions.forEach(question => {
    if (question.questionType === 'ip_table_questionnaire' && question.ipTableQuestionnaire) {
      if (!ipTableAnswers.value[question.questionId]) {
        const rowCount = question.ipTableQuestionnaire.rowCount
        const columnCount = question.ipTableQuestionnaire.columnCount
        ipTableAnswers.value[question.questionId] = Array(rowCount)
          .fill(null)
          .map(() => Array(columnCount).fill(''))
      }
    }
  })
}

const restoreAnswersFromStorage = (payload: FillInBlankStoragePayload | null = storedPayload.value) => {
  if (typeof window === 'undefined') return
  if (!payload) return

  isRestoringFromStorage.value = true

  const nextAnswers: Record<string, string> = {}

  if (payload.answers && typeof payload.answers === 'object') {
    Object.entries(payload.answers).forEach(([questionId, value]) => {
      if (typeof value === 'string') {
        nextAnswers[questionId] = value
      }
    })
  }

  answers.value = nextAnswers

  if (payload.ipTableAnswers && typeof payload.ipTableAnswers === 'object') {
    const nextIpTableAnswers: Record<string, string[][]> = {}

    Object.entries(payload.ipTableAnswers).forEach(([questionId, value]) => {
      if (Array.isArray(value)) {
        nextIpTableAnswers[questionId] = JSON.parse(JSON.stringify(value)) as string[][]
      }
    })

    ipTableAnswers.value = nextIpTableAnswers
  } else {
    ipTableAnswers.value = {}
  }

  requestAnimationFrame(() => {
    isRestoringFromStorage.value = false

    initializeIpTableAnswers()

    if (primaryStorageKey.value && primaryStorageKey.value !== fallbackStorageKey.value) {
      try {
        window.localStorage.removeItem(fallbackStorageKey.value)
      } catch {
        /* no-op */
      }
    }
  })
}

watch(storedPayload, payload => {
  if (typeof window === 'undefined') return

  if (payload) {
    restoreAnswersFromStorage(payload)
  } else {
    isRestoringFromStorage.value = true
    answers.value = {}
    ipTableAnswers.value = {}
    requestAnimationFrame(() => {
      initializeIpTableAnswers()
      isRestoringFromStorage.value = false
    })
  }
}, { immediate: true })

const persistAnswersToStorage = () => {
  if (typeof window === 'undefined') return
  if (isRestoringFromStorage.value) return

  if (hasSubmitted.value && isPassed.value) {
    clearStoredAnswers()
    return
  }

  const payload = {
    answers: JSON.parse(JSON.stringify(answers.value)),
    ipTableAnswers: JSON.parse(JSON.stringify(ipTableAnswers.value)),
    timestamp: Date.now()
  }

  try {
    storedPayload.value = payload
  } catch (error) {
    console.warn('Failed to persist answers to local storage:', error)
  }

  if (primaryStorageKey.value && primaryStorageKey.value !== fallbackStorageKey.value) {
    try {
      window.localStorage.removeItem(fallbackStorageKey.value)
    } catch {
      /* no-op */
    }
  }
}

const clearStoredAnswers = () => {
  if (typeof window === 'undefined') return

  storedPayload.value = null
  if (typeof storedPayload.remove === 'function') {
    storedPayload.remove()
  }

  const keysToClear = [primaryStorageKey.value, fallbackStorageKey.value].filter(Boolean) as string[]
  keysToClear.forEach(key => {
    try {
      window.localStorage.removeItem(key)
    } catch {
      /* no-op */
    }
  })
}

const ensureSessionMarker = () => {
  if (typeof window === 'undefined') return

  const markerExists = window.sessionStorage.getItem(SESSION_MARKER_KEY)

  if (!markerExists) {
    const keysToRemove: string[] = []
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (key && key.startsWith(LOCAL_STORAGE_PREFIX)) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach(key => {
      try {
        window.localStorage.removeItem(key)
      } catch {
        /* no-op */
      }
    })

    clearStoredAnswers()
  }

  window.sessionStorage.setItem(SESSION_MARKER_KEY, 'active')
}

// Check if in update mode
const isUpdateMode = computed(() => route.query.mode === 'update')

const hasNetworkingQuestions = computed(() =>
  props.questions.some(question => Boolean(question.schemaMapping))
)

const questionCount = computed(() => props.questions.length)

const cardTitle = computed(() => {
  if (isUpdateMode.value) {
    return hasNetworkingQuestions.value ? 'Update Your IP Schema' : 'Update Your Answers'
  }

  if (questionCount.value > 1) {
    return hasNetworkingQuestions.value ? 'Answer the Following Questions' : 'Answer the Questions'
  }

  return hasNetworkingQuestions.value ? 'Answer the Question' : 'Answer the Question'
})

const cardSubtitle = computed(() => {
  if (isUpdateMode.value) {
    return hasNetworkingQuestions.value
      ? 'Update your IP addresses to reflect actual DHCP assignments or manual changes. Your previous answers are pre-filled below.'
      : 'Review and update your previous answers. Your last responses appear below when available.'
  }

  return hasNetworkingQuestions.value
    ? 'Calculate and enter your IP addresses based on the instructions provided.'
    : questionCount.value > 1
      ? 'Provide your answers for each question below.'
      : 'Provide your answer in the field below.'
})

// Calculate total points
const totalPoints = computed(() => {
  return props.questions.reduce((sum, q) => sum + q.points, 0)
})

const totalPointsEarned = computed(() => {
  return Object.values(results.value).reduce((sum, r) => sum + r.pointsEarned, 0)
})

const isPassed = computed(() => {
  return hasSubmitted.value && totalPointsEarned.value === totalPoints.value
})

const answeredCount = computed(() => {
  return Object.values(answers.value).filter(a => a && a.trim().length > 0).length
})

const submitButtonLabel = computed(() => {
  if (isUpdateMode.value) {
    return hasNetworkingQuestions.value ? 'Update Schema' : 'Submit Answers'
  }
  return 'Submit Answers'
})

const successToastTitle = computed(() => {
  if (hasNetworkingQuestions.value) {
    return isUpdateMode.value ? 'IP Schema Updated!' : 'IP Schema Created!'
  }
  return isUpdateMode.value ? 'Answers Updated!' : 'Answers Submitted!'
})

const successFooterMessage = computed(() => {
  if (!isPassed.value) return ''

  if (hasNetworkingQuestions.value) {
    return `✅ Your IP schema has been ${isUpdateMode.value ? 'updated' : 'created'} successfully!`
  }

  return `✅ Your answers have been ${isUpdateMode.value ? 'updated' : 'submitted'} successfully!`
})

// Check if answer has changed from previous
const hasAnswerChanged = (questionId: string): boolean => {
  if (!isUpdateMode.value) return false
  const current = answers.value[questionId]
  const previous = previousAnswers.value[questionId]
  return current !== previous && previous !== undefined
}

const isNetworkingQuestion = (questionId: string): boolean => {
  return !!props.questions.find(question => question.questionId === questionId)?.schemaMapping
}

// Get input type based on format
const getInputType = (format?: string): string => {
  if (format === 'number' || format === 'cidr') return 'number'
  return 'text'
}

// Get placeholder based on question type
const getPlaceholderForType = (type: string): string => {
  const placeholders: Record<string, string> = {
    'network_address': '192.168.1.0',
    'first_usable_ip': '192.168.1.1',
    'last_usable_ip': '192.168.1.254',
    'broadcast_address': '192.168.1.255',
    'subnet_mask': '24',
    'ip_address': '192.168.1.1',
    'number': '0',
    'custom_text': 'Type your answer here'
  }
  return placeholders[type] || 'Type your answer here'
}

// Calculate total points for IP table questionnaire
const ipTablePoints = (question: Question): number => {
  if (!question.ipTableQuestionnaire) return question.points

  let totalPoints = 0
  question.ipTableQuestionnaire.cells.forEach(row => {
    row.forEach(cell => {
      const cellType = cell.cellType ?? 'input'
      if (cellType === 'input') {
        totalPoints += cell.points || 0
      }
    })
  })

  return totalPoints
}

// Set IP table component ref
const setIpTableRef = (questionId: string, el: any) => {
  if (el) {
    ipTableRefs.value[questionId] = el
  }
}

// Load existing schema if in update mode
onMounted(async () => {
  ensureSessionMarker()

  // Initialize IP table answers first
  initializeIpTableAnswers()

  // Restore any saved answers from local storage before fetching backend data
  restoreAnswersFromStorage()

  if (isUpdateMode.value) {
    await loadExistingSchema()

    // Ensure locally saved answers take precedence after schema load
    restoreAnswersFromStorage()
  }
})

watch(resolvedUserId, (newId, oldId) => {
  if (typeof window === 'undefined') return

  if (newId && newId !== oldId) {
    if (storedPayload.value) {
      persistAnswersToStorage()
    }
    if (primaryStorageKey.value && primaryStorageKey.value !== fallbackStorageKey.value) {
      try {
        window.localStorage.removeItem(fallbackStorageKey.value)
      } catch {
        /* no-op */
      }
    }
  } else if (!newId && oldId) {
    const previousKey = buildStorageKey(oldId)
    try {
      window.localStorage.removeItem(previousKey)
    } catch {
      /* no-op */
    }
    clearStoredAnswers()
  }
})

const loadExistingSchema = async () => {
  try {
    const config = useRuntimeConfig()
    const response = await $fetch(`${config.public.backendurl}/v0/labs/${props.labId}/ip-schema`, {
      credentials: 'include'
    })

    if (response.success && response.data) {
      prefillAnswersFromSchema(response.data)
    }
  } catch (error) {
    console.error('Failed to load existing schema:', error)
    toast.error('Failed to load your existing IP schema')
  }
}

const prefillAnswersFromSchema = (schema: any) => {
  props.questions.forEach(question => {
    if (question.schemaMapping) {
      const { vlanIndex, field, deviceId, variableName } = question.schemaMapping

      if (vlanIndex !== undefined && schema.schema?.vlans) {
        const vlan = schema.schema.vlans.find((v: any) => v.vlanIndex === vlanIndex)
        if (vlan && vlan[field]) {
          answers.value[question.questionId] = vlan[field].toString()
          previousAnswers.value[question.questionId] = vlan[field].toString()
        }
      } else if (deviceId && variableName && schema.schema?.devices) {
        const device = schema.schema.devices.find((d: any) => d.deviceId === deviceId)
        if (device) {
          const iface = device.interfaces.find((i: any) => i.variableName === variableName)
          if (iface) {
            answers.value[question.questionId] = iface.ipAddress
            previousAnswers.value[question.questionId] = iface.ipAddress
          }
        }
      }
    }
  })
}

const submitAnswers = async (): Promise<FillInBlankSubmissionResult | null> => {
  // Validate all regular questions are answered
  const unansweredRegular = props.questions.filter(q => {
    if (q.questionType === 'ip_table_questionnaire') return false
    return !answers.value[q.questionId] || !answers.value[q.questionId].trim()
  })

  if (unansweredRegular.length > 0) {
    toast.error(`Please answer all questions (${unansweredRegular.length} remaining)`)
    return null
  }

  // Validate IP table questionnaires
  let ipTableValidationFailed = false
  for (const question of props.questions) {
    if (question.questionType === 'ip_table_questionnaire') {
      const ipTableRef = ipTableRefs.value[question.questionId]
      if (ipTableRef && typeof ipTableRef.validate === 'function') {
        const isValid = ipTableRef.validate()
        if (!isValid) {
          ipTableValidationFailed = true
          toast.error('IP Table Validation Failed', {
            description: 'Please check all IP addresses in the table and fix any errors.'
          })
          break
        }
      }
    }
  }

  if (ipTableValidationFailed) return null

  isSubmitting.value = true

  try {
    const config = useRuntimeConfig()

    // Build payload with both regular and IP table answers
    const payload = {
      answers: props.questions.map(q => {
        if (q.questionType === 'ip_table_questionnaire') {
          return {
            questionId: q.questionId,
            answer: null,
            ipTableAnswers: ipTableAnswers.value[q.questionId] || []
          }
        }
        return {
          questionId: q.questionId,
          answer: answers.value[q.questionId]
        }
      }),
      isUpdate: isUpdateMode.value
    }

    const response = await $fetch(
      `${config.public.backendurl}/v0/parts/submit-answers`,
      {
        method: 'POST',
        credentials: 'include',
        body: {
          ...payload,
          labId: props.labId,
          partId: props.partId
        }
      }
    )

    if (response.success) {
      hasSubmitted.value = true

      // Process results
      if (response.data.results) {
        response.data.results.forEach((result: AnswerResult) => {
          results.value[result.questionId] = result
        })
      }

      const submissionInfo = response.submission
        ? {
            id: response.submission.id,
            attempt: response.submission.attempt,
            status: response.submission.status,
            submittedAt: response.submission.submittedAt
          }
        : undefined

      const submissionResult: FillInBlankSubmissionResult = {
        results: response.data.results || [],
        totalPointsEarned: response.data.totalPointsEarned,
        totalPoints: response.data.totalPoints,
        passed: response.data.passed,
        submission: submissionInfo
      }

      // Show success message
      if (response.data.passed) {
        toast.success(successToastTitle.value, {
          description: `You earned ${response.data.totalPointsEarned} out of ${response.data.totalPoints} points`
        })
        clearStoredAnswers()
      } else {
        toast.error('Submission Failed', {
          description: response.data.message || 'Some answers were incorrect or validation failed'
        })
      }

      emit('submitted', submissionResult)
      return submissionResult
    } else {
      toast.error('Submission Failed', {
        description: response.message || 'Failed to submit your answers. Please try again.'
      })
    }
  } catch (error: any) {
    console.error('Failed to submit answers:', error)
    toast.error('Submission Failed', {
      description: error.data?.message || 'Failed to submit your answers. Please try again.'
    })
  } finally {
    isSubmitting.value = false
  }

  return null
}

watch(answers, persistAnswersToStorage, { deep: true })
watch(ipTableAnswers, persistAnswersToStorage, { deep: true })

defineExpose({
  submitAnswers,
  isSubmitting,
  hasSubmitted,
  isPassed,
  totalPoints,
  totalPointsEarned
})
</script>

<style scoped>
/* Smooth transitions for input states */
input {
  transition: all 0.2s ease-in-out;
}
</style>
