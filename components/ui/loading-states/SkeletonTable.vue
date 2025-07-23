<template>
  <div class="skeleton-table" :class="containerClass">
    <!-- Table Header -->
    <div v-if="showHeader" class="skeleton-table-header border-b pb-2 mb-4">
      <div class="flex space-x-4">
        <div 
          v-for="col in columnCount" 
          :key="col"
          class="skeleton-header-cell h-5 bg-muted rounded-md animate-pulse"
          :style="{ width: getColumnWidth(col) }"
        />
      </div>
    </div>
    
    <!-- Table Rows -->
    <div class="skeleton-table-body space-y-3">
      <div 
        v-for="row in rowCount" 
        :key="row"
        class="skeleton-table-row flex space-x-4 py-2"
        :class="{ 'border-b border-border/50': showBorders }"
      >
        <div 
          v-for="col in columnCount" 
          :key="col"
          class="skeleton-table-cell h-4 bg-muted/60 rounded-md animate-pulse"
          :style="{ width: getColumnWidth(col) }"
        />
      </div>
    </div>
    
    <!-- Table Footer -->
    <div v-if="showFooter" class="skeleton-table-footer border-t pt-4 mt-4">
      <div class="flex justify-between items-center">
        <div class="skeleton-footer-info h-4 bg-muted/50 rounded-md w-32 animate-pulse"/>
        <div class="skeleton-pagination flex space-x-2">
          <div 
            v-for="page in 3" 
            :key="page"
            class="skeleton-page h-8 w-8 bg-muted/60 rounded-md animate-pulse"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  rowCount?: number
  columnCount?: number
  showHeader?: boolean
  showFooter?: boolean
  showBorders?: boolean
  containerClass?: string
  columnWidths?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  rowCount: 8,
  columnCount: 4,
  showHeader: true,
  showFooter: false,
  showBorders: true,
  containerClass: 'p-4 border rounded-lg',
  columnWidths: () => []
})

// Generate column widths
const getColumnWidth = (columnIndex: number): string => {
  if (props.columnWidths.length > 0 && props.columnWidths[columnIndex - 1]) {
    return props.columnWidths[columnIndex - 1]
  }
  
  // Default varied widths for more realistic appearance
  const defaultWidths = ['25%', '35%', '20%', '20%', '30%', '25%', '15%', '30%']
  return defaultWidths[(columnIndex - 1) % defaultWidths.length]
}
</script>

<style scoped>
.skeleton-table {
  background-color: hsl(var(--card));
}

.skeleton-header-cell,
.skeleton-table-cell,
.skeleton-footer-info,
.skeleton-page {
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