<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div class="space-y-1">
        <h4 v-if="title" class="text-sm font-medium">{{ title }}</h4>
        <p v-if="description" class="text-xs text-muted-foreground">{{ description }}</p>
      </div>
      <div class="text-right">
        <div class="text-sm font-medium">{{ displayProgress }}%</div>
        <div v-if="eta" class="text-xs text-muted-foreground">{{ eta }}</div>
      </div>
    </div>
    
    <Progress :value="displayProgress" class="w-full" />
    
    <div v-if="steps && steps.length > 0" class="space-y-2">
      <div class="text-xs font-medium text-muted-foreground">Progress Steps:</div>
      <div class="space-y-1">
        <div 
          v-for="(step, index) in steps" 
          :key="index"
          class="flex items-center space-x-2 text-xs"
        >
          <div 
            class="w-2 h-2 rounded-full flex-shrink-0"
            :class="getStepStatusClass(step.status)"
          />
          <span :class="getStepTextClass(step.status)">{{ step.label }}</span>
          <div v-if="step.status === 'loading'" class="ml-auto">
            <div class="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full" />
          </div>
          <div v-else-if="step.status === 'completed'" class="ml-auto text-green-600">
            <CheckCircle class="w-3 h-3" />
          </div>
          <div v-else-if="step.status === 'error'" class="ml-auto text-red-600">
            <XCircle class="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="showCancel" class="flex justify-end">
      <Button @click="$emit('cancel')" variant="outline" size="sm">
        Cancel
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, XCircle } from 'lucide-vue-next'

interface ProgressStep {
  label: string
  status: 'pending' | 'loading' | 'completed' | 'error'
}

interface Props {
  progress?: number
  title?: string
  description?: string
  eta?: string
  steps?: ProgressStep[]
  showCancel?: boolean
}

interface Emits {
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  progress: 0,
  showCancel: false
})

defineEmits<Emits>()

const displayProgress = computed(() => {
  return Math.min(Math.max(props.progress || 0, 0), 100)
})

const getStepStatusClass = (status: ProgressStep['status']) => {
  switch (status) {
    case 'completed':
      return 'bg-green-600'
    case 'loading':
      return 'bg-blue-600'
    case 'error':
      return 'bg-red-600'
    default:
      return 'bg-muted-foreground/30'
  }
}

const getStepTextClass = (status: ProgressStep['status']) => {
  switch (status) {
    case 'completed':
      return 'text-green-600'
    case 'loading':
      return 'text-blue-600'
    case 'error':
      return 'text-red-600'
    default:
      return 'text-muted-foreground'
  }
}
</script>