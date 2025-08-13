<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold">Group Management</h3>
        <p class="text-sm text-muted-foreground">
          Manage student groups for collaborative lab work (up to 32 groups)
        </p>
      </div>
      
      <div class="flex items-center space-x-2">
        <Badge variant="outline">
          {{ groups.length }}/32 Groups
        </Badge>
        <Button 
          variant="ghost" 
          size="sm" 
          :disabled="isLoading"
          @click="refreshGroups"
        >
          <RefreshCw :class="['w-4 h-4', isLoading && 'animate-spin']" />
        </Button>
      </div>
    </div>
    
    <!-- CSV Upload Section -->
    <Card>
      <CardHeader>
        <CardTitle class="text-base">Upload Student List</CardTitle>
        <CardDescription>
          Upload a CSV file with student information. Include group assignments or let the system auto-assign.
        </CardDescription>
      </CardHeader>
      
      <CardContent class="space-y-4">
        <!-- File Upload -->
        <div class="space-y-2">
          <Label>CSV File</Label>
          <div class="flex items-center space-x-2">
            <Input
              ref="fileInputRef"
              type="file"
              accept=".csv"
              :class="[
                'flex-1',
                { 'border-destructive': fileError }
              ]"
              @change="handleFileSelect"
            />
            <LoadingButton
              :loading="isUploading"
              :disabled="!selectedFile || !!fileError"
              text="Upload"
              loading-text="Uploading..."
              size="sm"
              @click="uploadFile"
            >
              <template #icon>
                <Upload class="w-4 h-4 mr-2" />
              </template>
            </LoadingButton>
          </div>
          <div v-if="fileError" class="flex items-center space-x-1 text-sm text-destructive">
            <AlertCircle class="w-4 h-4" />
            <span>{{ fileError }}</span>
          </div>
        </div>
        
        <!-- Upload Options -->
        <div class="space-y-3">
          <div class="flex items-center space-x-2">
            <input
              id="hasGroups"
              v-model="uploadOptions.hasGroups"
              type="checkbox"
              class="rounded border-border"
            >
            <Label for="hasGroups" class="text-sm">
              CSV includes group assignments (column: group_number)
            </Label>
          </div>
          
          <div class="flex items-center space-x-2">
            <input
              id="autoBalance"
              v-model="uploadOptions.autoBalance"
              type="checkbox"
              class="rounded border-border"
              :disabled="uploadOptions.hasGroups"
            >
            <Label for="autoBalance" class="text-sm">
              Auto-balance groups evenly
            </Label>
          </div>
        </div>
        
        <!-- CSV Format Help -->
        <div class="bg-muted/50 rounded-lg p-3">
          <div class="text-sm font-medium mb-2">Expected CSV Format:</div>
          <div class="text-xs text-muted-foreground space-y-1">
            <div><strong>Without groups:</strong> student_id,name,email</div>
            <div><strong>With groups:</strong> student_id,name,email,group_number</div>
            <div class="mt-2">
              <strong>Example:</strong><br>
              61234567,John Doe,john@example.com,1<br>
              61234568,Jane Smith,jane@example.com,1
            </div>
          </div>
        </div>
        
        <!-- Upload Status -->
        <div v-if="uploadStatus" class="p-3 rounded-lg" :class="uploadStatusClass">
          <div class="flex items-center space-x-2">
            <CheckCircle v-if="uploadStatus.type === 'success'" class="w-4 h-4" />
            <AlertCircle v-else class="w-4 h-4" />
            <span class="text-sm font-medium">{{ uploadStatus.message }}</span>
          </div>
          <div v-if="uploadStatus.details" class="text-xs mt-1 opacity-80">
            {{ uploadStatus.details }}
          </div>
        </div>
      </CardContent>
    </Card>
    
    <!-- Groups Overview -->
    <Card>
      <CardHeader>
        <CardTitle class="text-base">Groups Overview</CardTitle>
        <CardDescription>
          Current group assignments and statistics
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <!-- Loading State -->
        <div v-if="isLoading" class="py-8">
          <LoadingSpinner 
            size="md" 
            text="Loading groups..." 
            container-class="py-4"
          />
        </div>
        
        <!-- Empty State -->
        <div v-else-if="groups.length === 0" class="text-center py-8">
          <Users class="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p class="text-muted-foreground">No groups created yet</p>
          <p class="text-sm text-muted-foreground">Upload a CSV file to get started</p>
        </div>
        
        <!-- Groups Grid -->
        <div v-else class="space-y-4">
          <!-- Statistics -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-muted/50 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold">{{ totalStudents }}</div>
              <div class="text-sm text-muted-foreground">Total Students</div>
            </div>
            <div class="bg-muted/50 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold">{{ groups.length }}</div>
              <div class="text-sm text-muted-foreground">Active Groups</div>
            </div>
            <div class="bg-muted/50 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold">{{ averageGroupSize }}</div>
              <div class="text-sm text-muted-foreground">Avg Group Size</div>
            </div>
            <div class="bg-muted/50 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold">{{ unassignedStudents }}</div>
              <div class="text-sm text-muted-foreground">Unassigned</div>
            </div>
          </div>
          
          <!-- Groups List -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <h4 class="font-medium">Group Details</h4>
              <div class="flex items-center space-x-2">
                <LoadingButton
                  :loading="isBalancing"
                  text="Balance Groups"
                  loading-text="Balancing..."
                  variant="outline"
                  size="sm"
                  @click="balanceGroups"
                >
                  <template #icon>
                    <Scale class="w-4 h-4 mr-2" />
                  </template>
                </LoadingButton>
                <LoadingButton
                  :loading="isExporting"
                  text="Export"
                  loading-text="Exporting..."
                  variant="outline"
                  size="sm"
                  @click="exportGroups"
                >
                  <template #icon>
                    <Download class="w-4 h-4 mr-2" />
                  </template>
                </LoadingButton>
              </div>
            </div>
            
            <div class="grid gap-3 max-h-96 overflow-y-auto">
              <div
                v-for="group in sortedGroups"
                :key="group.id"
                class="border rounded-lg p-3 hover:bg-accent/50 transition-colors"
              >
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center space-x-2">
                    <Badge variant="outline">Group {{ group.groupNumber }}</Badge>
                    <span class="text-sm text-muted-foreground">
                      {{ group.students.length }} students
                    </span>
                  </div>
                  
                  <div class="flex items-center space-x-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      @click="editGroup(group)"
                    >
                      <Edit class="w-3 h-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      class="text-destructive hover:text-destructive"
                      @click="deleteGroup(group)"
                    >
                      <Trash2 class="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                
                <div class="space-y-1">
                  <div
                    v-for="student in group.students.slice(0, 3)"
                    :key="student.id"
                    class="text-sm flex items-center justify-between"
                  >
                    <span>{{ student.name }}</span>
                    <span class="text-muted-foreground">{{ student.studentId }}</span>
                  </div>
                  
                  <div v-if="group.students.length > 3" class="text-xs text-muted-foreground">
                    +{{ group.students.length - 3 }} more students
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    
    <!-- Individual Student Management -->
    <Card v-if="unassignedStudentsList.length > 0">
      <CardHeader>
        <CardTitle class="text-base">Unassigned Students</CardTitle>
        <CardDescription>
          Students not currently assigned to any group
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div class="space-y-2 max-h-48 overflow-y-auto">
          <div
            v-for="student in unassignedStudentsList"
            :key="student.id"
            class="flex items-center justify-between p-2 border rounded"
          >
            <div>
              <div class="font-medium text-sm">{{ student.name }}</div>
              <div class="text-xs text-muted-foreground">{{ student.studentId }}</div>
            </div>
            
            <div class="flex items-center space-x-2">
              <Select @update:model-value="(value) => assignStudentToGroup(student.id, parseInt(value))">
                <SelectTrigger class="w-32">
                  <SelectValue placeholder="Assign to..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem 
                    v-for="group in groups" 
                    :key="group.id" 
                    :value="group.groupNumber.toString()"
                  >
                    Group {{ group.groupNumber }}
                  </SelectItem>
                  <SelectItem value="new">New Group</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Upload, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Users, 
  Scale, 
  Download,
  Edit,
  Trash2,
  Loader2
} from 'lucide-vue-next'
// Removed loading-states dependency - using inline loading components
import type { StudentGroup, Student } from '@/types/lab'

