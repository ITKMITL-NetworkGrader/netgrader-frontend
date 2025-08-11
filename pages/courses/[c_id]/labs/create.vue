<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import PartSidebar from '@/components/lab/PartSidebar.vue'
import ClientOnlyTextEditor from '@/components/lab/ClientOnlyTextEditor.vue'
import PlaySelectionModal from '@/components/lab/PlaySelectionModal.vue'
import GroupManagement from '@/components/lab/GroupManagement.vue'
import IPSchemaManager from '@/components/lab/IPSchemaManager.vue'
import PlayCreationModal from '@/components/play/PlayCreationModal.vue'
import { useLabManagement } from '@/composables/useLabManagement'
import { usePlayBank } from '@/composables/usePlayBank'
import { useGroupManagement } from '@/composables/useGroupManagement'
import { useIPSchema } from '@/composables/useIPSchema'
import { Home, BookOpen, Plus, Save, X, AlertTriangle } from 'lucide-vue-next'
import type { Play, PlayVariableBinding, LabFormData } from '@/types/lab'

// Route and navigation
const route = useRoute()
const router = useRouter()
const courseId = computed(() => route.params.c_id as string)

// Lab management
const {
  parts,
  currentPart,
  isLoading: isLabLoading,
  hasUnsavedChanges,
  addPart,
  selectPart,
  updatePartTitle,
  updatePartContent,
  updatePartPlay,
  saveLab,
  validateLab
} = useLabManagement()

// Play bank integration
const {
  plays,
  isLoading: isPlaysLoading,
  loadPlays
} = usePlayBank()

// Group management
const {
  groups,
  isLoading: isGroupsLoading,
  loadGroups,
  uploadStudentCSV,
  assignStudentToGroup,
  balanceGroups,
  exportGroups
} = useGroupManagement(courseId.value)

// IP Schema management
const {
  schema,
  isConfigured,
  ipMappings,
  configure,
  generateIPs,
  validateConfiguration
} = useIPSchema()

// Form state
const labTitle = ref('')
const labDescription = ref('')
const groupsRequired = ref(false)
const showPlayModal = ref(false)
const showPlayCreationModal = ref(false)
const showIPSchemaManager = ref(false)
const showGroupManagement = ref(false)
const showUnsavedDialog = ref(false)
const pendingNavigation = ref<string | null>(null)

// Current part data
const currentPartData = computed(() => {
  return parts.value[currentPart.value] || null
})

const selectedPlay = computed(() => {
  if (!currentPartData.value?.playId) return null
  return plays.value.find(play => play.id === currentPartData.value?.playId) || null
})

// Validation
const canSave = computed(() => {
  const validation = validateLab()
  const ipSchemaValid = !groupsRequired.value || isConfigured.value
  return validation.isValid && labTitle.value.trim() !== '' && ipSchemaValid
})

const validationErrors = computed(() => {
  const validation = validateLab()
  const errors = [...validation.errors]
  
  if (!labTitle.value.trim()) {
    errors.unshift('Lab title is required')
  }
  
  if (groupsRequired.value && !isConfigured.value) {
    errors.push('IP schema configuration is required for group-based labs')
  }
  
  return errors
})

// Event handlers
const handlePartSelect = (index: number) => {
  selectPart(index)
}

const handleAddPart = () => {
  addPart()
}

const handleTitleUpdate = (title: string) => {
  updatePartTitle(currentPart.value, title)
}

const handleContentUpdate = (content: string) => {
  updatePartContent(currentPart.value, content)
}

const handleOpenPlayModal = () => {
  showPlayModal.value = true
}

const handleOpenPlayCreation = () => {
  showPlayCreationModal.value = true
}

const handleOpenIPSchemaManager = () => {
  showIPSchemaManager.value = true
}

const handlePlaySelect = (play: Play, variables: PlayVariableBinding[]) => {
  const variableBindings = variables.reduce((acc, binding) => {
    acc[binding.variableName] = binding.value
    return acc
  }, {} as Record<string, any>)
  
  updatePartPlay(currentPart.value, play.id, variableBindings)
  showPlayModal.value = false
  toast.success(`Play "${play.name}" selected for Part ${currentPart.value + 1}`)
}

const handleClearPlay = () => {
  updatePartPlay(currentPart.value, null)
  toast.info(`Play cleared from Part ${currentPart.value + 1}`)
}

