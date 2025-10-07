<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
    <div class="bg-card border border-border rounded-lg shadow-2xl max-w-md w-full mx-4 overflow-hidden">
      <!-- Header -->
      <div class="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
        <div class="flex items-center space-x-3">
          <div class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <CheckCircle class="w-7 h-7" />
          </div>
          <div>
            <h2 class="text-2xl font-bold">Lab Completed!</h2>
            <p class="text-green-100 text-sm">Congratulations on finishing this lab</p>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-4">
        <div class="space-y-3">
          <div class="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span class="text-sm font-medium text-muted-foreground">Lab Name</span>
            <span class="text-sm font-semibold text-foreground">{{ labName }}</span>
          </div>

          <div class="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span class="text-sm font-medium text-muted-foreground">Parts Completed</span>
            <Badge variant="secondary" class="font-semibold">
              {{ completedParts }}/{{ totalParts }}
            </Badge>
          </div>

          <div class="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
            <span class="text-sm font-medium text-green-700 dark:text-green-300">Status</span>
            <Badge variant="outline" class="border-green-500 text-green-700 dark:text-green-300 font-semibold">
              ✓ All Parts Passed
            </Badge>
          </div>
        </div>

        <div class="mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p class="text-sm text-blue-800 dark:text-blue-200">
            <strong>Do you want to start over?</strong>
          </p>
          <p class="text-xs text-blue-600 dark:text-blue-300 mt-2">
            Starting over will allow you to practice the lab again. Your previous completion will be preserved.
          </p>
        </div>
      </div>

      <!-- Actions -->
      <div class="border-t border-border p-4 bg-muted/30 flex justify-end space-x-3">
        <Button
          variant="outline"
          @click="handleContinue"
          class="min-w-[100px]"
        >
          View Results
        </Button>
        <Button
          @click="handleRestart"
          class="min-w-[100px] bg-primary hover:bg-primary/90"
        >
          Start Over
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { CheckCircle } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Props {
  isOpen: boolean
  labName: string
  completedParts: number
  totalParts: number
}

interface Emits {
  (e: 'continue'): void
  (e: 'restart'): void
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const handleContinue = () => {
  emit('continue')
  emit('close')
}

const handleRestart = () => {
  emit('restart')
  emit('close')
}
</script>

<style scoped>
/* Fade in animation for dialog */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.fixed {
  animation: fadeIn 0.2s ease-out;
}
</style>
