<template>
  <div class="skeleton-list space-y-4" :class="containerClass">
    <SkeletonCard
      v-for="item in itemCount"
      :key="item"
      :variant="variant"
      :show-header="showHeaders"
      :show-subtitle="showSubtitles"
      :show-actions="showActions"
      :content-lines="contentLines"
      :action-count="actionCount"
      :container-class="itemClass"
    />
  </div>
</template>

<script setup lang="ts">
interface Props {
  itemCount?: number
  variant?: 'default' | 'compact' | 'detailed'
  showHeaders?: boolean
  showSubtitles?: boolean
  showActions?: boolean
  contentLines?: number
  actionCount?: number
  containerClass?: string
  itemClass?: string
}

withDefaults(defineProps<Props>(), {
  itemCount: 5,
  variant: 'default',
  showHeaders: true,
  showSubtitles: true,
  showActions: false,
  contentLines: 3,
  actionCount: 2,
  containerClass: '',
  itemClass: 'p-4 border rounded-lg'
})
</script>