const handleSave = async () => {
  if (!canSave.value) {
    toast.error('Please fix validation errors before saving')
    return
  }

  try {
    const labData: LabFormData = {
      title: labTitle.value,
      description: labDescription.value,
      parts: parts.value.map(({ id, ...part }) => part),
      groupsRequired: groupsRequired.value,
      ipSchema: groupsRequired.value ? schema.value : undefined
    }

    const response = await saveLab(courseId.value, labData)
    
    if (response.success) {
      toast.success('Lab created successfully!')
      router.push(`/courses/${courseId.value}/labs`)
    } else {
      toast.error(response.error?.message || 'Failed to create lab')
    }
  } catch (error) {
    console.error('Save error:', error)
    toast.error('Failed to create lab. Please try again.')
  }
}

const handleCancel = () => {
  if (hasUnsavedChanges.value) {
    pendingNavigation.value = `/courses/${courseId.value}/labs`
    showUnsavedDialog.value = true
  } else {
    router.push(`/courses/${courseId.value}/labs`)
  }
}

const handleConfirmNavigation = () => {
  if (pendingNavigation.value) {
    router.push(pendingNavigation.value)
  }
  showUnsavedDialog.value = false
  pendingNavigation.value = null
}

const handleCancelNavigation = () => {
  showUnsavedDialog.value = false
  pendingNavigation.value = null
}

// Group management event handlers
const handleUploadCSV = async (file: File, options: { hasGroups: boolean; autoBalance: boolean }) => {
  try {
    await uploadStudentCSV(file, options.hasGroups)
    toast.success('Student list uploaded successfully')
    await loadGroups()
  } catch (error) {
    console.error('CSV upload failed:', error)
    toast.error('Failed to upload student list')
  }
}

const handleRefreshGroups = async () => {
  try {
    await loadGroups()
    toast.success('Groups refreshed')
  } catch (error) {
    console.error('Failed to refresh groups:', error)
    toast.error('Failed to refresh groups')
  }
}

const handleBalanceGroups = async () => {
  try {
    await balanceGroups()
    toast.success('Groups balanced successfully')
    await loadGroups()
  } catch (error) {
    console.error('Failed to balance groups:', error)
    toast.error('Failed to balance groups')
  }
}

const handleExportGroups = async () => {
  try {
    await exportGroups()
    toast.success('Groups exported successfully')
  } catch (error) {
    console.error('Failed to export groups:', error)
    toast.error('Failed to export groups')
  }
}

const handleAssignStudent = async (studentId: string, groupNumber: number) => {
  try {
    await assignStudentToGroup(studentId, groupNumber)
    toast.success('Student assigned to group')
    await loadGroups()
  } catch (error) {
    console.error('Failed to assign student:', error)
    toast.error('Failed to assign student to group')
  }
}

const handleEditGroup = (group: any) => {
  // For now, just show a toast - this could be expanded to open an edit modal
  toast.info(`Edit functionality for Group ${group.groupNumber} - Coming soon`)
}

const handleDeleteGroup = async (group: any) => {
  // This would need to be implemented in the useGroupManagement composable
  toast.info(`Delete functionality for Group ${group.groupNumber} - Coming soon`)
}

// Navigation guard
onBeforeUnmount(() => {
  if (hasUnsavedChanges.value) {
    // In a real app, you might want to show a browser confirmation dialog
    console.warn('Leaving page with unsaved changes')
  }
})

// Load initial data
onMounted(async () => {
  await Promise.all([
    loadPlays(),
    groupsRequired.value ? loadGroups() : Promise.resolve()
  ])
})

// Watch for groups requirement changes
watch(groupsRequired, async (newValue) => {
  if (newValue && groups.value.length === 0) {
    await loadGroups()
  }
})

