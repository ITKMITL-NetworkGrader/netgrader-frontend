<template>
  <Button
    :disabled="loading || disabled"
    :variant="variant"
    :size="size"
    :class="[buttonClass, { 'relative overflow-hidden': showProgress }]"
    v-bind="$attrs"
    @click="handleClick"
  >
    <!-- Progress background -->
    <div 
      v-if="showProgress && progress !== undefined"
      class="absolute inset-0 bg-primary/20 transition-all duration-300"
      :style="{ width: `${progress}%` }"
    />
    
    <div v-if="loading" class="flex items-center relative z-10">
      <div 
        class="animate-spin rounded-full border-2 border-current border-t-transparent w-4 h-4 mr-2"
        :class="spinnerClass"
      />
      <span>{{ loadingText || 'Loading...' }}</span>
      <span v-if="showProgress && progress !== undefined" class="ml-2 text-xs opacity-75">
        {{ Math.round(progress) }}%
      </span>
    </div>
    <div v-else class="flex items-center relative z-10">
      <slot name="icon" />
      <span>{{ text }}</span>
    </div>
  </Button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'

interface Props {
  loading?: boolean
  text: string
  loadingText?: string
  disabled?: boolean
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  buttonClass?: string
  progress?: number
  showProgress?: boolean
  spinnerSize?: 'sm' | 'md' | 'lg'
}

interface Emits {
  (e: 'click', event: MouseEvent): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  disabled: false,
  variant: 'default',
  size: 'default',
  showProgress: false,
  spinnerSize: 'md'
})

const spinnerClass = computed(() => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }
  return sizeClasses[props.spinnerSize]
})

const emit = defineEmits<Emits>()

const handleClick = (event: MouseEvent) => {
  if (!props.loading && !props.disabled) {
    emit('click', event)
  }
}
</script>