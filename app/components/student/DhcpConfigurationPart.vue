<template>
  <Card class="border-2 border-secondary">
    <CardHeader class="bg-gradient-to-r from-secondary/10 to-secondary/5">
      <CardTitle class="flex items-center gap-2">
        <Server class="w-5 h-5 text-secondary" />
        DHCP Configuration
      </CardTitle>
      <p class="text-sm text-muted-foreground mt-2">
        Configure DHCP on your network device and update your IP schema with the assigned addresses.
      </p>
    </CardHeader>

    <CardContent class="space-y-6 pt-6">
      <!-- Lecturer-Defined DHCP Configuration -->
      <div>
        <h3 class="text-sm font-semibold mb-3 flex items-center gap-2">
          <Database class="w-4 h-4" />
          DHCP Configuration Overview
        </h3>
        <Alert class="bg-accent/30 border-accent">
          <Info class="w-4 h-4 text-primary" />
          <AlertTitle>Range Details</AlertTitle>
          <AlertDescription class="mt-3">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-xs text-muted-foreground font-medium">VLAN:</span>
                <div class="font-mono font-semibold mt-1">
                  VLAN {{ dhcpConfig.vlanIndex + 1 }} (Index: {{ dhcpConfig.vlanIndex }})
                </div>
              </div>
              <div>
                <span class="text-xs text-muted-foreground font-medium">DHCP Server Device:</span>
                <div class="font-mono font-semibold mt-1">
                  {{ dhcpConfig.dhcpServerDevice }}
                </div>
              </div>
              <div>
                <span class="text-xs text-muted-foreground font-medium">Start IP:</span>
                <div class="font-mono font-semibold text-primary mt-1">
                  {{ dhcpConfig.startIp }}
                </div>
              </div>
              <div>
                <span class="text-xs text-muted-foreground font-medium">End IP:</span>
                <div class="font-mono font-semibold text-primary mt-1">
                  {{ dhcpConfig.endIp }}
                </div>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>

      <!-- Visual IP Range Display -->
      <div class="border rounded-lg p-4 bg-gradient-to-r from-primary/5 to-primary/10">
        <div class="flex items-center justify-between">
          <div class="text-sm">
            <div class="text-xs text-muted-foreground mb-1">IP Address Range</div>
            <div class="font-mono font-bold text-lg text-primary">
              {{ dhcpConfig.startIp }} → {{ dhcpConfig.endIp }}
            </div>
          </div>
          <Badge variant="secondary" class="text-lg px-4 py-2">
            {{ calculatePoolSize() }} IPs
          </Badge>
        </div>
      </div>

      <!-- Important Steps -->
      <Alert class="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
        <CheckCircle class="w-4 h-4 text-green-600 dark:text-green-400" />
        <AlertTitle class="text-green-800 dark:text-green-300">Important Steps</AlertTitle>
        <AlertDescription class="text-green-700 dark:text-green-400">
          <ol class="list-decimal list-inside space-y-2 text-sm mt-2 ml-1">
            <li class="flex items-start gap-2">
              <span class="flex-shrink-0 mt-1">1.</span>
              <span>Configure DHCP on <code class="bg-green-100 dark:bg-green-900 px-2 py-0.5 rounded font-mono text-xs">{{ dhcpConfig.dhcpServerDevice }}</code> using the IP range above</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="flex-shrink-0 mt-1">2.</span>
              <span>Note the IP addresses assigned to each device by DHCP</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="flex-shrink-0 mt-1">3.</span>
              <span>Update your IPs in the form below with actual DHCP-assigned addresses</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="flex-shrink-0 mt-1">4.</span>
              <span>Submit to update your schema and complete this part</span>
            </li>
          </ol>
        </AlertDescription>
      </Alert>

      <!-- Update IP Schema Form -->
      <div v-if="ipQuestions && ipQuestions.length > 0" class="border-t pt-6 space-y-4">
        <div class="flex items-center gap-2 mb-4">
          <Edit class="w-5 h-5 text-primary" />
          <h3 class="text-lg font-semibold">Update Your IP Addresses</h3>
        </div>

        <p class="text-sm text-muted-foreground mb-4">
          Enter the actual IP addresses assigned by DHCP. Your previous calculated values are shown for reference.
        </p>

        <!-- IP Update Questions -->
        <div class="space-y-4">
          <div
            v-for="(question, index) in ipQuestions"
            :key="question.questionId"
            class="p-4 border rounded-lg space-y-3"
            :class="{
              'border-secondary bg-secondary/10': hasAnswerChanged(question.questionId)
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

            <!-- Show previous answer -->
            <div v-if="previousAnswers[question.questionId]" class="flex items-center gap-2 text-xs text-muted-foreground bg-accent/50 p-2 rounded">
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
                :disabled="hasSubmitted"
                class="font-mono"
                :class="{
                  'border-secondary bg-secondary/10': hasAnswerChanged(question.questionId)
                }"
              />

              <!-- Change Indicator -->
              <div v-if="hasAnswerChanged(question.questionId)" class="text-xs text-secondary-foreground flex items-center gap-1">
                <AlertCircle class="w-3 h-3" />
                Answer changed - will update your IP schema
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- DHCP Range Validation Warning -->
      <Alert variant="destructive" class="border-destructive bg-destructive/10">
        <AlertTriangle class="w-4 h-4" />
        <AlertTitle>DHCP Range Validation</AlertTitle>
        <AlertDescription class="text-sm">
          <strong>Critical:</strong> When updating your IP schema, device IPs <strong>must be within</strong> the
          lecturer-defined IP range:
          <div class="mt-2 p-2 bg-destructive/20 rounded border border-destructive/30">
            <code class="font-mono text-sm">
              {{ dhcpConfig.startIp }} - {{ dhcpConfig.endIp }}
            </code>
          </div>
          <p class="mt-2 text-xs">
            IPs outside this range will fail validation and your submission will not be accepted.
          </p>
        </AlertDescription>
      </Alert>

      <!-- Action Buttons -->
      <div class="flex items-center justify-between pt-4 border-t">
        <div class="text-sm">
          <div v-if="!hasSubmitted" class="flex items-center gap-1 text-muted-foreground">
            <Zap class="w-4 h-4" />
            <span>{{ answeredCount }} / {{ ipQuestions?.length || 0 }} IPs updated</span>
          </div>
          <div v-else class="flex items-center gap-2">
            <CheckCircle class="w-4 h-4 text-green-600" />
            <span class="font-medium text-green-700">DHCP Configuration & IP Schema Updated!</span>
          </div>
        </div>

        <Button
          @click="submitCompletion"
          :disabled="isSubmitting || hasSubmitted || !allAnswered"
          class="min-w-[200px]"
        >
          <Loader2 v-if="isSubmitting" class="w-4 h-4 mr-2 animate-spin" />
          <Send v-else class="w-4 h-4 mr-2" />
          {{ hasSubmitted ? 'Submitted' : 'Update Schema & Submit' }}
        </Button>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import {
  Server,
  Info,
  Database,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Edit,
  Zap,
  Send,
  Loader2,
  History
} from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { DhcpConfiguration, Question } from '@/types/wizard'

