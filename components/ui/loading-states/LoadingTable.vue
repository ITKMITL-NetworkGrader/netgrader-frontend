<template>
  <div class="space-y-4">
    <!-- Table Header -->
    <div v-if="loading" class="flex items-center justify-between">
      <Skeleton class="h-6 w-32" />
      <div class="flex space-x-2">
        <Skeleton class="h-9 w-20" />
        <Skeleton class="h-9 w-20" />
      </div>
    </div>
    
    <!-- Table -->
    <div class="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead v-for="(header, index) in headers" :key="index">
              <Skeleton v-if="loading" class="h-4 w-20" />
              <span v-else>{{ header }}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="loading" v-for="row in skeletonRows" :key="row">
            <TableCell v-for="(header, index) in headers" :key="index">
              <Skeleton class="h-4 w-full" />
            </TableCell>
          </TableRow>
          <slot v-else />
        </TableBody>
      </Table>
    </div>
    
    <!-- Pagination -->
    <div v-if="showPagination" class="flex items-center justify-between">
      <Skeleton v-if="loading" class="h-4 w-32" />
      <div v-if="loading" class="flex space-x-2">
        <Skeleton class="h-9 w-20" />
        <Skeleton class="h-9 w-20" />
        <Skeleton class="h-9 w-20" />
      </div>
      <slot v-else name="pagination" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  loading?: boolean
  headers: string[]
  rows?: number
  showPagination?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  rows: 5,
  showPagination: true
})

const skeletonRows = computed(() => Array.from({ length: props.rows }, (_, i) => i))
</script>