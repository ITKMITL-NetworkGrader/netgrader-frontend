<template>
  <div class="space-y-6">
    <!-- Upload Section -->
    <div class="space-y-4">
      <!-- Allocation Strategy -->
      <div class="space-y-3">
        <Label>IP Allocation Strategy</Label>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            class="border-2 rounded-lg p-4 cursor-pointer transition-colors"
            :class="{ 
              'border-primary bg-primary/5': allocationStrategy === 'group_based',
              'border-border hover:border-primary/50': allocationStrategy !== 'group_based'
            }"
            @click="updateStrategy('group_based')"
          >
            <div class="flex items-start space-x-3">
              <div
class="w-5 h-5 rounded-full border-2 mt-0.5"
                   :class="{ 
                     'border-primary bg-primary': allocationStrategy === 'group_based',
                     'border-muted-foreground': allocationStrategy !== 'group_based'
                   }">
                <div
v-if="allocationStrategy === 'group_based'" 
                     class="w-2 h-2 bg-primary-foreground rounded-full m-0.5"/>
              </div>
              <div>
                <h4 class="font-medium">Group-Based (Labs)</h4>
                <p class="text-sm text-muted-foreground">
                  Generate IPs based on group numbers. Best for lab assignments where students work in teams.
                </p>
              </div>
            </div>
          </div>
          
          <div 
            class="border-2 rounded-lg p-4 cursor-pointer transition-colors"
            :class="{ 
              'border-primary bg-primary/5': allocationStrategy === 'student_id_based',
              'border-border hover:border-primary/50': allocationStrategy !== 'student_id_based'
            }"
            @click="updateStrategy('student_id_based')"
          >
            <div class="flex items-start space-x-3">
              <div
class="w-5 h-5 rounded-full border-2 mt-0.5"
                   :class="{ 
                     'border-primary bg-primary': allocationStrategy === 'student_id_based',
                     'border-muted-foreground': allocationStrategy !== 'student_id_based'
                   }">
                <div
v-if="allocationStrategy === 'student_id_based'" 
                     class="w-2 h-2 bg-primary-foreground rounded-full m-0.5"/>
              </div>
              <div>
                <h4 class="font-medium">Student ID-Based (Exams)</h4>
                <p class="text-sm text-muted-foreground">
                  Generate personalized IPs based on student IDs. Prevents cheating in exams.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- File Upload -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <Label>Student Data</Label>
          <div class="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              @click="showSampleModal = true"
            >
              <Icon name="lucide:eye" class="w-4 h-4 mr-2" />
              View Sample
            </Button>
            <Button
              variant="outline"
              size="sm"
              @click="downloadSample"
            >
              <Icon name="lucide:download" class="w-4 h-4 mr-2" />
              Download Sample
            </Button>
          </div>
        </div>

        <!-- Drop Zone -->
        <div
          ref="dropZone"
          class="border-2 border-dashed rounded-lg p-8 text-center transition-colors"
          :class="{
            'border-primary bg-primary/5': isDragging,
            'border-border': !isDragging
          }"
          @dragenter.prevent="isDragging = true"
          @dragover.prevent
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
        >
          <Icon name="lucide:upload-cloud" class="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 class="text-lg font-medium mb-2">Upload Student CSV File</h3>
          <p class="text-muted-foreground mb-4">
            Drop your CSV file here, or click to browse
          </p>
          
          <input
            ref="fileInput"
            type="file"
            accept=".csv,.txt"
            class="hidden"
            @change="handleFileSelect"
          >
          
          <Button @click="$refs.fileInput?.click()">
            Choose File
          </Button>
          
          <div class="mt-4 text-sm text-muted-foreground">
            <p><strong>Format:</strong> StudentID;GroupNumber</p>
            <p><strong>Example:</strong> 65070232;1</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Processing Status -->
    <div v-if="isProcessing" class="flex items-center justify-center space-x-3 p-4 bg-muted/50 rounded-lg">
      <div class="w-5 h-5 animate-spin rounded-full border-2 border-current border-t-transparent"/>
      <span>Processing CSV file...</span>
    </div>

    <!-- Validation Results -->
    <div v-if="validationResult" class="space-y-4">
      <!-- Errors -->
      <Alert v-if="!validationResult.isValid" variant="destructive">
        <AlertCircle class="h-4 w-4" />
        <AlertTitle>CSV Validation Errors</AlertTitle>
        <AlertDescription>
          <ul class="list-disc list-inside space-y-1 mt-2">
            <li v-for="error in validationResult.errors" :key="error">
              {{ error }}
            </li>
          </ul>
        </AlertDescription>
      </Alert>

      <!-- Warnings -->
      <Alert v-if="validationResult.warnings?.length" variant="default">
        <Icon name="lucide:triangle-alert" class="h-4 w-4" />
        <AlertTitle>CSV Validation Warnings</AlertTitle>
        <AlertDescription>
          <ul class="list-disc list-inside space-y-1 mt-2">
            <li v-for="warning in validationResult.warnings" :key="warning">
              {{ warning }}
            </li>
          </ul>
        </AlertDescription>
      </Alert>

      <!-- Success and Stats -->
      <div
