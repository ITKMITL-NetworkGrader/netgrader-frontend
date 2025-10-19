<template>
  <div class="relative">
    <!-- Submit Button with Progress Overlay -->
    <Button 
      size="lg" 
      :disabled="isDisabled"
      :class="buttonClasses"
      @click="handleSubmit"
      class="min-w-[160px] relative overflow-hidden transition-all duration-500"
    >
      <!-- Button Content -->
      <div class="flex items-center space-x-2 relative z-10">
        <CheckCircle v-if="status === 'idle'" class="w-5 h-5" />
        <div v-else-if="status === 'submitting'" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
        <CheckCircle2 v-else-if="status === 'completed' && isPassed" class="w-5 h-5" />
        <AlertCircle v-else-if="status === 'failed'" class="w-5 h-5" />
        <XCircle v-else-if="status === 'cancelled'" class="w-5 h-5" />
        <div v-else-if="status === 'grading'" class="animate-pulse">
          <TestTube class="w-5 h-5" />
        </div>
        
        <span>{{ buttonText }}</span>
      </div>
    </Button>

    <!-- Progress Overlay - Moves UP from button -->
    <div 
      v-if="showProgress && progress"
      :class="[
        'absolute bottom-full right-0 mb-2 transition-all duration-500 origin-bottom z-50',
        'scale-y-100 opacity-100'
      ]"
      style="transform-origin: bottom; width: 480px; max-width: 90vw;"
    >
      <!-- Detailed Progress Popup -->
      <div class="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-lg shadow-xl border border-primary/30 overflow-hidden">
        <!-- Progress Header -->
        <div class="p-4 cursor-pointer" @click="toggleDetails">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center space-x-2">
              <div class="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-b-transparent"></div>
              <span class="font-semibold text-sm">{{ progress.percentage }}% Complete</span>
            </div>
            <div class="flex items-center space-x-1">
              <ChevronUp v-if="showProgressDetails" class="w-4 h-4" />
              <ChevronDown v-else class="w-4 h-4" />
            </div>
          </div>
          
          <!-- Large Progress Bar -->
          <div class="bg-secondary/50 rounded-full h-3 overflow-hidden mb-3">
            <div 
              class="bg-primary-foreground h-full rounded-full transition-all duration-500 ease-out shadow-sm"
              :style="{ width: `${progress.percentage}%` }"
            ></div>
          </div>

          <!-- Main Progress Message and Details in Grid -->
          <div class="grid grid-cols-2 gap-3">
            <!-- Progress Message -->
            <div class="bg-secondary rounded-lg p-2">
              <div class="text-sm font-medium mb-1 text-secondary-foreground">
                {{ progress.message || 'Grading in progress...' }}
              </div>
              <div v-if="progress.current_test" class="text-muted-foreground text-xs">
                Current: {{ progress.current_test }}
              </div>
            </div>
            
            <!-- Progress Stats -->
            <div class="bg-secondary rounded-lg p-2">
              <div class="text-xs text-muted-foreground mb-1">Tests Progress</div>
              <div class="font-mono text-sm text-secondary-foreground">{{ progress.tests_completed }}/{{ displayTotalTests }}</div>
              <div class="text-xs text-muted-foreground">{{ progress.percentage }}% complete</div>
            </div>
          </div>
        </div>

        <!-- Detailed Progress (Collapsible) -->
        <div
          v-if="showProgressDetails"
          class="border-t border-primary/30 bg-primary/90"
        >
          <div class="p-3">
            <div v-if="progress.current_test" class="text-xs">
              <span class="text-muted-foreground block mb-1">Current Test Details:</span>
              <div class="bg-secondary/50 rounded px-3 py-2 font-mono text-xs text-secondary-foreground">
                {{ progress.current_test }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Arrow pointing to button -->
      <div class="flex justify-end mr-4">
        <div class="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-primary"></div>
      </div>
    </div>

    <!-- Results Display - Appears when grading is completed -->
    <div
      v-if="showResults"
      :class="[
        'absolute bottom-full right-0 mb-2 transition-all duration-500 origin-bottom z-50',
        'scale-y-100 opacity-100'
      ]"
      style="transform-origin: bottom; width: 480px; max-width: 90vw;"
    >
      <!-- Results Card -->
      <div :class="[
        'rounded-lg shadow-2xl border-2 overflow-hidden relative',
        isPassed
          ? 'bg-gradient-to-r from-green-600 to-green-500 border-green-400'
          : 'bg-gradient-to-r from-red-600 to-red-500 border-red-400'
      ]">
        <!-- Close Button (Only show if not passed) -->
        <button
          v-if="!isPassed"
          @click="emit('closeResults')"
          class="absolute top-3 right-3 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-10"
          aria-label="Close results"
        >
          <X class="w-4 h-4 text-white" />
        </button>

        <!-- Results Header with Icon and Status -->
        <div class="p-6 text-white">
          <div class="flex items-center justify-center mb-4">
            <div :class="[
              'rounded-full p-3',
              isPassed ? 'bg-green-400/30' : 'bg-red-400/30'
            ]">
              <CheckCircle2 v-if="isPassed" class="w-12 h-12" />
              <XCircle v-else class="w-12 h-12" />
            </div>
          </div>

          <div class="text-center">
            <h3 class="text-3xl font-bold mb-2">
              {{ isPassed ? 'Passed!' : 'Not Passed' }}
            </h3>
            <p class="text-white/90 text-sm">
              {{ isPassed ? 'Congratulations! You achieved a perfect score!' : 'Keep trying! You can do better.' }}
            </p>
          </div>
        </div>

        <!-- Score Display with Number Ticker -->
        <div class="p-6 bg-white/10 backdrop-blur-sm">
          <div class="text-center">
            <div class="text-white/80 text-sm font-medium mb-2">Your Score</div>
            <div class="flex items-center justify-center space-x-2">
              <div class="text-5xl font-bold text-white">
                <NumberTicker
                  :value="results?.total_points_earned || 0"
                  :duration="2000"
                  :decimal-places="0"
                  direction="up"
                  class="text-white"
                />
              </div>
              <div class="text-3xl text-white/60">/</div>
              <div class="text-3xl font-semibold text-white/90">
                {{ results?.total_points_possible || 0 }}
              </div>
            </div>
            <div class="text-white/70 text-xs mt-2">points</div>
          </div>
        </div>

        <!-- Percentage Display with Visual Bar -->
        <div class="p-4 border-t border-white/20">
          <div class="text-center mb-3">
            <div class="text-white/80 text-xs mb-1">Percentage</div>
            <div class="text-2xl font-bold text-white">
              <NumberTicker
                :value="results ? (results.total_points_earned / results.total_points_possible * 100) : 0"
                :duration="2000"
                :decimal-places="1"
                direction="up"
                class="text-white"
              />%
            </div>
          </div>

          <!-- Visual Progress Bar -->
          <div class="bg-white/20 rounded-full h-2 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-1000 ease-out"
              :class="isPassed ? 'bg-white' : 'bg-white/60'"
              :style="{
                width: `${results ? (results.total_points_earned / results.total_points_possible * 100) : 0}%`,
                transitionDelay: '500ms'
              }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Arrow pointing to button -->
      <div class="flex justify-end mr-4">
        <div :class="[
          'w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent',
          isPassed ? 'border-t-green-500' : 'border-t-red-500'
        ]"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { NumberTicker } from '@/components/ui/number-ticker'
