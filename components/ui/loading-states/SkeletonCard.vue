<template>
  <div class="skeleton-card animate-pulse" :class="containerClass">
    <div v-if="showHeader" class="skeleton-header mb-4">
      <div class="skeleton-title h-6 bg-muted rounded-md mb-2" :style="{ width: titleWidth }"/>
      <div v-if="showSubtitle" class="skeleton-subtitle h-4 bg-muted/70 rounded-md" :style="{ width: subtitleWidth }"/>
    </div>
    
    <div class="skeleton-content space-y-3">
      <div 
        v-for="line in contentLines" 
        :key="line"
        class="skeleton-line h-4 bg-muted/50 rounded-md"
        :style="{ width: getLineWidth(line) }"
      />
    </div>
    
    <div v-if="showActions" class="skeleton-actions flex space-x-2 mt-4">
      <div 
        v-for="action in actionCount" 
        :key="action"
        class="skeleton-action h-9 bg-muted/60 rounded-md"
        :style="{ width: actionWidth }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  showHeader?: boolean
  showSubtitle?: boolean
  showActions?: boolean
  contentLines?: number
  actionCount?: number
  titleWidth?: string
  subtitleWidth?: string
  actionWidth?: string
  containerClass?: string
  variant?: 'default' | 'compact' | 'detailed'
}

const props = withDefaults(defineProps<Props>(), {
  showHeader: true,
  showSubtitle: true,
  showActions: false,
  contentLines: 3,
  actionCount: 2,
  titleWidth: '70%',
  subtitleWidth: '50%',
  actionWidth: '80px',
  containerClass: 'p-4 border rounded-lg',
  variant: 'default'
})

// Generate varied line widths for more realistic skeleton
const getLineWidth = (lineNumber: number): string => {
  const widths = ['100%', '85%', '92%', '78%', '95%', '88%', '82%']
  return widths[(lineNumber - 1) % widths.length]
}

// Adjust properties based on variant
const adjustedProps = computed(() => {
  switch (props.variant) {
    case 'compact':
      return {
        ...props,
        contentLines: Math.max(1, props.contentLines - 1),
        showSubtitle: false,
        showActions: false
      }
    case 'detailed':
      return {
        ...props,
        contentLines: props.contentLines + 2,
        showActions: true
      }
    default:
      return props
  }
})
</script>

<style scoped>
.skeleton-card {
  background-color: hsl(var(--card));
}

.skeleton-title,
.skeleton-subtitle,
.skeleton-line,
.skeleton-action {
  background: linear-gradient(90deg, hsl(var(--muted)) 0%, hsl(var(--muted) / 0.5) 50%, hsl(var(--muted)) 100%);
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
</style>