<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-2xl">
      <DialogHeader>
        <DialogTitle class="flex items-center text-xl">
          <Play class="w-6 h-6 mr-3 text-primary" />
          Create New Play
        </DialogTitle>
        <DialogDescription>
          Create a new play for {{ contextInfo.course }} → {{ contextInfo.labOrExam }} → {{ contextInfo.part }}
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-6 py-4">
        <!-- Play Name -->
        <div class="space-y-2">
          <Label for="play-name">Play Name *</Label>
          <Input
            id="play-name"
            v-model="playName"
            placeholder="e.g., Network Connectivity Test"
            :class="{ 'border-destructive': showValidation && !playName.trim() }"
            @blur="validateName"
          />
          <p v-if="showValidation && !playName.trim()" class="text-sm text-destructive">
            Play name is required
          </p>
        </div>

        <!-- Description -->
        <div class="space-y-2">
          <Label for="play-description">Description (Optional)</Label>
          <Textarea
            id="play-description"
            v-model="playDescription"
            placeholder="Describe what this play will test..."
            rows="3"
          />
          <p class="text-xs text-muted-foreground">
            You can add tasks and configure devices after creating the play
          </p>
        </div>
      </div>

      <DialogFooter class="flex items-center justify-between">
        <p class="text-sm text-muted-foreground">
          Tasks and device configurations will be added in the next step
        </p>
        <div class="flex items-center space-x-2">
          <Button variant="outline" @click="handleCancel">
            Cancel
          </Button>
          <Button @click="handleCreate" :disabled="!playName.trim() || isCreating">
            <Loader2 v-if="isCreating" class="w-4 h-4 mr-2 animate-spin" />
            Create Play
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Play, Loader2 } from 'lucide-vue-next'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface ContextInfo {
  course: string
  labOrExam: string
  part: string
  availableDevices: Array<{ value: string; label: string; icon: string }>
}

interface Props {
  open: boolean
  contextInfo: ContextInfo
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'play-created', play: { name: string; description?: string }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Form state
const playName = ref('')
const playDescription = ref('')
const isCreating = ref(false)
const showValidation = ref(false)

// Reset form when modal opens/closes
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    // Reset form when opening
    playName.value = ''
    playDescription.value = ''
    showValidation.value = false
    isCreating.value = false
  }
})

const validateName = () => {
  showValidation.value = true
}

const handleCancel = () => {
  emit('update:open', false)
}

const handleCreate = async () => {
  showValidation.value = true
  
  if (!playName.value.trim()) {
    return
  }

  isCreating.value = true
  
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const newPlay = {
      name: playName.value.trim(),
      description: playDescription.value.trim() || undefined,
      // Generate a temporary ID for the play
      id: `play_${Date.now()}`,
      play_id: `play_${Date.now()}`
    }

    emit('play-created', newPlay)
    emit('update:open', false)
  } catch (error) {
    console.error('Failed to create play:', error)
  } finally {
    isCreating.value = false
  }
}
</script>