import {
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  XCircle,
  TestTube,
  ChevronUp,
  ChevronDown,
  X
} from 'lucide-vue-next'

interface Props {
  status: 'idle' | 'submitting' | 'grading' | 'completed' | 'failed' | 'cancelled'
  progress?: {
    percentage: number
    current_test?: string
    tests_completed: number
    total_tests: number
    message?: string
  }
  results?: {
    total_points_earned: number
    total_points_possible: number
    status: string
  }
  error?: string
  disabled?: boolean
  totalTestCases?: number  // Frontend-calculated total test cases for display
}

interface Emits {
  (e: 'submit'): void
  (e: 'toggleDetails'): void
  (e: 'closeResults'): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

const emit = defineEmits<Emits>()

const showProgressDetails = ref(false)

// Computed Properties
const showProgress = computed(() => {
  return (props.status === 'grading' || props.status === 'submitting') && props.progress
})

const showResults = computed(() => {
  return props.status === 'completed' && props.results
})

// Use frontend-calculated total test cases if available, otherwise use backend value
const displayTotalTests = computed(() => {
  if (props.totalTestCases && props.totalTestCases > 0) {
    return props.totalTestCases
  }
  return props.progress?.total_tests || 1
})

// Auto-show progress details when grading starts
watch(() => props.status, (newStatus, oldStatus) => {
  if (newStatus === 'grading' || newStatus === 'submitting') {
    showProgressDetails.value = true
  }
  console.log('🎯 [GradingProgress] Status changed:', { oldStatus, newStatus, showProgressDetails: showProgressDetails.value })
}, { immediate: true })

// Watch progress changes for debugging
watch(() => props.progress, (newProgress, oldProgress) => {
  if (newProgress) {
    console.log('📊 [GradingProgress] Progress updated:', {
      percentage: newProgress.percentage,
      message: newProgress.message,
      current_test: newProgress.current_test,
      tests_completed: newProgress.tests_completed,
      total_tests: newProgress.total_tests
    })
  }
}, { deep: true })

// Watch results for debugging
watch(() => props.results, (newResults) => {
  if (newResults) {
    console.log('✅ [GradingProgress] Results received:', {
      status: newResults.status,
      points: `${newResults.total_points_earned}/${newResults.total_points_possible}`,
      passed: isPassed.value
    })
  }
}, { deep: true })

const isPassed = computed(() => {
  if (props.status === 'completed' && props.results) {
    return props.results.total_points_earned === props.results.total_points_possible
  }
  return false
})

const isDisabled = computed(() => {
  return props.disabled || 
         props.status === 'submitting' || 
         props.status === 'grading' ||
         (props.status === 'completed' && isPassed.value)
})

const buttonText = computed(() => {
  switch (props.status) {
    case 'submitting':
      return 'Submitting...'
    case 'grading':
      return 'Grading...'
    case 'completed':
      return isPassed.value ? 'Passed' : 'Submit for Grading'
    case 'failed':
      return 'Failed - Retry'
    case 'cancelled':
      return 'Cancelled - Retry'
    default:
      return 'Submit for Grading'
  }
})

const buttonClasses = computed(() => {
  const baseClasses = 'shadow-md transition-all duration-300'
  
  switch (props.status) {
    case 'submitting':
      return `${baseClasses} bg-blue-500 hover:bg-blue-600 text-white`
    case 'grading':
      return `${baseClasses} bg-blue-500 hover:bg-blue-600 text-white`
    case 'completed':
      if (isPassed.value) {
        return `${baseClasses} bg-green-600 text-white cursor-not-allowed hover:bg-green-600`
      }
      return `${baseClasses} bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80`
    case 'failed':
      return `${baseClasses} bg-red-500 hover:bg-red-600 text-white`
    case 'cancelled':
      return `${baseClasses} bg-gray-500 hover:bg-gray-600 text-white`
    default:
      return `${baseClasses} bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80`
  }
})

// Methods
const handleSubmit = () => {
  if (!isDisabled.value) {
    emit('submit')
  }
}

const toggleDetails = () => {
  showProgressDetails.value = !showProgressDetails.value
  emit('toggleDetails')
}
</script>

<style scoped>
/* Custom animations for smooth transitions */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Ensure progress overlay appears above other elements */
.relative {
  z-index: 10;
}

/* Progress bar animation */
@keyframes progress-fill {
  0% { width: 0%; }
  100% { width: var(--progress-width); }
}

.progress-fill {
  animation: progress-fill 0.5s ease-out;
}
</style>