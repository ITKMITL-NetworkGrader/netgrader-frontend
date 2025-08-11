<template>
  <div class="border-t border-border bg-card">
    <div class="p-6">
      <!-- Grading Status Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h3 class="text-lg font-semibold flex items-center">
            <Icon :name="statusIcon" class="w-5 h-5 mr-2" :class="statusIconClass" />
            {{ statusTitle }}
          </h3>
          <p class="text-sm text-muted-foreground">
            {{ statusDescription }}
          </p>
        </div>

        <!-- Score Display (if graded) -->
        <div v-if="status === 'graded' && score !== null" class="text-right">
          <div class="text-2xl font-bold" :class="scoreColorClass">
            {{ score }}/{{ maxScore }}
          </div>
          <div class="text-sm text-muted-foreground">
            {{ Math.round((score / maxScore) * 100) }}%
          </div>
        </div>
      </div>

      <!-- Status-based Content -->
      <div class="space-y-6">
        <!-- Not Submitted State -->
        <div v-if="status === 'not_submitted'">
          <Card class="border-primary/20 bg-primary/5">
            <CardContent class="p-6">
              <div class="flex items-start space-x-4">
                <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon name="lucide:play-circle" class="w-6 h-6 text-primary" />
                </div>
                <div class="flex-1">
                  <h4 class="font-semibold mb-2">Ready for Grading</h4>
                  <p class="text-sm text-muted-foreground mb-4">
                    Complete the network configuration as instructed, then click "Start Grading" 
                    to run automated tests on your setup.
                  </p>
                  
                  <!-- Pre-grading Checklist -->
                  <div class="space-y-2 mb-4">
                    <h5 class="font-medium text-sm">Before you start:</h5>
                    <ul class="text-sm space-y-1">
                      <li class="flex items-center space-x-2">
                        <Icon name="lucide:check" class="w-4 h-4 text-green-500" />
                        <span>All devices are configured with assigned IP addresses</span>
                      </li>
                      <li class="flex items-center space-x-2">
                        <Icon name="lucide:check" class="w-4 h-4 text-green-500" />
                        <span>Network connectivity is established</span>
                      </li>
                      <li class="flex items-center space-x-2">
                        <Icon name="lucide:check" class="w-4 h-4 text-green-500" />
                        <span>Required services are running</span>
                      </li>
                    </ul>
                  </div>

                  <div class="flex items-center space-x-3">
                    <Button 
                      :disabled="!canSubmit || isSubmitting" 
                      size="lg"
                      class="px-6"
                      @click="startGrading"
                    >
                      <Icon v-if="isSubmitting" name="lucide:loader-2" class="w-4 h-4 mr-2 animate-spin" />
                      <Icon v-else name="lucide:play" class="w-4 h-4 mr-2" />
                      {{ isSubmitting ? 'Starting...' : 'Start Grading' }}
                    </Button>

                    <Button variant="outline" size="lg" @click="showPreview = true">
                      <Icon name="lucide:eye" class="w-4 h-4 mr-2" />
                      Preview Tests
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- Grading in Progress -->
        <div v-else-if="status === 'grading'">
          <Card class="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
            <CardContent class="p-6">
              <div class="flex items-start space-x-4">
                <div class="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                  <Icon name="lucide:loader-2" class="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
                </div>
                <div class="flex-1">
                  <h4 class="font-semibold mb-2 text-blue-900 dark:text-blue-100">Grading in Progress</h4>
                  <p class="text-sm text-blue-700 dark:text-blue-300 mb-4">
                    Automated tests are running on your network configuration. This may take a few minutes.
                  </p>

                  <!-- Progress Indicator -->
                  <div class="space-y-3">
                    <div class="flex items-center justify-between text-sm">
                      <span>Progress</span>
                      <span>{{ gradingProgress }}%</span>
                    </div>
                    <Progress :value="gradingProgress" class="h-2" />
                  </div>

                  <!-- Live Status Updates -->
                  <div v-if="liveUpdates.length > 0" class="mt-4 space-y-2">
                    <h5 class="font-medium text-sm">Status Updates:</h5>
                    <div class="max-h-32 overflow-y-auto space-y-1">
                      <div 
                        v-for="update in liveUpdates" 
                        :key="update.timestamp"
                        class="text-xs bg-white dark:bg-gray-800 p-2 rounded border flex items-center space-x-2"
                      >
                        <Icon name="lucide:clock" class="w-3 h-3 text-muted-foreground" />
                        <span class="text-muted-foreground">{{ formatTime(update.timestamp) }}</span>
                        <span>{{ update.message }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- Graded State -->
        <div v-else-if="status === 'graded'">
          <Card class="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
            <CardContent class="p-6">
              <div class="flex items-start justify-between mb-4">
                <div class="flex items-center space-x-3">
                  <div class="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <Icon name="lucide:check-circle" class="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 class="font-semibold text-green-900 dark:text-green-100">Grading Complete</h4>
                    <p class="text-sm text-green-700 dark:text-green-300">
                      Your work has been successfully graded
                    </p>
                  </div>
                </div>

                <!-- Score Badge -->
                <Badge :variant="getScoreBadgeVariant(score!, maxScore!)" class="text-lg px-3 py-1">
                  {{ score }}/{{ maxScore }}
                </Badge>
              </div>

              <!-- Results Button -->
              <Button class="w-full" @click="showResults = true">
                <Icon name="lucide:clipboard-list" class="w-4 h-4 mr-2" />
                View Detailed Results
              </Button>
            </CardContent>
          </Card>
        </div>

        <!-- Error State -->
        <div v-else-if="status === 'error'">
          <Card class="border-destructive/20 bg-destructive/5">
            <CardContent class="p-6">
              <div class="flex items-start space-x-4">
                <div class="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <Icon name="lucide:alert-circle" class="w-6 h-6 text-destructive" />
                </div>
                <div class="flex-1">
                  <h4 class="font-semibold mb-2">Grading Error</h4>
                  <p class="text-sm text-muted-foreground mb-4">
                    There was an issue with the automated grading system. Please try again or contact your instructor.
                  </p>
                  
                  <div class="flex items-center space-x-3">
                    <Button variant="outline" @click="startGrading">
                      <Icon name="lucide:refresh-cw" class="w-4 h-4 mr-2" />
                      Retry Grading
                    </Button>
                    
                    <Button variant="outline" @click="reportIssue">
                      <Icon name="lucide:bug" class="w-4 h-4 mr-2" />
                      Report Issue
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <!-- Additional Information -->
      <div v-if="additionalInfo" class="mt-6 pt-6 border-t border-border">
        <div class="text-sm text-muted-foreground space-y-1">
          <div v-if="submittedAt">
            <strong>Submitted:</strong> {{ formatDateTime(submittedAt) }}
          </div>
          <div v-if="gradedAt">
            <strong>Graded:</strong> {{ formatDateTime(gradedAt) }}
          </div>
          <div v-if="gradingDuration">
            <strong>Grading Duration:</strong> {{ gradingDuration }}
          </div>
        </div>
      </div>
    </div>

    <!-- Test Preview Modal -->
    <Dialog v-model:open="showPreview">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Grading Preview</DialogTitle>
          <DialogDescription>
            Overview of tests that will be run on your network configuration
          </DialogDescription>
        </DialogHeader>
        
        <div class="space-y-4 max-h-96 overflow-y-auto">
          <div v-for="test in previewTests" :key="test.name" class="border rounded-lg p-4">
            <div class="flex items-start justify-between mb-2">
              <h4 class="font-medium">{{ test.name }}</h4>
              <Badge variant="outline">{{ test.points }} pts</Badge>
            </div>
            <p class="text-sm text-muted-foreground mb-3">{{ test.description }}</p>
            <div class="space-y-1">
              <div v-for="testCase in test.testCases" :key="testCase" class="text-xs bg-muted px-2 py-1 rounded">
                {{ testCase }}
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" @click="showPreview = false">
            Close
          </Button>
          <Button @click="showPreview = false; startGrading()">
            Start Grading
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Results Modal -->
    <ResultsViewer
      v-model:open="showResults"
      :results="detailedResults"
      :total-score="score"
      :max-score="maxScore"
    />
  </div>
</template>

<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'vue-sonner'
import ResultsViewer from './ResultsViewer.vue'

// Props
interface Props {
  status: 'not_submitted' | 'grading' | 'graded' | 'error'
  canSubmit?: boolean
  score?: number | null
  maxScore?: number | null
  gradingProgress?: number
  submittedAt?: Date
  gradedAt?: Date
  isSubmitting?: boolean
  previewTests?: Array<{
    name: string
    description: string
    points: number
    testCases: string[]
  }>
  detailedResults?: Array<{
    taskName: string
    passed: boolean
    score: number
    maxScore: number
    feedback: string
    details: string[]
  }>
}

const props = withDefaults(defineProps<Props>(), {
  canSubmit: true,
  score: null,
  maxScore: null,
  gradingProgress: 0,
  isSubmitting: false,
  previewTests: () => [],
  detailedResults: () => []
})

// Emits
const emit = defineEmits<{
  'start:grading': []
  'report:issue': []
}>()

// Reactive state
const showPreview = ref(false)
const showResults = ref(false)
const liveUpdates = ref<Array<{ timestamp: Date; message: string }>>([
  { timestamp: new Date(), message: 'Initializing grading environment...' },
  { timestamp: new Date(), message: 'Testing network connectivity...' },
  { timestamp: new Date(), message: 'Running automated tests...' }
])

// Computed
const statusIcon = computed(() => {
  switch (props.status) {
    case 'not_submitted':
      return 'lucide:play-circle'
    case 'grading':
      return 'lucide:loader-2'
    case 'graded':
      return 'lucide:check-circle'
    case 'error':
      return 'lucide:alert-circle'
    default:
      return 'lucide:help-circle'
  }
})

const statusIconClass = computed(() => {
  switch (props.status) {
    case 'grading':
      return 'text-blue-600 dark:text-blue-400 animate-spin'
    case 'graded':
      return 'text-green-600 dark:text-green-400'
    case 'error':
      return 'text-destructive'
    default:
      return 'text-primary'
  }
})

const statusTitle = computed(() => {
  switch (props.status) {
    case 'not_submitted':
      return 'Ready for Grading'
    case 'grading':
      return 'Grading in Progress'
    case 'graded':
      return 'Grading Complete'
    case 'error':
      return 'Grading Error'
    default:
      return 'Unknown Status'
  }
})

const statusDescription = computed(() => {
  switch (props.status) {
    case 'not_submitted':
      return 'Submit your work for automated grading'
    case 'grading':
      return 'Please wait while your work is being graded'
    case 'graded':
      return 'Your work has been successfully evaluated'
    case 'error':
      return 'An error occurred during grading'
    default:
      return ''
  }
})

const scoreColorClass = computed(() => {
  if (props.score === null || props.maxScore === null) return ''
  
  const percentage = (props.score / props.maxScore) * 100
  if (percentage >= 90) return 'text-green-600 dark:text-green-400'
  if (percentage >= 70) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
})

const additionalInfo = computed(() => {
  return props.submittedAt || props.gradedAt
})

const gradingDuration = computed(() => {
  if (!props.submittedAt || !props.gradedAt) return null
  
  const duration = props.gradedAt.getTime() - props.submittedAt.getTime()
  const seconds = Math.floor(duration / 1000)
  const minutes = Math.floor(seconds / 60)
  
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
})

// Methods
const startGrading = () => {
  emit('start:grading')
}

const reportIssue = () => {
  emit('report:issue')
  toast.info('Issue report submitted to instructor')
}

const getScoreBadgeVariant = (score: number, maxScore: number) => {
  const percentage = (score / maxScore) * 100
  if (percentage >= 90) return 'default'
  if (percentage >= 70) return 'secondary'
  return 'destructive'
}

const formatDateTime = (date: Date): string => {
  return date.toLocaleString()
}

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString()
}

// Simulate live updates during grading
watch(() => props.status, (newStatus) => {
  if (newStatus === 'grading') {
    // Simulate real-time updates
    const updateMessages = [
      'Connecting to test environment...',
      'Running ping connectivity tests...',
      'Checking service availability...',
      'Validating configuration...',
      'Finalizing results...'
    ]
    
    updateMessages.forEach((message, index) => {
      setTimeout(() => {
        liveUpdates.value.push({
          timestamp: new Date(),
          message
        })
      }, index * 2000)
    })
  }
})
</script>