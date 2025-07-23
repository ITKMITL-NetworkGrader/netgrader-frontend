<template>
  <div class="space-y-2">
    <div v-if="loading" class="space-y-2">
      <div 
        v-for="item in skeletonItems" 
        :key="item"
        class="flex items-center space-x-3 p-3 border rounded-lg"
      >
        <Skeleton v-if="showAvatar" class="w-10 h-10 rounded-full flex-shrink-0" />
        <div class="flex-1 space-y-2">
          <Skeleton class="h-4 w-3/4" />
          <Skeleton v-if="showDescription" class="h-3 w-1/2" />
        </div>
        <div v-if="showActions" class="flex space-x-2">
          <Skeleton class="h-8 w-16" />
          <Skeleton class="h-8 w-16" />
        </div>
      </div>
    </div>
    
    <div v-else-if="items.length === 0" class="text-center py-8">
      <div class="text-muted-foreground">
        <slot name="empty">
          <div class="space-y-2">
            <div class="text-lg">{{ emptyTitle || 'No items found' }}</div>
            <div class="text-sm">{{ emptyDescription || 'There are no items to display.' }}</div>
          </div>
        </slot>
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
  items: any[]
  skeletonCount?: number
  showAvatar?: boolean
  showDescription?: boolean
  showActions?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  skeletonCount: 5,
  showAvatar: true,
  showDescription: true,
  showActions: true
})

const skeletonItems = computed(() => Array.from({ length: props.skeletonCount }, (_, i) => i))
</script>