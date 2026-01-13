<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[475px]">
      <DialogHeader>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Copy class="w-5 h-5 text-primary" />
          </div>
          <div>
            <DialogTitle>Duplicate Lab</DialogTitle>
            <DialogDescription>
              Create a copy of "{{ lab?.title || 'this lab' }}"
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div class="space-y-4 py-4">
        <!-- New Lab Title -->
        <div class="space-y-2">
          <Label for="newLabTitle">New Lab Title</Label>
          <Input
            id="newLabTitle"
            v-model="newLabTitle"
            placeholder="Enter a title for the duplicated lab"
            :class="{ 'border-destructive': !newLabTitle.trim() }"
          />
          <p v-if="!newLabTitle.trim()" class="text-xs text-destructive">
            Lab title is required
          </p>
        </div>

        <!-- Destination Selection -->
        <div class="space-y-2">
          <Label>Destination</Label>
          <RadioGroup v-model="destination">
            <div class="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors">
              <RadioGroupItem value="same" id="same-course" />
              <Label for="same-course" class="flex-1 cursor-pointer">
                <div class="font-medium">Same Course</div>
                <div class="text-xs text-muted-foreground">Duplicate within the current course</div>
              </Label>
            </div>
            <div 
              class="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-colors"
              :class="availableCourses.length <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent/50'"
            >
              <RadioGroupItem value="different" id="different-course" :disabled="availableCourses.length <= 1" />
              <Label for="different-course" class="flex-1 cursor-pointer">
                <div class="font-medium">Different Course</div>
                <div class="text-xs text-muted-foreground">
                  {{ availableCourses.length <= 1 ? 'No other courses available' : 'Copy to another course' }}
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <!-- Course Selector (when different course selected) -->
        <div v-if="destination === 'different' && availableCourses.length > 1" class="space-y-2">
          <Label>Select Target Course</Label>
          <Combobox v-model="selectedCourse" :open-on-focus="true" :ignore-filter="true" class="w-full">
            <ComboboxAnchor class="relative w-full">
              <ComboboxInput
                :display-value="(v: Course | undefined) => v?.title || ''"
                placeholder="Select a course..."
                class="w-full h-10 px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <ComboboxTrigger class="absolute right-0 top-0 h-full px-2">
                <ChevronsUpDown class="h-4 w-4 opacity-50" />
              </ComboboxTrigger>
            </ComboboxAnchor>
            <ComboboxList class="z-[9999] w-[var(--reka-combobox-trigger-width)] min-w-[300px] max-h-[200px] overflow-y-auto">
              <ComboboxEmpty class="p-2 text-sm text-muted-foreground">No courses found</ComboboxEmpty>
              <ComboboxItem
                v-for="course in filteredCourses"
                :key="course.id"
                :value="course"
                class="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm"
              >
                {{ course.title }}
              </ComboboxItem>
            </ComboboxList>
          </Combobox>
        </div>

        <!-- Include Parts Checkbox -->
        <div class="flex items-center space-x-3 p-3 border rounded-lg">
          <Checkbox id="includeParts" :model-value="includeParts" @update:model-value="(val: boolean | 'indeterminate') => includeParts = !!val" />
          <div class="flex-1">
            <Label for="includeParts" class="cursor-pointer">
              <div class="font-medium">Include all parts</div>
              <div class="text-xs text-muted-foreground">
                Copy all lab parts and their tasks to the new lab
              </div>
            </Label>
          </div>
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
import { toast } from 'vue-sonner'
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
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronsUpDown } from 'lucide-vue-next'

interface Lab {
  id: string
  title: string
  courseId?: string
  [key: string]: any
}

interface Course {
  id: string
  title?: string
}

interface Props {
  open: boolean
  lab: Lab | null
  currentCourseId: string
  availableCourses: Course[]
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'duplicated', result: { labId: string; title: string; courseId: string }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const config = useRuntimeConfig()

const newLabTitle = ref('')
const destination = ref<'same' | 'different'>('same')
const selectedCourse = ref<Course | undefined>(undefined)
const includeParts = ref(true)
const isDuplicating = ref(false)

// Computed: filter courses excluding current course
const filteredCourses = computed(() => {
  return props.availableCourses.filter(c => c.id !== props.currentCourseId)
})

// Reset form when lab changes
watch(() => props.lab, (lab) => {
  if (lab) {
    newLabTitle.value = `Copy of ${lab.title}`
  }
  destination.value = 'same'
  selectedCourse.value = undefined
  includeParts.value = true
}, { immediate: true })

// Reset when modal opens
watch(() => props.open, (isOpen) => {
  if (isOpen && props.lab) {
    newLabTitle.value = `Copy of ${props.lab.title}`
    destination.value = 'same'
    selectedCourse.value = undefined
    includeParts.value = true
    isDuplicating.value = false
  }
})

const canDuplicate = computed(() => {
  if (!newLabTitle.value.trim()) return false
  if (destination.value === 'different' && !selectedCourse.value) return false
  return true
})

const handleDuplicate = async () => {
  if (!canDuplicate.value || !props.lab) return
  
  isDuplicating.value = true
  
  const targetCourseId = destination.value === 'same' 
    ? props.currentCourseId 
    : (selectedCourse.value?.id || props.currentCourseId)

  try {
    const response = await $fetch<{ success: boolean; data: any; message?: string }>(
      `${config.public.backendurl}/v0/labs/${props.lab.id}/duplicate`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useCookie('session').value}`
        },
        body: {
          targetCourseId,
          newTitle: newLabTitle.value.trim(),
          includeParts: includeParts.value
        }
      }
    )

    if (response.success) {
      toast.success('Lab duplicated successfully', {
        description: `Created "${newLabTitle.value}"`
      })
      
      emit('duplicated', {
        labId: response.data.duplicatedLab.id,
        title: response.data.duplicatedLab.title,
        courseId: response.data.duplicatedLab.courseId
      })
      
      emit('update:open', false)
    } else {
      toast.error('Failed to duplicate lab', {
        description: response.message || 'An error occurred'
      })
    }
  } catch (error: any) {
    console.error('Error duplicating lab:', error)
    toast.error('Failed to duplicate lab', {
      description: error.data?.message || error.message || 'An unexpected error occurred'
    })
  } finally {
    isDuplicating.value = false
  }
}
</script>
