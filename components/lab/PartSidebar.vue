<template>
  <div class="w-64 bg-sidebar/50 border-r border-sidebar-border/30 min-h-full flex flex-col">
    <div class="p-4 flex-1">
      <h3 class="font-semibold text-sidebar-foreground/90 mb-4">
        {{ mode === 'exam' ? 'Exam Parts' : 'Lab Parts' }}
      </h3>
      
      <div class="space-y-2">
        <div
          v-for="(part, index) in parts"
          :key="part.id"
          :class="[
            'flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors',
            currentPart === index 
              ? 'bg-primary/15 text-primary border border-primary/20' 
              : 'hover:bg-muted/70 hover:border hover:border-border/50',
            isPartDisabled(index) ? 'opacity-50 cursor-not-allowed' : ''
          ]"
          @click="selectPart(index)"
        >
          <div class="flex items-center space-x-2">
            <span class="font-medium">Part {{ index + 1 }}</span>
            <span v-if="part.title" class="text-sm text-muted-foreground truncate max-w-24">
              {{ part.title }}
            </span>
          </div>
          
          <div class="flex items-center space-x-1">
            <Badge 
              v-if="part.status && showStatus" 
              :variant="getStatusVariant(part.status)"
              class="text-xs"
            >
              {{ getStatusLabel(part.status) }}
            </Badge>
            
            <div 
              v-if="part.playId"
              class="w-2 h-2 bg-green-500 rounded-full"
              title="Play assigned"
            />
          </div>
        </div>
      </div>
      
      <Button
        v-if="canAddParts"
        class="w-full mt-4"
        variant="outline"
        size="sm"
        @click="addPart"
      >
        <Plus class="w-4 h-4 mr-2" />
        Add Part
      </Button>
      
      <div v-if="showProgress && totalParts > 0" class="mt-4 pt-4 border-t border-sidebar-border/30">
        <div class="text-sm text-muted-foreground mb-2">
          Progress: {{ completedParts }}/{{ totalParts }}
        </div>
        <Progress :value="progressPercentage" class="w-full" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Plus } from 'lucide-vue-next'
import type { LabPart } from '@/types/lab'

interface Props {
  parts: LabPart[]
  currentPart: number
  mode?: 'lab' | 'exam'
  canAddParts?: boolean
  showStatus?: boolean
  showProgress?: boolean
  userRole?: 'student' | 'lecturer'
  sequentialAccess?: boolean
}

interface Emits {
  (e: 'select-part', index: number): void
  (e: 'add-part'): void
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'lab',
  canAddParts: false,
  showStatus: true,
  showProgress: false,
  userRole: 'student',
  sequentialAccess: true
})

const emit = defineEmits<Emits>()

const totalParts = computed(() => props.parts.length)

const completedParts = computed(() => {
  return props.parts.filter(part => part.status === 'graded').length
})

const progressPercentage = computed(() => {
  if (totalParts.value === 0) return 0
  return (completedParts.value / totalParts.value) * 100
})

const isPartDisabled = (index: number): boolean => {
  if (!props.sequentialAccess || props.userRole === 'lecturer') {
    return false
  }
  
  // For students with sequential access, disable parts after the current incomplete part
  for (let i = 0; i < index; i++) {
    const part = props.parts[i]
    if (!part.status || part.status === 'not_submitted') {
      return true
    }
  }
  
  return false
}

const selectPart = (index: number) => {
  if (isPartDisabled(index)) {
    return
  }
  emit('select-part', index)
}

const addPart = () => {
  emit('add-part')
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'graded':
      return 'default'
    case 'grading':
      return 'secondary'
    case 'not_submitted':
    default:
      return 'outline'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'graded':
      return 'Done'
    case 'grading':
      return 'Grading'
    case 'not_submitted':
    default:
      return 'Pending'
  }
}
</script>