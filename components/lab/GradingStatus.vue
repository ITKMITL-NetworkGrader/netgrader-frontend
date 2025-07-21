<template>
  <div class="border-t border-border p-4 bg-card">
    <!-- Not Submitted State -->
    <div v-if="status === 'not_submitted'" class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h4 class="font-medium">Ready to Submit</h4>
          <p class="text-sm text-muted-foreground">
            Submit your work for automated grading
          </p>
        </div>
        <Badge variant="outline">Not Submitted</Badge>
      </div>
      
      <Button 
        @click="submitForGrading" 
        class="w-full" 
        :disabled="isSubmitting || !canSubmit || (timeRemaining !== undefined && timeRemaining <= 0)"
        size="lg"
      >
        <span v-if="!isSubmitting" class="flex items-center">
          <Send class="w-4 h-4 mr-2" />
          Submit for Grading
        </span>
        <span v-else class="flex items-center">
          <Loader2 class="w-4 h-4 mr-2 animate-spin" />
          Submitting...
        </span>
      </Button>
      
      <div v-if="!canSubmit" class="text-sm text-muted-foreground text-center">
        Complete all required fields before submitting
      </div>
      
      <div v-if="timeRemaining !== undefined && timeRemaining <= 0" class="text-sm text-red-600 text-center">
        Time limit exceeded - submission disabled
      </div>
    </div>
    
    <!-- Grading In Progress State -->
    <div v-else-if="status === 'grading'" class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h4 class="font-medium flex items-center">
            <Loader2 class="w-4 h-4 mr-2 animate-spin text-primary" />
            Grading in Progress
          </h4>
          <p class="text-sm text-muted-foreground">
            Your submission is being evaluated...
          </p>
        </div>
        <Badge variant="secondary">
          <Clock class="w-3 h-3 mr-1" />
          Grading
        </Badge>
      </div>
      
      <div class="space-y-2">
        <div class="flex items-center justify-between text-sm">
          <span>Progress</span>
          <span>{{ Math.round(gradingProgress) }}%</span>
        </div>
        <Progress :value="gradingProgress" class="w-full" />
      </div>
      
      <div v-if="currentTask" class="text-sm text-muted-foreground">
        Currently grading: {{ currentTask }}
      </div>
      
      <div class="flex items-center justify-center text-xs text-muted-foreground">
        <RefreshCw class="w-3 h-3 mr-1 animate-spin" />
        Checking status every 3 seconds...
      </div>
    </div>
    
    <!-- Graded State -->
    <div v-else-if="status === 'graded'" class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h4 class="font-medium flex items-center text-green-600">
            <CheckCircle class="w-4 h-4 mr-2" />
            Grading Complete
          </h4>
          <p class="text-sm text-muted-foreground">
            Submitted {{ formatDate(submittedAt) }}
          </p>
        </div>
        <Badge 
          :variant="getScoreVariant(totalScore, maxScore)"
          class="text-sm font-medium"
        >
          {{ totalScore }}/{{ maxScore }} points
        </Badge>
      </div>
      
      <!-- Overall Score -->
      <div class="bg-muted/50 rounded-lg p-3">
        <div class="flex items-center justify-between mb-2">
          <span class="font-medium">Overall Score</span>
          <span class="text-lg font-bold">
            {{ Math.round((totalScore / maxScore) * 100) }}%
          </span>
        </div>
        <Progress 
          :value="(totalScore / maxScore) * 100" 
          class="w-full"
          :class="getProgressClass(totalScore, maxScore)"
        />
      </div>
      
      <!-- Task Results -->
      <div class="space-y-2">
        <h5 class="font-medium text-sm">Task Results</h5>
        <div class="space-y-2 max-h-48 overflow-y-auto">
          <div
            v-for="task in taskResults"
            :key="task.id"
            class="flex items-center justify-between p-2 rounded border bg-card"
          >
            <div class="flex items-center space-x-2">
              <div :class="task.passed ? 'text-green-600' : 'text-red-600'">
                <CheckCircle v-if="task.passed" class="w-4 h-4" />
                <XCircle v-else class="w-4 h-4" />
              </div>
              <div>
                <div class="text-sm font-medium">{{ task.name }}</div>
                <div v-if="task.feedback" class="text-xs text-muted-foreground">
                  {{ task.feedback }}
                </div>
              </div>
            </div>
            
            <div class="text-right">
              <div class="text-sm font-medium" :class="task.passed ? 'text-green-600' : 'text-red-600'">
                {{ task.score }}/{{ task.maxScore }}
              </div>
              <div class="text-xs text-muted-foreground">
                {{ Math.round((task.score / task.maxScore) * 100) }}%
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Actions -->
      <div class="flex items-center justify-between pt-2 border-t">
        <Button 
          variant="outline" 
          size="sm" 
          @click="downloadReport"
          :disabled="isDownloading"
        >
          <Download class="w-4 h-4 mr-2" />
          <span v-if="!isDownloading">Download Report</span>
          <span v-else>Downloading...</span>
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          @click="resubmit"
          v-if="allowResubmission"
        >
          <RotateCcw class="w-4 h-4 mr-2" />
          Resubmit
        </Button>
      </div>
    </div>
    
    <!-- Error State -->
    <div v-else-if="status === 'error'" class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h4 class="font-medium flex items-center text-red-600">
            <AlertCircle class="w-4 h-4 mr-2" />
            Grading Failed
          </h4>
          <p class="text-sm text-muted-foreground">
            An error occurred during grading
          </p>
        </div>
        <Badge variant="destructive">Error</Badge>
      </div>
      
      <div v-if="errorMessage" class="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
        <p class="text-sm text-destructive">{{ errorMessage }}</p>
      </div>
      
      <div class="flex space-x-2">
        <Button @click="retryGrading" variant="outline" size="sm">
          <RefreshCw class="w-4 h-4 mr-2" />
          Retry
        </Button>
        <Button @click="reportIssue" variant="ghost" size="sm">
          <Flag class="w-4 h-4 mr-2" />
          Report Issue
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Clock, 
  RefreshCw, 
  Send,
  Download,
  RotateCcw,
  AlertCircle,
  Flag
} from 'lucide-vue-next'
import type { GradingStatus, TaskResult } from '@/types/lab'