interface Props {
  courseId: string
  groups: StudentGroup[]
  isLoading?: boolean
}

interface Emits {
  (e: 'upload-csv', file: File, options: UploadOptions): void
  (e: 'refresh-groups'): void
  (e: 'balance-groups'): void
  (e: 'export-groups'): void
  (e: 'assign-student', studentId: string, groupNumber: number): void
  (e: 'edit-group', group: StudentGroup): void
  (e: 'delete-group', group: StudentGroup): void
}

interface UploadOptions {
  hasGroups: boolean
  autoBalance: boolean
}

interface UploadStatus {
  type: 'success' | 'error'
  message: string
  details?: string
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false
})

const emit = defineEmits<Emits>()

const fileInputRef = ref<HTMLInputElement>()
const selectedFile = ref<File | null>(null)
const isUploading = ref(false)
const isBalancing = ref(false)
const isExporting = ref(false)

const uploadOptions = ref<UploadOptions>({
  hasGroups: false,
  autoBalance: true
})

const uploadStatus = ref<UploadStatus | null>(null)
const fileError = ref<string | null>(null)

const totalStudents = computed(() => {
  return props.groups.reduce((total, group) => total + group.students.length, 0)
})

const averageGroupSize = computed(() => {
  if (props.groups.length === 0) return 0
  return Math.round(totalStudents.value / props.groups.length)
})

