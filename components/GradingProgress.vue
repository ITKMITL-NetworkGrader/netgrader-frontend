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

    <!-- Progress Overlay -->
    <div 
      v-if="showProgress && progress"
      :class="[
        'absolute top-full left-0 right-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-b-lg transition-all duration-500 transform origin-top shadow-lg border border-blue-400',
        showProgressDetails ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0'
      ]"
      style="transform-origin: top;"
    >
      <!-- Progress Header -->
      <div class="p-3 cursor-pointer" @click="toggleDetails">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span class="font-medium text-sm">{{ progress.message || 'Grading in progress...' }}</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-xs font-mono">{{ progress.percentage }}%</span>
            <ChevronUp v-if="showProgressDetails" class="w-4 h-4" />
            <ChevronDown v-else class="w-4 h-4" />
          </div>
        </div>
        
        <!-- Progress Bar -->
        <div class="mt-2 bg-blue-400 rounded-full h-2 overflow-hidden">
          <div 
            class="bg-white h-full rounded-full transition-all duration-300 ease-out"
            :style="{ width: `${progress.percentage}%` }"
          ></div>
        </div>
      </div>

      <!-- Detailed Progress -->
      <div 
        v-if="showProgressDetails"
        class="border-t border-blue-400 bg-blue-600/90"
      >
        <div class="p-3 space-y-2">
          <div v-if="progress.current_test" class="text-xs">
            <span class="text-blue-200">Current Test:</span>
            <span class="font-mono ml-1">{{ progress.current_test }}</span>
          </div>
          <div class="text-xs">
            <span class="text-blue-200">Progress:</span>
            <span class="font-mono ml-1">{{ progress.tests_completed }}/{{ progress.total_tests }} tests completed</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  TestTube,
  ChevronUp,
  ChevronDown 
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
}

interface Emits {
  (e: 'submit'): void
  (e: 'toggleDetails'): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

const emit = defineEmits<Emits>()

const showProgressDetails = ref(false)

// Computed Properties
const showProgress = computed(() => {
  return props.status === 'grading' && props.progress
})

const isPassed = computed(() => {
  if (props.status === 'completed' && props.results) {
    return props.results.status === 'completed' && props.results.total_points_earned > 0
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