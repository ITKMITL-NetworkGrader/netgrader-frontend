<template>
  <div 
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center"
    :class="overlayClass"
  >
    <div class="bg-background/80 backdrop-blur-sm absolute inset-0" />
    <div class="relative bg-card border rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
      <div class="flex flex-col items-center space-y-4">
        <div 
          class="animate-spin rounded-full border-2 border-current border-t-transparent"
          :class="spinnerClass"
        />
        <div class="text-center space-y-2">
          <h3 v-if="title" class="font-semibold">{{ title }}</h3>
          <p v-if="message" class="text-sm text-muted-foreground">{{ message }}</p>
          <div v-if="showProgress && progress !== undefined" class="w-full">
            <Progress :value="progress" class="w-full" />
            <p class="text-xs text-muted-foreground mt-1">{{ progress }}%</p>
          </div>
        </div>
        <Button 
          v-if="cancellable" 
          variant="outline"
          size="sm" 
          @click="$emit('cancel')"
        >
          Cancel
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface Props {
  show?: boolean
  title?: string
  message?: string
  progress?: number
  showProgress?: boolean
  cancellable?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'primary'
}

interface Emits {
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  showProgress: false,
  cancellable: false,
  size: 'md',
  variant: 'default'
})

defineEmits<Emits>()

const overlayClass = computed(() => {
  return 'bg-background/50'
})

const spinnerClass = computed(() => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  const variantClasses = {
    default: 'text-foreground',
    primary: 'text-primary'
  }

  return [sizeClasses[props.size], variantClasses[props.variant]]
})
</script>