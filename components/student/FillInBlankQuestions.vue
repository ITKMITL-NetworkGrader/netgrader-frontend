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
              {{ question.points }} pts
            </Badge>
          </div>

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
      <div class="flex items-center justify-between pt-4 border-t">
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
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
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
import type { Question } from '@/types/wizard'

interface AnswerResult {
  questionId: string
  isCorrect: boolean
  pointsEarned: number
}

interface DhcpPoolValidation {
  startIp: string
  endIp: string
}

interface Props {
  questions: Question[]
  labId: string
  partId: string
  dhcpPoolValidation?: DhcpPoolValidation
}

const props = defineProps<Props>()
const route = useRoute()

// State
const answers = ref<Record<string, string>>({})
const previousAnswers = ref<Record<string, string>>({})
const results = ref<Record<string, AnswerResult>>({})
const isSubmitting = ref(false)
const hasSubmitted = ref(false)

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

// Load existing schema if in update mode
onMounted(async () => {
  if (isUpdateMode.value) {
    await loadExistingSchema()
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

const submitAnswers = async () => {
  // Validate all questions are answered
  const unanswered = props.questions.filter(q => !answers.value[q.questionId] || !answers.value[q.questionId].trim())
  if (unanswered.length > 0) {
    toast.error(`Please answer all questions (${unanswered.length} remaining)`)
    return
  }

  isSubmitting.value = true

  try {
    const config = useRuntimeConfig()
    const payload = {
      answers: props.questions.map(q => ({
        questionId: q.questionId,
        answer: answers.value[q.questionId]
      })),
      isUpdate: isUpdateMode.value
    }

    const response = await $fetch(
      `${config.public.backendurl}/v0/labs/${props.labId}/parts/${props.partId}/submit-answers`,
      {
        method: 'POST',
        credentials: 'include',
        body: payload
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

      // Show success message
      if (response.data.passed) {
        toast.success(successToastTitle.value, {
          description: `You earned ${response.data.totalPointsEarned} out of ${response.data.totalPoints} points`
        })
      } else {
        toast.error('Submission Failed', {
          description: response.data.message || 'Some answers were incorrect or validation failed'
        })
      }
    }
  } catch (error: any) {
    console.error('Failed to submit answers:', error)
    toast.error('Submission Failed', {
      description: error.data?.message || 'Failed to submit your answers. Please try again.'
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
/* Smooth transitions for input states */
input {
  transition: all 0.2s ease-in-out;
}
</style>