interface Props {
  dhcpConfig: DhcpConfiguration
  labId: string
  partId: string
  calculationPartId: string
  ipQuestions?: Question[]  // Questions from IP calculation part
}

const props = defineProps<Props>()
const router = useRouter()
const route = useRoute()

// State
const isSubmitting = ref(false)
const hasSubmitted = ref(false)
const answers = ref<Record<string, string>>({})
const previousAnswers = ref<Record<string, string>>({})

// Computed
const answeredCount = computed(() => {
  return Object.values(answers.value).filter(a => a && a.trim().length > 0).length
})

const allAnswered = computed(() => {
  if (!props.ipQuestions || props.ipQuestions.length === 0) return true
  return answeredCount.value === props.ipQuestions.length
})

const hasAnswerChanged = (questionId: string): boolean => {
  const current = answers.value[questionId]
  const previous = previousAnswers.value[questionId]
  return current !== previous && previous !== undefined
}

// Load existing schema on mount
onMounted(async () => {
  await loadExistingSchema()
})

const loadExistingSchema = async () => {
  try {
    const config = useRuntimeConfig()
    const response = await $fetch(`${config.public.backendurl}/v0/labs/${props.labId}/ip-schema`, {
      credentials: 'include'
    })

    if (response.success && response.data && props.ipQuestions) {
      prefillAnswersFromSchema(response.data)
    }
  } catch (error) {
    console.error('Failed to load existing schema:', error)
    // Not a fatal error, just means no schema exists yet
  }
}

