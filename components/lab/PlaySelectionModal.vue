<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="max-w-4xl max-h-[80vh] overflow-hidden">
      <DialogHeader>
        <DialogTitle>Select Play from Play Bank</DialogTitle>
        <DialogDescription>
          Choose a grading flow for this lab part. Each play defines the tasks and grading criteria.
        </DialogDescription>
      </DialogHeader>
      
      <!-- Search and Filter -->
      <div class="flex items-center space-x-4 py-4">
        <div class="flex-1">
          <Input
            v-model="searchQuery"
            placeholder="Search plays by name or description..."
            class="w-full"
          />
        </div>
        <Select v-model="sortBy">
          <SelectTrigger class="w-48">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="points">Total Points</SelectItem>
            <SelectItem value="tasks">Task Count</SelectItem>
            <SelectItem value="recent">Recently Used</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center py-8">
        <div class="flex items-center space-x-2">
          <Loader2 class="w-5 h-5 animate-spin" />
          <span>Loading plays...</span>
        </div>
      </div>
      
      <!-- Play List -->
      <div v-else class="max-h-96 overflow-y-auto">
        <div v-if="filteredPlays.length === 0" class="text-center py-8 text-muted-foreground">
          <Search class="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No plays found matching your criteria.</p>
        </div>
        
        <div v-else class="grid gap-4">
          <Card
            v-for="play in filteredPlays"
            :key="play.id"
            :class="[
              'cursor-pointer transition-all duration-200',
              selectedPlayId === play.id 
                ? 'ring-2 ring-primary shadow-md' 
                : 'hover:bg-accent hover:shadow-sm'
            ]"
            @click="selectPlay(play)"
          >
            <CardHeader class="pb-3">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <CardTitle class="text-lg flex items-center space-x-2">
                    <span>{{ play.name }}</span>
                    <Badge v-if="play.isReusable" variant="secondary" class="text-xs">
                      Reusable
                    </Badge>
                  </CardTitle>
                  <CardDescription class="mt-1">
                    {{ play.description }}
                  </CardDescription>
                </div>
                
                <div class="flex items-center space-x-2">
                  <div v-if="selectedPlayId === play.id" class="text-primary">
                    <CheckCircle class="w-5 h-5" />
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent class="pt-0">
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div class="flex items-center space-x-2">
                  <FileText class="w-4 h-4 text-muted-foreground" />
                  <span>{{ play.taskCount }} tasks</span>
                </div>
                <div class="flex items-center space-x-2">
                  <Trophy class="w-4 h-4 text-muted-foreground" />
                  <span>{{ play.totalPoints }} points</span>
                </div>
              </div>
              
              <!-- Variables Section -->
              <div v-if="play.variables && play.variables.length > 0" class="mt-3 pt-3 border-t">
                <div class="text-sm font-medium mb-2">Required Variables:</div>
                <div class="flex flex-wrap gap-1">
                  <Badge 
                    v-for="variable in play.variables" 
                    :key="variable.name"
                    variant="outline" 
                    class="text-xs"
                  >
                    {{ variable.name }}
                    <span v-if="variable.required" class="text-destructive ml-1">*</span>
                  </Badge>
                </div>
              </div>
              
              <!-- Preview Button -->
              <div class="mt-3 pt-3 border-t">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  @click.stop="previewPlay(play)"
                  class="text-xs"
                >
                  <Eye class="w-3 h-3 mr-1" />
                  Preview Tasks
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <!-- Variable Configuration Section -->
      <div v-if="selectedPlay && selectedPlay.variables && selectedPlay.variables.length > 0" 
           class="border-t pt-4">
        <h4 class="font-medium mb-3">Configure Variables</h4>
        <div class="grid gap-3 max-h-32 overflow-y-auto">
          <div 
            v-for="variable in selectedPlay.variables" 
            :key="variable.name"
            class="grid grid-cols-3 gap-3 items-center"
          >
            <div class="text-sm">
              <span class="font-medium">{{ variable.name }}</span>
              <span v-if="variable.required" class="text-destructive ml-1">*</span>
              <div class="text-xs text-muted-foreground">{{ variable.description }}</div>
            </div>
            
            <div class="text-xs text-muted-foreground">
              {{ variable.type }}
            </div>
            
            <div>
              <Input
                v-if="variable.type === 'string' || variable.type === 'ip_address'"
                v-model="variableValues[variable.name]"
                :placeholder="variable.defaultValue?.toString() || `Enter ${variable.type}`"
                class="text-sm"
              />
              <Input
                v-else-if="variable.type === 'number'"
                v-model.number="variableValues[variable.name]"
                type="number"
                :placeholder="variable.defaultValue?.toString() || '0'"
                class="text-sm"
              />
              <Select 
                v-else-if="variable.type === 'group_number'"
                v-model="variableValues[variable.name]"
              >
                <SelectTrigger class="text-sm">
                  <SelectValue placeholder="Auto-assign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-assign by group</SelectItem>
                  <SelectItem v-for="i in 32" :key="i" :value="i.toString()">
                    Group {{ i }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <div v-else class="text-xs text-muted-foreground">
                Auto-generated
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <DialogFooter class="flex items-center justify-between">
        <div class="text-sm text-muted-foreground">
          <span v-if="selectedPlay">
            Selected: {{ selectedPlay.name }}
          </span>
          <span v-else>
            Select a play to continue
          </span>
        </div>
        
        <div class="flex space-x-2">
          <Button variant="outline" @click="cancel">
            Cancel
          </Button>
          <Button 
            @click="confirm" 
            :disabled="!selectedPlayId || !isVariableConfigValid"
          >
            Select Play
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  CheckCircle, 
  Eye, 
  FileText, 
  Trophy, 
  Search, 
  Loader2 
} from 'lucide-vue-next'
import type { Play, PlayVariable, PlayVariableBinding } from '@/types/lab'