// Page title
useHead({
  title: 'Create Lab - NetGrader'
})
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Header with Breadcrumb -->
    <div class="">
      <div class="container mx-auto px-4 py-4">
        <Breadcrumb class="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" class="flex items-center">
                <Home class="w-4 h-4 mr-1" />
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink :href="`/courses/${courseId}`">
                Course {{ courseId }}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink :href="`/courses/${courseId}/labs`">
                Labs
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Create Lab</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-foreground">Create Lab</h1>
            <p class="text-muted-foreground mt-1">
              Design a new laboratory exercise for your course
            </p>
          </div>
          
          <div class="flex items-center space-x-2">
            <Badge v-if="hasUnsavedChanges" variant="secondary">
              Unsaved Changes
            </Badge>
            <Badge v-if="parts.length > 0" variant="outline">
              {{ parts.length }} Part{{ parts.length !== 1 ? 's' : '' }}
            </Badge>
          </div>
        </div>
      </div>
    </div>

    <!-- Lab Configuration -->
    <div class="container mx-auto px-4 py-6">
      <Card class="mb-6">
        <CardHeader>
          <CardTitle class="flex items-center">
            <BookOpen class="w-5 h-5 mr-2" />
            Lab Information
          </CardTitle>
          <CardDescription>
            Configure the basic information for your lab
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="lab-title">Lab Title *</Label>
              <Input
                id="lab-title"
                v-model="labTitle"
                placeholder="Enter lab title..."
                :class="{ 'border-destructive': !labTitle.trim() && labTitle !== '' }"
              />
            </div>
            
            <div class="space-y-2">
              <Label for="groups-required" class="flex items-center space-x-2">
                <span>Group Management</span>
              </Label>
              <div class="flex items-center space-x-2">
                <Switch
                  id="groups-required"
                  v-model:checked="groupsRequired"
                />
                <Label for="groups-required" class="text-sm text-muted-foreground">
                  Enable group-based assignments
                </Label>
              </div>
            </div>
          </div>
          
          <div class="space-y-2">
            <Label for="lab-description">Description</Label>
            <Textarea
              id="lab-description"
              v-model="labDescription"
              placeholder="Describe the purpose and objectives of this lab..."
              rows="3"
            />
          </div>

          <!-- IP Schema Configuration Section -->
          <div v-if="groupsRequired" class="pt-4 border-t space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h4 class="font-medium">Network Configuration</h4>
                <p class="text-sm text-muted-foreground">
                  Configure IP schema and device assignments for students
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                @click="handleOpenIPSchemaManager"
              >
                <Plus class="w-4 h-4 mr-2" />
                Configure Network
              </Button>
            </div>

            <!-- IP Schema Status -->
            <div v-if="isConfigured" class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center space-x-2">
                  <div class="w-2 h-2 bg-green-500 rounded-full"/>
                  <span class="text-sm font-medium text-green-800 dark:text-green-300">Network Schema Configured</span>
                </div>
                <Badge variant="secondary" class="text-xs">
                  {{ Object.keys(ipMappings).length }} variables
                </Badge>
              </div>
              <div class="text-sm text-green-700 dark:text-green-400 space-y-1">
                <div>Base Network: <code class="bg-green-100 dark:bg-green-800 px-1 py-0.5 rounded">{{ schema.networkConfig?.baseNetwork }}/{{ schema.networkConfig?.subnetMask }}</code></div>
                <div>{{ schema.devices?.length || 0 }} device{{ (schema.devices?.length || 0) !== 1 ? 's' : '' }} configured</div>
                <div>{{ schema.students?.length || 0 }} student{{ (schema.students?.length || 0) !== 1 ? 's' : '' }} assigned</div>
              </div>
            </div>

            <!-- Student Groups Section -->
            <div class="flex items-center justify-between">
              <div>
                <h4 class="font-medium">Student Groups</h4>
                <p class="text-sm text-muted-foreground">
                  Manage student group assignments
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                @click="showGroupManagement = true"
              >
                <Plus class="w-4 h-4 mr-2" />
                Manage Groups
              </Button>
            </div>
            
            <div v-if="groups.length > 0" class="space-y-3">
              <div class="text-sm text-muted-foreground">
                {{ groups.length }} group{{ groups.length !== 1 ? 's' : '' }} configured
              </div>
              
              <!-- IP Variable Preview -->
              <div v-if="isConfigured && Object.keys(ipMappings).length > 0" class="bg-muted/50 rounded-lg p-3">
                <h5 class="text-sm font-medium mb-2">IP Variable Preview</h5>
                <p class="text-xs text-muted-foreground mb-2">
                  Example IP assignments for first group:
                </p>
                <div class="space-y-1 text-xs">
                  <div 
                    v-for="(ip, variable) in Object.entries(ipMappings).slice(0, 4)" 
                    :key="variable"
                    class="flex justify-between"
                  >
                    <span class="font-mono">{{ variable }}</span>
                    <span class="text-muted-foreground">→</span>
                    <span class="font-mono text-green-600 dark:text-green-400">{{ ip }}</span>
                  </div>
                  <div v-if="Object.keys(ipMappings).length > 4" class="text-center text-muted-foreground">
                    ... and {{ Object.keys(ipMappings).length - 4 }} more variables
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Main Editor Layout -->
    <div class="container mx-auto flex-1 flex px-4">
      <!-- Part Sidebar -->
      <PartSidebar
        :parts="parts"
        :current-part="currentPart"
        :can-add-parts="true"
        :show-status="false"
        :user-role="'lecturer'"
        :sequential-access="false"
        @select-part="handlePartSelect"
        @add-part="handleAddPart"
      />

      <!-- Content Editor -->
      <div class="flex-1 flex flex-col">
        <ClientOnlyTextEditor
          v-if="currentPartData"
          :model-value="currentPartData.content"
          :title="currentPartData.title"
          :selected-play="selectedPlay"
          @update:model-value="handleContentUpdate"
          @update:title="handleTitleUpdate"
          @open-play-modal="handleOpenPlayModal"
          @clear-play="handleClearPlay"
        />
        
        <div v-else class="flex-1 flex items-center justify-center text-muted-foreground">
          <div class="text-center">
            <BookOpen class="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No parts available. Click "Add Part" to get started.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Bar -->
    <div class="border-t border-border bg-card">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <!-- Validation Errors -->
            <div v-if="validationErrors.length > 0" class="flex items-center space-x-2 text-destructive">
              <AlertTriangle class="w-4 h-4" />
              <span class="text-sm">{{ validationErrors.length }} error{{ validationErrors.length !== 1 ? 's' : '' }}</span>
            </div>
            
            <!-- Success Indicator -->
            <div v-else-if="canSave" class="flex items-center space-x-2 text-green-600 dark:text-green-400">
              <div class="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full" />
              <span class="text-sm">Ready to save</span>
            </div>
          </div>

          <div class="flex items-center space-x-3">
            <Button
              variant="outline"
              :disabled="isLabLoading"
              @click="handleCancel"
            >
              <X class="w-4 h-4 mr-2" />
              Cancel
            </Button>
            
            <Button
              :disabled="!canSave || isLabLoading"
              @click="handleSave"
            >
              <Save v-if="!isLabLoading" class="w-4 h-4 mr-2" />
              <div v-else class="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"/>
              {{ isLabLoading ? 'Saving...' : 'Save Lab' }}
            </Button>
          </div>
        </div>
        
        <!-- Validation Errors List -->
        <div v-if="validationErrors.length > 0" class="mt-3 pt-3 border-t">
          <div class="text-sm text-destructive space-y-1">
            <div v-for="error in validationErrors" :key="error" class="flex items-center space-x-2">
              <div class="w-1 h-1 bg-destructive rounded-full" />
              <span>{{ error }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Play Selection Modal -->
    <PlaySelectionModal
      v-model:open="showPlayModal"
      :plays="plays"
      :is-loading="isPlaysLoading"
      @select-play="handlePlaySelect"
    />

    <!-- Play Creation Modal -->
    <PlayCreationModal
      v-model:open="showPlayCreationModal"
      :context-info="{
        course: courseId,
        labOrExam: 'Lab',
        part: `Part ${currentPart + 1}`,
        availableDevices: []
      }"
    />

    <!-- IP Schema Manager Modal -->
    <Dialog v-model:open="showIPSchemaManager">
      <DialogContent class="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Network Configuration</DialogTitle>
          <DialogDescription>
            Configure IP schema and device assignments for personalized student networks
          </DialogDescription>
        </DialogHeader>
        
        <div class="flex-1 overflow-y-auto">
          <IPSchemaManager />
        </div>
        
        <DialogFooter>
          <Button variant="outline" @click="showIPSchemaManager = false">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Group Management Modal -->
    <Dialog v-model:open="showGroupManagement">
      <DialogContent class="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Group Management</DialogTitle>
          <DialogDescription>
            Manage student groups for this lab
          </DialogDescription>
        </DialogHeader>
        
        <div class="max-h-[60vh] overflow-y-auto">
          <GroupManagement
            v-if="groupsRequired"
            :course-id="courseId"
            :groups="groups"
            :is-loading="isGroupsLoading"
            @upload-csv="handleUploadCSV"
            @refresh-groups="handleRefreshGroups"
            @balance-groups="handleBalanceGroups"
            @export-groups="handleExportGroups"
            @assign-student="handleAssignStudent"
            @edit-group="handleEditGroup"
            @delete-group="handleDeleteGroup"
          />
        </div>
        
        <DialogFooter>
          <Button variant="outline" @click="showGroupManagement = false">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Unsaved Changes Dialog -->
    <AlertDialog v-model:open="showUnsavedDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes that will be lost if you leave this page. 
            Are you sure you want to continue?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="handleCancelNavigation">
            Stay on Page
          </AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="handleConfirmNavigation">
            Leave Without Saving
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>