const unassignedStudents = computed(() => {
  // This would be calculated based on total enrolled students vs assigned students
  // For now, we'll return 0 as a placeholder
  return 0
})

const unassignedStudentsList = computed(() => {
  // This would contain actual unassigned students
  // For now, return empty array as placeholder
  return [] as Student[]
})

const sortedGroups = computed(() => {
  return [...props.groups].sort((a, b) => a.groupNumber - b.groupNumber)
})

const uploadStatusClass = computed(() => {
  if (!uploadStatus.value) return ''
  
  return uploadStatus.value.type === 'success' 
    ? 'bg-green-50 border border-green-200 text-green-800'
    : 'bg-red-50 border border-red-200 text-red-800'
})

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  fileError.value = null
  uploadStatus.value = null
  
  if (file) {
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      fileError.value = 'Please select a CSV file'
      selectedFile.value = null
      return
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      fileError.value = 'File size must be less than 5MB'
      selectedFile.value = null
      return
    }
    
    selectedFile.value = file
  }
}

const uploadFile = async () => {
  if (!selectedFile.value) return
  
  isUploading.value = true
  uploadStatus.value = null
  
  try {
    emit('upload-csv', selectedFile.value, uploadOptions.value)
    
    // Simulate upload success (in real implementation, this would be handled by parent)
    setTimeout(() => {
      uploadStatus.value = {
        type: 'success',
        message: 'CSV uploaded successfully',
        details: `Processed ${selectedFile.value?.name}`
      }
      selectedFile.value = null
      if (fileInputRef.value) {
        fileInputRef.value.value = ''
      }
      isUploading.value = false
    }, 2000)
  } catch (error) {
    uploadStatus.value = {
      type: 'error',
      message: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
    isUploading.value = false
  }
}

const refreshGroups = () => {
  emit('refresh-groups')
}

const balanceGroups = async () => {
  isBalancing.value = true
  try {
    emit('balance-groups')
  } finally {
    setTimeout(() => {
      isBalancing.value = false
    }, 1500)
  }
}

const exportGroups = async () => {
  isExporting.value = true
  try {
    emit('export-groups')
  } finally {
    setTimeout(() => {
      isExporting.value = false
    }, 1000)
  }
}

const assignStudentToGroup = (studentId: string, groupNumber: number) => {
  emit('assign-student', studentId, groupNumber)
}

const editGroup = (group: StudentGroup) => {
  emit('edit-group', group)
}

const deleteGroup = (group: StudentGroup) => {
  if (confirm(`Are you sure you want to delete Group ${group.groupNumber}? This will unassign all students in the group.`)) {
    emit('delete-group', group)
  }
}

onMounted(() => {
  refreshGroups()
})
</script>