interface Props {
  open: boolean
  plays: Play[]
  isLoading?: boolean
  preselectedPlayId?: string | null
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'select-play', play: Play, variables: PlayVariableBinding[]): void
  (e: 'preview-play', play: Play): void
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  preselectedPlayId: null
})

const emit = defineEmits<Emits>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const searchQuery = ref('')
const sortBy = ref('name')
const selectedPlayId = ref<string | null>(props.preselectedPlayId)
const variableValues = ref<Record<string, any>>({})

const selectedPlay = computed(() => {
  return props.plays.find(play => play.id === selectedPlayId.value) || null
})

const filteredPlays = computed(() => {
  let filtered = props.plays

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(play => 
      play.name.toLowerCase().includes(query) ||
      play.description.toLowerCase().includes(query)
    )
  }

  // Apply sorting
  switch (sortBy.value) {
    case 'name':
      filtered.sort((a, b) => a.name.localeCompare(b.name))
      break
    case 'points':
      filtered.sort((a, b) => b.totalPoints - a.totalPoints)
      break
    case 'tasks':
      filtered.sort((a, b) => b.taskCount - a.taskCount)
      break
    case 'recent':
      // For now, just sort by name. In a real app, you'd track usage
      filtered.sort((a, b) => a.name.localeCompare(b.name))
      break
  }

  return filtered
})

const isVariableConfigValid = computed(() => {
  if (!selectedPlay.value || !selectedPlay.value.variables) {
    return true
  }

  return selectedPlay.value.variables.every(variable => {
    if (!variable.required) return true
    
    const value = variableValues.value[variable.name]
    return value !== undefined && value !== null && value !== ''
  })
})

const selectPlay = (play: Play) => {
  selectedPlayId.value = play.id
  
  // Initialize variable values with defaults
  if (play.variables) {
    play.variables.forEach(variable => {
      if (variable.defaultValue !== undefined) {
        variableValues.value[variable.name] = variable.defaultValue
      }
    })
  }
}

const previewPlay = (play: Play) => {
  emit('preview-play', play)
}

const confirm = () => {
  if (!selectedPlay.value) return

  const variableBindings: PlayVariableBinding[] = []
  
  if (selectedPlay.value.variables) {
    selectedPlay.value.variables.forEach(variable => {
      const value = variableValues.value[variable.name]
      
      variableBindings.push({
        variableName: variable.name,
        value: value !== undefined ? value : variable.defaultValue,
        source: getVariableSource(variable),
        generationRule: getGenerationRule(variable)
      })
    })
  }

  emit('select-play', selectedPlay.value, variableBindings)
  isOpen.value = false
}

const cancel = () => {
  selectedPlayId.value = null
  variableValues.value = {}
  isOpen.value = false
}

const getVariableSource = (variable: PlayVariable): 'static' | 'group' | 'student' | 'generated' => {
  switch (variable.type) {
    case 'group_number':
      return 'group'
    case 'vlan_id':
    case 'subnet':
      return 'generated'
    default:
      return 'static'
  }
}

const getGenerationRule = (variable: PlayVariable): string | undefined => {
  switch (variable.type) {
    case 'group_number':
      return 'student_group_assignment'
    case 'vlan_id':
      return 'exam_vlan_generation'
    case 'subnet':
      return 'exam_subnet_generation'
    default:
      return undefined
  }
}

// Reset state when modal opens/closes
watch(isOpen, (newValue) => {
  if (!newValue) {
    selectedPlayId.value = null
    variableValues.value = {}
    searchQuery.value = ''
  }
})

// Set preselected play when prop changes
watch(() => props.preselectedPlayId, (newValue) => {
  selectedPlayId.value = newValue
})
</script>