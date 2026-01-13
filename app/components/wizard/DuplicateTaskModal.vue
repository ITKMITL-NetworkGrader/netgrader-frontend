<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Copy class="w-5 h-5 text-primary" />
          </div>
          <div>
            <DialogTitle>Duplicate Task</DialogTitle>
            <DialogDescription>
              Create a copy of "{{ task?.name || 'this task' }}"
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div class="space-y-4 py-4">
        <!-- New Task Name -->
        <div class="space-y-2">
          <Label for="newTaskName">New Task Name</Label>
          <Input
            id="newTaskName"
            v-model="newTaskName"
            placeholder="Enter a name for the duplicated task"
            :class="{ 'border-destructive': !newTaskName.trim() }"
          />
          <p v-if="!newTaskName.trim()" class="text-xs text-destructive">
            Task name is required
          </p>
        </div>

        <!-- Destination Selection -->
        <div class="space-y-2">
          <Label>Destination</Label>
          <RadioGroup v-model="destination">
            <div class="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors">
              <RadioGroupItem value="same" id="same-part" />
              <Label for="same-part" class="flex-1 cursor-pointer">
                <div class="font-medium">Same Part</div>
                <div class="text-xs text-muted-foreground">Duplicate within the current part</div>
              </Label>
            </div>
            <div 
              class="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-colors"
              :class="availableParts.length <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent/50'"
            >
              <RadioGroupItem value="different" id="different-part" :disabled="availableParts.length <= 1" />
              <Label for="different-part" class="flex-1 cursor-pointer">
                <div class="font-medium">Different Part</div>
                <div class="text-xs text-muted-foreground">
                  {{ availableParts.length <= 1 ? 'No other parts available' : 'Move to another part in this lab' }}
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <!-- Part Selector (when different part selected) -->
        <div v-if="destination === 'different' && availableParts.length > 1" class="space-y-2">
          <Label>Select Target Part</Label>
          <Combobox v-model="selectedPart" :open-on-focus="true" :ignore-filter="true" class="w-full">
            <ComboboxAnchor class="relative w-full">
              <ComboboxInput
                :display-value="(v: Part | undefined) => v ? `Part ${v.order} - ${v.partId || v.id}` : ''"
                placeholder="Select a part..."
                class="w-full h-10 px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <ComboboxTrigger class="absolute right-0 top-0 h-full px-2">
                <ChevronsUpDown class="h-4 w-4 opacity-50" />
              </ComboboxTrigger>
            </ComboboxAnchor>
            <ComboboxList class="z-[9999] w-[var(--reka-combobox-trigger-width)] min-w-[300px] max-h-[200px] overflow-y-auto">
              <ComboboxEmpty class="p-2 text-sm text-muted-foreground">No parts found</ComboboxEmpty>
              <ComboboxItem
                v-for="part in filteredParts"
                :key="part.id"
                :value="part"
                class="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm"
              >
                Part {{ part.order }} - {{ part.partId || part.id }}
              </ComboboxItem>
            </ComboboxList>
          </Combobox>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="$emit('update:open', false)" :disabled="isDuplicating">
          Cancel
        </Button>
        <Button 
          @click="handleDuplicate" 
          :disabled="!canDuplicate || isDuplicating"
          class="btn-primary-gradient"
        >
          <Loader2 v-if="isDuplicating" class="w-4 h-4 mr-2 animate-spin" />
          <Copy v-else class="w-4 h-4 mr-2" />
          Duplicate
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Copy, Loader2 } from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Combobox,
  ComboboxAnchor,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxList,
  ComboboxEmpty,
  ComboboxItem
} from '@/components/ui/combobox'
import { ChevronsUpDown } from 'lucide-vue-next'

interface Task {
  taskId?: string
  name: string
  [key: string]: any
}

interface Part {
  id: string
  partId?: string
  title?: string
  order?: number
}

interface Props {
  open: boolean
  task: Task | null
  currentPartId: string
  availableParts: Part[]
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'duplicate', payload: { newTaskName: string; targetPartId: string }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const newTaskName = ref('')
const destination = ref<'same' | 'different'>('same')
const selectedPart = ref<Part | undefined>(undefined)
const isDuplicating = ref(false)

// Computed: filter parts excluding current part
const filteredParts = computed(() => {
  return props.availableParts.filter(p => p.id !== props.currentPartId)
})

// Reset form when task changes
watch(() => props.task, (task) => {
  if (task) {
    newTaskName.value = `Copy of ${task.name}`
  }
  destination.value = 'same'
  selectedPart.value = undefined
}, { immediate: true })

// Reset when modal opens
watch(() => props.open, (isOpen) => {
  if (isOpen && props.task) {
    newTaskName.value = `Copy of ${props.task.name}`
    destination.value = 'same'
    selectedPart.value = undefined
    isDuplicating.value = false
  }
})

const canDuplicate = computed(() => {
  if (!newTaskName.value.trim()) return false
  if (destination.value === 'different' && !selectedPart.value) return false
  return true
})

const handleDuplicate = () => {
  if (!canDuplicate.value) return
  
  isDuplicating.value = true
  
  const targetPartId = destination.value === 'same' 
    ? props.currentPartId 
    : (selectedPart.value?.id || props.currentPartId)

  emit('duplicate', {
    newTaskName: newTaskName.value.trim(),
    targetPartId
  })
}
</script>
