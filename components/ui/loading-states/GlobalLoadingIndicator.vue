<template>
  <Teleport to="body">
    <div 
      v-if="hasActiveOperations" 
      class="fixed top-4 right-4 z-50 max-w-sm w-full"
    >
      <Card class="shadow-lg border">
        <CardHeader class="pb-3">
          <div class="flex items-center justify-between">
            <CardTitle class="text-sm">Active Operations</CardTitle>
            <Badge variant="secondary">{{ operations.length }}</Badge>
          </div>
        </CardHeader>
        
        <CardContent class="space-y-3">
          <div v-if="operations.length === 1" class="space-y-2">
            <LoadingProgress
              :progress="operations[0].progress"
              :title="operations[0].label"
              :eta="operations[0].eta"
              :show-cancel="operations[0].cancellable"
              @cancel="cancelOperation(operations[0].id)"
            />
          </div>
          
          <div v-else class="space-y-3">
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium">Overall Progress</span>
                <span class="text-sm">{{ Math.round(globalProgress) }}%</span>
              </div>
              <Progress :value="globalProgress" class="w-full" />
            </div>
            
            <div class="space-y-2 max-h-32 overflow-y-auto">
              <div 
                v-for="operation in operations" 
                :key="operation.id"
                class="flex items-center justify-between text-xs"
              >
                <div class="flex items-center space-x-2 flex-1 min-w-0">
                  <div 
                    class="w-2 h-2 rounded-full flex-shrink-0"
                    :class="operation.progress === 100 ? 'bg-green-500' : 'bg-blue-500'"
                  />
                  <span class="truncate">{{ operation.label }}</span>
                </div>
                <div class="flex items-center space-x-2">
                  <span class="text-muted-foreground">{{ operation.progress || 0 }}%</span>
                  <Button
                    v-if="operation.cancellable"
                    variant="ghost"
                    size="sm"
                    class="h-6 w-6 p-0"
                    @click="cancelOperation(operation.id)"
                  >
                    <X class="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter v-if="operations.some(op => op.cancellable)" class="pt-3">
          <Button 
            variant="outline"
            size="sm" 
            class="w-full"
            @click="cancelAllOperations"
          >
            Cancel All
          </Button>
        </CardFooter>
      </Card>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { X } from 'lucide-vue-next'
import { useLoadingStates } from '@/composables/useLoadingStates'
import LoadingProgress from './LoadingProgress.vue'

const { 
  getAllOperations: operations, 
  hasActiveOperations, 
  globalProgress,
  cancelOperation
} = useLoadingStates()

const cancelAllOperations = () => {
  operations.value.forEach(operation => {
    if (operation.cancellable) {
      cancelOperation(operation.id)
    }
  })
}
</script>