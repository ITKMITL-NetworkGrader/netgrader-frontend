<template>
  <Card :class="cardClass">
    <CardHeader v-if="title || description">
      <CardTitle v-if="title">
        <Skeleton v-if="loading" class="h-6 w-48" />
        <span v-else>{{ title }}</span>
      </CardTitle>
      <CardDescription v-if="description">
        <Skeleton v-if="loading" class="h-4 w-64" />
        <span v-else>{{ description }}</span>
      </CardDescription>
    </CardHeader>
    
    <CardContent>
      <div v-if="loading" class="space-y-3">
        <Skeleton class="h-4 w-full" />
        <Skeleton class="h-4 w-3/4" />
        <Skeleton class="h-4 w-1/2" />
        <div v-if="showActions" class="flex space-x-2 mt-4">
          <Skeleton class="h-9 w-20" />
          <Skeleton class="h-9 w-20" />
        </div>
      </div>
      <div v-else>
        <slot />
      </div>
    </CardContent>
    
    <CardFooter v-if="$slots.footer">
      <div v-if="loading && showActions" class="flex space-x-2">
        <Skeleton class="h-9 w-20" />
        <Skeleton class="h-9 w-20" />
      </div>
      <slot v-else name="footer" />
    </CardFooter>
  </Card>
</template>

<script setup lang="ts">
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  loading?: boolean
  title?: string
  description?: string
  showActions?: boolean
  cardClass?: string
}

withDefaults(defineProps<Props>(), {
  loading: false,
  showActions: true
})
</script>