interface Props {
  courseId: string
  labId: string
  partId: string
  status: GradingStatus
  gradingProgress?: number
  currentTask?: string
  taskResults?: TaskResult[]
  totalScore?: number
  maxScore?: number
  submittedAt?: Date
  errorMessage?: string
  canSubmit?: boolean
  allowResubmission?: boolean
  timeRemaining?: number
}

interface Emits {
  (e: 'submit-grading'): void
  (e: 'retry-grading'): void
  (e: 'resubmit'): void
  (e: 'download-report'): void
  (e: 'report-issue'): void
}

const props = withDefaults(defineProps<Props>(), {
  gradingProgress: 0,
  taskResults: () => [],
  totalScore: 0,
  maxScore: 0,
  canSubmit: true,
  allowResubmission: false,
  timeRemaining: undefined
})

const emit = defineEmits<Emits>()

const isSubmitting = ref(false)
const isDownloading = ref(false)
const pollingInterval = ref<NodeJS.Timeout | null>(null)

const submitForGrading = async () => {
  if (!props.canSubmit) return
  
  isSubmitting.value = true
  try {
    emit('submit-grading')
  } finally {
    isSubmitting.value = false
  }
}

const retryGrading = () => {
  emit('retry-grading')
}

const resubmit = () => {
  emit('resubmit')
}

const downloadReport = async () => {
  isDownloading.value = true
  try {
    emit('download-report')
  } finally {
    isDownloading.value = false
  }
}

const reportIssue = () => {
  emit('report-issue')
}

const formatDate = (date?: Date): string => {
  if (!date) return 'Unknown'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const getScoreVariant = (score: number, maxScore: number) => {
  const percentage = (score / maxScore) * 100
  if (percentage >= 90) return 'default'
  if (percentage >= 70) return 'secondary'
  return 'destructive'
}

const getProgressClass = (score: number, maxScore: number) => {
  const percentage = (score / maxScore) * 100
  if (percentage >= 90) return 'text-green-600'
  if (percentage >= 70) return 'text-yellow-600'
  return 'text-red-600'
}

// Cleanup polling on unmount
onUnmounted(() => {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value)
  }
})
</script>