const prefillAnswersFromSchema = (schema: any) => {
  if (!props.ipQuestions) return

  props.ipQuestions.forEach(question => {
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

const submitCompletion = async () => {
  // Validate all questions are answered
  if (props.ipQuestions && props.ipQuestions.length > 0) {
    const unanswered = props.ipQuestions.filter(q => !answers.value[q.questionId] || !answers.value[q.questionId].trim())
    if (unanswered.length > 0) {
      toast.error(`Please answer all IP fields (${unanswered.length} remaining)`)
      return
    }
  }

  isSubmitting.value = true

  try {
    const config = useRuntimeConfig()

    // Step 1: Update IP Schema
    if (props.ipQuestions && props.ipQuestions.length > 0) {
      const schemaResponse = await $fetch(
        `${config.public.backendurl}/v0/labs/${props.labId}/parts/${props.calculationPartId}/submit-answers`,
        {
          method: 'POST',
          credentials: 'include',
          body: {
            answers: props.ipQuestions.map(q => ({
              questionId: q.questionId,
              answer: answers.value[q.questionId]
            })),
            isUpdate: true  // Always update mode in DHCP part
          }
        }
      )

      if (!schemaResponse.success) {
        throw new Error('Failed to update IP schema')
      }
    }

    // Step 2: Mark DHCP part as completed
    const completionResponse = await $fetch(
      `${config.public.backendurl}/v0/labs/${props.labId}/parts/${props.partId}/submit-completion`,
      {
        method: 'POST',
        credentials: 'include',
        body: {
          vlanIndex: props.dhcpConfig.vlanIndex
        }
      }
    )

    if (completionResponse.success) {
      hasSubmitted.value = true
      toast.success('Success!', {
        description: 'IP Schema updated and DHCP configuration completed'
      })
    }
  } catch (error: any) {
    console.error('Failed to submit:', error)
    toast.error('Submission Failed', {
      description: error.data?.message || 'Failed to submit. Please try again.'
    })
  } finally {
    isSubmitting.value = false
  }
}

const getInputType = (format?: string): string => {
  if (format === 'number' || format === 'cidr') return 'number'
  return 'text'
}

const getPlaceholderForType = (type: string): string => {
  const placeholders: Record<string, string> = {
    'network_address': '192.168.1.0',
    'first_usable_ip': '192.168.1.1',
    'last_usable_ip': '192.168.1.254',
    'broadcast_address': '192.168.1.255',
    'subnet_mask': '24',
    'ip_address': '192.168.1.1',
    'number': '0'
  }
  return placeholders[type] || '192.168.1.0'
}

const calculatePoolSize = (): number => {
  const ipToNumber = (ip: string): number => {
    const parts = ip.split('.').map(Number)
    return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
  }

  try {
    const startNum = ipToNumber(props.dhcpConfig.startIp)
    const endNum = ipToNumber(props.dhcpConfig.endIp)
    return Math.max(0, endNum - startNum + 1)
  } catch (error) {
    return 0
  }
}
</script>