v-if="validationResult.isValid && validationResult.stats" 
           class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div class="flex items-center space-x-2 mb-3">
          <Icon name="lucide:check-circle" class="w-5 h-5 text-green-600 dark:text-green-400" />
          <h4 class="font-medium text-green-900 dark:text-green-100">CSV Upload Successful</h4>
        </div>
        
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600 dark:text-green-400">
              {{ validationResult.stats.totalStudents }}
            </div>
            <div class="text-green-700 dark:text-green-300">Total Students</div>
          </div>
          
          <div v-if="allocationStrategy === 'group_based'" class="text-center">
            <div class="text-2xl font-bold text-green-600 dark:text-green-400">
              {{ validationResult.stats.uniqueGroups }}
            </div>
            <div class="text-green-700 dark:text-green-300">Groups</div>
          </div>
          
          <div v-if="allocationStrategy === 'group_based'" class="text-center">
            <div class="text-2xl font-bold text-green-600 dark:text-green-400">
              {{ validationResult.stats.studentsWithGroups }}
            </div>
            <div class="text-green-700 dark:text-green-300">With Groups</div>
          </div>
          
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600 dark:text-green-400">
              {{ validationResult.stats.totalStudents - validationResult.stats.studentsWithGroups }}
            </div>
            <div class="text-green-700 dark:text-green-300">Without Groups</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Current Students Display -->
    <div v-if="students.length > 0" class="space-y-3">
      <div class="flex items-center justify-between">
        <h4 class="font-medium">Loaded Students ({{ students.length }})</h4>
        <div class="flex items-center space-x-2">
          <Button
v-if="allocationStrategy === 'group_based'" variant="outline" size="sm" 
                  @click="balanceGroups">
            <Icon name="lucide:balance-scale" class="w-4 h-4 mr-2" />
            Balance Groups
          </Button>
          <Button
variant="outline" size="sm" class="text-destructive hover:text-destructive" 
                  @click="clearStudents">
            <Icon name="lucide:x" class="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      <div class="max-h-64 overflow-y-auto border rounded-lg">
        <table class="w-full text-sm">
          <thead class="bg-muted/50 border-b sticky top-0">
            <tr>
              <th class="text-left p-2">Student ID</th>
              <th v-if="allocationStrategy === 'group_based'" class="text-left p-2">Group</th>
              <th class="text-left p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="student in students" :key="student.studentId" class="border-b hover:bg-muted/25">
              <td class="p-2 font-mono">{{ student.studentId }}</td>
              <td v-if="allocationStrategy === 'group_based'" class="p-2">
                <Badge v-if="student.groupNumber" variant="outline">
                  Group {{ student.groupNumber }}
                </Badge>
                <span v-else class="text-muted-foreground italic">No group</span>
              </td>
              <td class="p-2">
                <Badge v-if="validateStudentId(student.studentId)" variant="secondary" class="text-xs">
                  Valid
                </Badge>
                <Badge v-else variant="destructive" class="text-xs">
                  Invalid
                </Badge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Sample Modal -->
    <Dialog v-model:open="showSampleModal">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>CSV Format Sample</DialogTitle>
          <DialogDescription>
            Example of the expected CSV format for student data
          </DialogDescription>
        </DialogHeader>
        
        <div class="space-y-4">
          <div>
            <h4 class="font-medium mb-2">Required Format:</h4>
            <code class="block bg-muted p-3 rounded text-sm">
              StudentID;GroupNumber<br>
              65070232;1<br>
              65070233;1<br>
              65070234;2<br>
              65070235;2
            </code>
          </div>
          
          <div class="space-y-2 text-sm text-muted-foreground">
            <p><strong>Rules:</strong></p>
            <ul class="list-disc list-inside space-y-1 ml-2">
              <li>Student ID must be exactly 8 digits</li>
              <li>Group number is required for labs, optional for exams</li>
              <li>Use semicolon (;) as separator</li>
              <li>No headers in the file</li>
            </ul>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" @click="showSampleModal = false">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertCircle } from 'lucide-vue-next'
import type { StudentCSVRow, CSVValidationResult } from '@/types/ipSchema'

// Props
interface Props {
  students?: StudentCSVRow[]
  allocationStrategy?: 'group_based' | 'student_id_based'
}

const props = withDefaults(defineProps<Props>(), {
  students: () => [],
  allocationStrategy: 'group_based'
})

// Emits
const emit = defineEmits<{
  'upload:students': [students: StudentCSVRow[]]
  'update:strategy': [strategy: 'group_based' | 'student_id_based']
}>()

// Composables
const { parseCSV, validateStudentId, generateSampleCSV, balanceGroups: autoBalanceGroups } = useCSVProcessor()

// Reactive state
const isDragging = ref(false)
const isProcessing = ref(false)
const validationResult = ref<CSVValidationResult | null>(null)
const showSampleModal = ref(false)
const fileInput = ref<HTMLInputElement>()
const dropZone = ref<HTMLElement>()

// Methods
const updateStrategy = (strategy: 'group_based' | 'student_id_based') => {
  emit('update:strategy', strategy)
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    processFile(file)
  }
}

const handleDrop = (event: DragEvent) => {
  isDragging.value = false
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    processFile(files[0])
  }
}

const processFile = async (file: File) => {
  if (!file.name.match(/\.(csv|txt)$/i)) {
    validationResult.value = {
      isValid: false,
      errors: ['Please select a CSV or TXT file'],
      warnings: []
    }
    return
  }

  isProcessing.value = true
  validationResult.value = null

  try {
    const content = await readFileContent(file)
    const result = parseCSV(content)
    validationResult.value = result

    if (result.isValid && result.parsedData) {
      emit('upload:students', result.parsedData)
    }
  } catch (error) {
    validationResult.value = {
      isValid: false,
      errors: [`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: []
    }
  } finally {
    isProcessing.value = false
  }
}

const readFileContent = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      resolve(content)
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

const downloadSample = () => {
  const sampleCSV = generateSampleCSV(props.allocationStrategy === 'group_based', 10)
  const blob = new Blob([sampleCSV], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sample-students-${props.allocationStrategy}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const balanceGroups = () => {
  if (props.students.length > 0) {
    const balanced = autoBalanceGroups(props.students)
    emit('upload:students', balanced)
  }
}

const clearStudents = () => {
  emit('upload:students', [])
  validationResult.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
</script>