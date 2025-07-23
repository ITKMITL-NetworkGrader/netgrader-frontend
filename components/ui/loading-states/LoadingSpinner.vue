<template>
  <div class="flex items-center justify-center" :class="containerClass">
    <div 
      class="animate-spin rounded-full border-2 border-current border-t-transparent"
      :class="spinnerClass"
    />
    <span v-if="text" class="ml-2 text-sm" :class="textClass">
      {{ text }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  text?: string
  variant?: 'default' | 'primary' | 'muted'
  containerClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  variant: 'default'
})

const spinnerClass = computed(() => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  const variantClasses = {
    default: 'text-foreground',
    primary: 'text-primary',
    muted: 'text-muted-foreground'
  }

  return [sizeClasses[props.size], variantClasses[props.variant]]
})

const textClass = computed(() => {
  const variantClasses = {
    default: 'text-foreground',
    primary: 'text-primary',
    muted: 'text-muted-foreground'
  }

  return variantClasses[props.variant]
})
</script>