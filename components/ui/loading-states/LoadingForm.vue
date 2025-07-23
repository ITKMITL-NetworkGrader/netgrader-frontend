<template>
  <div class="space-y-6">
    <div v-if="loading" class="space-y-4">
      <!-- Form Header -->
      <div v-if="showHeader" class="space-y-2">
        <Skeleton class="h-6 w-48" />
        <Skeleton class="h-4 w-64" />
      </div>
      
      <!-- Form Fields -->
      <div class="space-y-4">
        <div v-for="field in skeletonFields" :key="field" class="space-y-2">
          <Skeleton class="h-4 w-24" />
          <Skeleton :class="getFieldSkeletonClass(field)" />
        </div>
      </div>
      
      <!-- Form Actions -->
      <div v-if="showActions" class="flex space-x-2 pt-4">
        <Skeleton class="h-10 w-20" />
        <Skeleton class="h-10 w-20" />
      </div>
    </div>
    
    <div v-else>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  loading?: boolean
  fieldCount?: number
  showHeader?: boolean
  showActions?: boolean
  fieldTypes?: ('input' | 'textarea' | 'select')[]
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  fieldCount: 4,
  showHeader: true,
  showActions: true,
  fieldTypes: () => ['input', 'input', 'textarea', 'select']
})

const skeletonFields = computed(() => Array.from({ length: props.fieldCount }, (_, i) => i))

const getFieldSkeletonClass = (fieldIndex: number) => {
  const fieldType = props.fieldTypes[fieldIndex] || 'input'
  
  switch (fieldType) {
    case 'textarea':
      return 'h-24 w-full'
    case 'select':
      return 'h-10 w-full'
    default:
      return 'h-10 w-full'
  }
}
</script>