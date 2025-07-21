<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { AlertCircle, Clock, User, FileText } from 'lucide-vue-next'
import PartSidebar from '@/components/lab/PartSidebar.vue'
import TextEditor from '@/components/lab/TextEditor.vue'
import GradingStatus from '@/components/lab/GradingStatus.vue'
import StudentConfiguration from '@/components/exam/StudentConfiguration.vue'
import { useExamManagement } from '@/composables/useExamManagement'
import { useExamGradingStatus } from '@/composables/useExamGradingStatus'
import { useVariableResolver } from '@/composables/useVariableResolver'
import type { Exam, LabPart, ExamConfiguration } from '@/types/lab'

const route = useRoute()
const router = useRouter()

const courseId = computed(() => route.params.c_id as string)
const examId = computed(() => route.params.e_id as string)

// Exam management
const { loadExam, isLoading: isLoadingExam } = useExamManagement(courseId.value)
const exam = ref<Exam | null>(null)
const parts = ref<LabPart[]>([])
const currentPart = ref(0)
const isLoading = ref(true)
const error = ref<string | null>(null)

// Student configuration and variable resolution
const { 
  resolveVariables, 
  generateExamConfig, 
  resolveExamVariables,
  generatePersonalizedContent,
  validateStudentAnswers,
  validatePersonalizedVariableResolution,
  generatePersonalizedVariablePreview
} = useVariableResolver()
const studentId = ref<string>('')
const studentConfig = ref<ExamConfiguration | null>(null)
const resolvedContent = ref('')
const personalizedParts = ref<LabPart[]>([])
const resolvedVariables = ref<Record<string, any>>({})

// Time tracking
const timeRemaining = ref<number>(0)
const timeLimit = ref<number>(0)
const examStartTime = ref<Date | null>(null)
const timeInterval = ref<NodeJS.Timeout | null>(null)

// Grading status for current part
const currentPartId = computed(() => {
  return parts.value[currentPart.value]?.id || ''
})

const {
  status: gradingStatus,
  gradingProgress,
  taskResults,
  totalScore,
  maxScore,
  submitForGrading,
  isSubmitting,
  validateExamAnswers,
  getExpectedAnswers
} = useExamGradingStatus(courseId.value, examId.value, currentPartId.value, studentConfig.value)

// Load exam data and student configuration
const loadExamData = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    const examData = await loadExam(examId.value)
    if (examData) {
      exam.value = examData
      parts.value = examData.parts.map(part => ({
        ...part,
        status: 'not_submitted' // Will be updated by individual grading status
      }))
      
      // Set time limit
      timeLimit.value = examData.timeLimit || 120 // Default 2 hours
      
      // Load student's personal configuration
      await loadStudentConfiguration()
      
      // Generate personalized content for all parts
      generatePersonalizedParts()
      
      // Start time tracking
      startTimeTracking()
      
      // Resolve variables for current part
      updateResolvedContent()
    } else {
      error.value = 'Exam not found'
    }
  } catch (err) {
    console.error('Failed to load exam:', err)
    error.value = 'Failed to load exam data'
  } finally {
    isLoading.value = false
  }
}

// Load student's personal exam configuration
const loadStudentConfiguration = async () => {
  try {
    const config = useRuntimeConfig()
    const baseURL = `${config.public.backend1url}/v0/api`
    
    // Get current student ID
    const studentResponse = await $fetch(`${baseURL}/auth/me`)
    if (studentResponse.success && studentResponse.data) {
      studentId.value = studentResponse.data.id
      
      // Get student's exam configuration from backend
      try {
        const configResponse = await $fetch(`${baseURL}/courses/${courseId.value}/exams/${examId.value}/students/me/config`)
        if (configResponse.success && configResponse.data) {
          studentConfig.value = configResponse.data
          
          // Validate the loaded configuration
          const validation = validatePersonalizedConfig()
          if (!validation.isValid) {
            console.warn('Loaded student configuration has validation errors:', validation.errors)
            // Still use the configuration but log warnings
          }
          
          console.log('Loaded personalized exam configuration for student:', {
            studentId: studentId.value,
            vlan1: studentConfig.value.vlan1,
            vlan2: studentConfig.value.vlan2,
            ipv4Subnet: studentConfig.value.ipv4Subnet,
            ipv6Subnet: studentConfig.value.ipv6Subnet,
            hasGeneratedAnswers: !!studentConfig.value.generatedAnswers
          })
        } else {
          throw new Error('Failed to load student configuration from backend')
        }
      } catch (configError) {
        console.warn('Backend configuration not available, generating fallback configuration:', configError)
        
        // Generate configuration using student ID algorithm (fallback)
        studentConfig.value = generateExamConfig(studentId.value, 1)
        
        // Validate the generated configuration
        const validation = validatePersonalizedConfig()
        if (!validation.isValid) {
          console.error('Generated fallback configuration is invalid:', validation.errors)
          error.value = `Configuration generation failed: ${validation.errors.join(', ')}`
          return
        }
        
        console.log('Generated fallback personalized configuration for student:', {
          studentId: studentId.value,
          vlan1: studentConfig.value.vlan1,
          vlan2: studentConfig.value.vlan2,
          ipv4Subnet: studentConfig.value.ipv4Subnet,
          ipv6Subnet: studentConfig.value.ipv6Subnet,
          source: 'generated_fallback'
        })
      }
      
      // Generate personalized content after loading/generating configuration
      generatePersonalizedParts()
      
      // Log personalized variable preview for debugging
      console.log('Personalized variables preview:', previewPersonalizedVariables())
      
      // Demonstrate personalized variable resolution
      const demonstration = demonstratePersonalizedResolution()
      if (demonstration) {
        console.log('✅ Personalized variable resolution is working correctly for student:', studentId.value)
      }
      
    } else {
      throw new Error('Failed to get current student information')
    }
  } catch (err) {
    console.error('Failed to load student configuration:', err)
    error.value = 'Failed to load your personalized exam configuration. Please refresh the page or contact support.'
  }
}

// Start time tracking for the exam
const startTimeTracking = () => {
  if (!exam.value?.timeLimit) return
  
  examStartTime.value = new Date()
  timeRemaining.value = exam.value.timeLimit * 60 // Convert minutes to seconds
  
  timeInterval.value = setInterval(() => {
    if (timeRemaining.value > 0) {
      timeRemaining.value--
    } else {
      // Time's up - auto-submit current part if possible
      handleTimeExpired()
    }
  }, 1000)
}

// Handle time expiration
const handleTimeExpired = () => {
  if (timeInterval.value) {
    clearInterval(timeInterval.value)
    timeInterval.value = null
  }
  
  // Auto-submit current part if grading is available
  if (canSubmitGrading.value) {
    handleSubmitGrading()
  }
  
  // Show time expired message
  error.value = 'Time limit exceeded. Exam has been automatically submitted.'
}

// Update resolved content when part changes using enhanced variable resolution
const updateResolvedContent = () => {
  const currentPartData = parts.value[currentPart.value]
  if (!currentPartData) {
    resolvedContent.value = ''
    resolvedVariables.value = {}
    return
  }
  
  if (!studentConfig.value) {
    console.warn('Student configuration not available for variable resolution')
    resolvedContent.value = currentPartData.content // Show unresolved content
    resolvedVariables.value = {}
    return
  }
  
  try {
    // Use enhanced exam variable resolution with personalized configuration
    const { resolvedContent: content, resolvedVariables: variables } = resolveExamVariables(
      currentPartData.content,
      studentConfig.value,
      currentPartData.playVariables || {}
    )
    
    // Validate that variable resolution worked correctly
    const expectedVariables = ['student_id', 'vlan1', 'vlan2', 'ipv4_subnet', 'ipv6_subnet']
    const validation = validatePersonalizedVariableResolution(
      currentPartData.content,
      studentConfig.value,
      expectedVariables
    )
    
    if (!validation.isValid) {
      console.warn('Variable resolution validation failed:', validation.errors)
      // Still use the resolved content but log warnings
    }
    
    resolvedContent.value = content
    resolvedVariables.value = variables
    
    // Enhanced logging for variable resolution debugging
    console.log('Personalized variable resolution completed:', {
      partId: currentPartData.id,
      partTitle: currentPartData.title,
      studentId: studentConfig.value.studentId,
      validationStatus: validation.isValid ? 'valid' : 'warnings',
      validationErrors: validation.errors,
      resolvedVariableCount: Object.keys(variables).length,
      personalizedNetworking: {
        vlan1: variables.vlan1,
        vlan2: variables.vlan2,
        ipv4_subnet: variables.ipv4_subnet,
        ipv6_subnet: variables.ipv6_subnet,
        network_address: variables.network_address,
        broadcast_address: variables.broadcast_address,
        gateway_ipv4: variables.gateway_ipv4,
        out_interface_ipv4: variables.out_interface_ipv4,
        out_interface_ipv6: variables.out_interface_ipv6
      },
      calculatedValues: {
        dec2: variables.dec2,
        dec3: variables.dec3,
        router_id: variables.router_id,
        ospf_area: variables.ospf_area
      },
      uniquenessVerification: {
        studentSpecificVLANs: `${variables.vlan1}-${variables.vlan2}`,
        studentSpecificSubnet: variables.ipv4_subnet,
        studentSpecificInterfaces: `${variables.out_interface_ipv4}/${variables.out_interface_ipv6}`
      }
    })
    
    // Generate and log complete personalized variable preview for debugging
    const variablePreview = generatePersonalizedVariablePreview(studentConfig.value)
    console.log('Complete personalized variable preview:', variablePreview)
    
  } catch (resolutionError) {
    console.error('Variable resolution failed:', resolutionError)
    
    // Fallback to unresolved content with error indication
    resolvedContent.value = `
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <h4 class="text-yellow-800 font-semibold">Variable Resolution Error</h4>
        <p class="text-yellow-700 text-sm mt-1">
          Some personalized variables could not be resolved. Please refresh the page or contact support.
        </p>
        <details class="mt-2">
          <summary class="cursor-pointer text-yellow-600 text-xs">Error Details</summary>
          <pre class="text-xs mt-1 text-yellow-600">${resolutionError instanceof Error ? resolutionError.message : 'Unknown error'}</pre>
        </details>
      </div>
      ${currentPartData.content}
    `
    resolvedVariables.value = {}
    
    error.value = 'Variable resolution failed. Some content may not display correctly.'
  }
}

// Generate personalized content for all parts
const generatePersonalizedParts = () => {
  if (!studentConfig.value || parts.value.length === 0) {
    personalizedParts.value = []
    return
  }
  
  personalizedParts.value = generatePersonalizedContent(parts.value, studentConfig.value)
}

// Handle part selection
const selectPart = (index: number) => {
  // Check if part is accessible (sequential access control)
  if (!isPartAccessible(index)) {
    return
  }
  
  currentPart.value = index
  updateResolvedContent()
}

// Check if a part is accessible based on completion status
const isPartAccessible = (index: number): boolean => {
  // First part is always accessible
  if (index === 0) return true
  
  // Check if all previous parts are completed
  for (let i = 0; i < index; i++) {
    const part = parts.value[i]
    if (!part.status || part.status !== 'graded') {
      return false
    }
  }
  
  return true
}

// Handle grading submission with exam-specific validation and personalized variables
const handleSubmitGrading = async () => {
  if (!studentConfig.value) {
    console.error('Student configuration not available for grading')
    error.value = 'Unable to submit for grading: Student configuration not loaded'
    return
  }

  if (!currentPartData.value?.playId) {
    console.error('No play assigned to current part')
    error.value = 'Unable to submit for grading: No grading criteria assigned to this part'
    return
  }

  // Validate that all required variables are resolved
  const requiredVariables = ['vlan1', 'vlan2', 'ipv4_subnet', 'ipv6_subnet']
  const missingVariables = requiredVariables.filter(variable => 
    !resolvedVariables.value[variable] || resolvedVariables.value[variable] === ''
  )

  if (missingVariables.length > 0) {
    console.error('Missing required variables for grading:', missingVariables)
    error.value = `Unable to submit for grading: Missing personalized variables: ${missingVariables.join(', ')}`
    return
  }

  // Submit for grading with student configuration and resolved variables
  const success = await submitForGrading()
  if (success) {
    // Update part status
    const currentPartData = parts.value[currentPart.value]
    if (currentPartData) {
      currentPartData.status = 'grading'
    }
    
    // Clear any previous errors
    error.value = null
    
    console.log('Exam grading submitted with personalized configuration:', {
      studentId: studentId.value,
      partId: currentPartId.value,
      resolvedVariables: resolvedVariables.value,
      personalizedConfig: {
        vlan1: studentConfig.value.vlan1,
        vlan2: studentConfig.value.vlan2,
        ipv4Subnet: studentConfig.value.ipv4Subnet,
        ipv6Subnet: studentConfig.value.ipv6Subnet,
        outInterfaceIpv4: studentConfig.value.outInterfaceIpv4,
        outInterfaceIpv6: studentConfig.value.outInterfaceIpv6,
        generatedAnswers: studentConfig.value.generatedAnswers
      },
      expectedAnswers: getExpectedAnswers(),
      gradingMode: 'exam_personalized'
    })
  } else {
    error.value = 'Failed to submit for grading. Please try again.'
  }
}

// Validate student answers against personalized configuration
const validateCurrentAnswers = (answers: Record<string, any>) => {
  if (!studentConfig.value) {
    return { isValid: false, errors: ['Student configuration not available'], score: 0 }
  }
  
  return validateStudentAnswers(answers, studentConfig.value)
}

// Note: getExpectedAnswers is provided by useExamGradingStatus composable

// Preview personalized variables for debugging/validation
const previewPersonalizedVariables = () => {
  if (!studentConfig.value) return {}
  
  return generatePersonalizedVariablePreview(studentConfig.value)
}

// Demonstrate personalized variable resolution with sample content
const demonstratePersonalizedResolution = () => {
  if (!studentConfig.value) {
    console.warn('Cannot demonstrate personalized resolution: Student configuration not available')
    return
  }
  
  // Sample template with various personalized variables
  const sampleTemplate = `
    <h3>Personalized Network Configuration for Student {student_id}</h3>
    
    <h4>VLAN Configuration</h4>
    <ul>
      <li>VLAN 1: {vlan1} ({vlan1_name})</li>
      <li>VLAN 2: {vlan2} ({vlan2_name})</li>
      <li>Interface VLAN 1: {interface_vlan1}</li>
      <li>Interface VLAN 2: {interface_vlan2}</li>
    </ul>
    
    <h4>IPv4 Network Details</h4>
    <ul>
      <li>Subnet: {ipv4_subnet}</li>
      <li>Network Address: {network_address}</li>
      <li>Broadcast Address: {broadcast_address}</li>
      <li>Gateway: {gateway_ipv4}</li>
      <li>First Usable: {first_usable}</li>
      <li>Last Usable: {last_usable}</li>
      <li>Subnet Mask: {subnet_mask}</li>
      <li>Wildcard Mask: {wildcard_mask}</li>
    </ul>
    
    <h4>IPv6 Network Details</h4>
    <ul>
      <li>Subnet: {ipv6_subnet}</li>
      <li>Prefix Length: {prefix_length}</li>
    </ul>
    
    <h4>Interface Configuration</h4>
    <ul>
      <li>Output Interface IPv4: {out_interface_ipv4}</li>
      <li>Output Interface IPv6: {out_interface_ipv6}</li>
    </ul>
    
    <h4>Routing Configuration</h4>
    <ul>
      <li>Router ID: {router_id}</li>
      <li>OSPF Area: {ospf_area}</li>
    </ul>
    
    <h4>Calculated Values</h4>
    <ul>
      <li>Dec2: {dec2}</li>
      <li>Dec3: {dec3}</li>
      <li>Network ID: {network_id}</li>
    </ul>
  `
  
  try {
    const { resolvedContent: resolved, resolvedVariables: variables } = resolveExamVariables(
      sampleTemplate,
      studentConfig.value
    )
    
    console.log('Personalized Variable Resolution Demonstration:', {
      studentId: studentConfig.value.studentId,
      originalTemplate: sampleTemplate,
      resolvedContent: resolved,
      resolvedVariables: variables,
      uniquenessProof: {
        studentSpecificVLANs: `${variables.vlan1}-${variables.vlan2}`,
        studentSpecificSubnet: variables.ipv4_subnet,
        studentSpecificGateway: variables.gateway_ipv4,
        studentSpecificInterfaces: `${variables.out_interface_ipv4}/${variables.out_interface_ipv6}`,
        calculatedFromStudentId: {
          dec2: variables.dec2,
          dec3: variables.dec3,
          routerId: variables.router_id
        }
      }
    })
    
    return { resolved, variables }
  } catch (error) {
    console.error('Personalized resolution demonstration failed:', error)
    return null
  }
}

// Validate that personalized configuration is complete and valid
const validatePersonalizedConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  if (!studentConfig.value) {
    errors.push('Student configuration not loaded')
    return { isValid: false, errors }
  }
  
  // Validate required configuration fields
  const requiredFields = [
    'studentId', 'vlan1', 'vlan2', 'ipv4Subnet', 'ipv6Subnet', 
    'outInterfaceIpv4', 'outInterfaceIpv6'
  ]
  
  requiredFields.forEach(field => {
    if (!studentConfig.value![field as keyof ExamConfiguration]) {
      errors.push(`Missing required field: ${field}`)
    }
  })
  
  // Validate VLAN ranges
  if (studentConfig.value.vlan1 < 1 || studentConfig.value.vlan1 > 4094) {
    errors.push(`Invalid VLAN 1: ${studentConfig.value.vlan1} (must be 1-4094)`)
  }
  
  if (studentConfig.value.vlan2 < 1 || studentConfig.value.vlan2 > 4094) {
    errors.push(`Invalid VLAN 2: ${studentConfig.value.vlan2} (must be 1-4094)`)
  }
  
  // Validate IPv4 subnet format
  const ipv4SubnetRegex = /^172\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/
  if (!ipv4SubnetRegex.test(studentConfig.value.ipv4Subnet)) {
    errors.push(`Invalid IPv4 subnet format: ${studentConfig.value.ipv4Subnet}`)
  }
  
  // Validate IPv6 subnet format
  const ipv6SubnetRegex = /^2001:[0-9a-fA-F]{1,4}:[0-9a-fA-F]{1,4}::\/\d{1,3}$/
  if (!ipv6SubnetRegex.test(studentConfig.value.ipv6Subnet)) {
    errors.push(`Invalid IPv6 subnet format: ${studentConfig.value.ipv6Subnet}`)
  }
  
  // Validate outer interface IPv4 (must be 10.30.6.xxx format)
  const outerIpv4Regex = /^10\.30\.6\.\d{1,3}$/
  if (!outerIpv4Regex.test(studentConfig.value.outInterfaceIpv4)) {
    errors.push(`Invalid outer interface IPv4: ${studentConfig.value.outInterfaceIpv4} (must be 10.30.6.xxx)`)
  }
  
  return { isValid: errors.length === 0, errors }
}

// Handle grading completion
const handleGradingComplete = () => {
  const currentPartData = parts.value[currentPart.value]
  if (currentPartData && gradingStatus.value === 'graded') {
    currentPartData.status = 'graded'
    
    // Auto-advance to next part if available and accessible
    const nextPartIndex = currentPart.value + 1
    if (nextPartIndex < parts.value.length && isPartAccessible(nextPartIndex)) {
      // Optional: Auto-advance or let student manually navigate
      // currentPart.value = nextPartIndex
      // updateResolvedContent()
    }
  }
}

// Watch for grading status changes
watch(gradingStatus, (newStatus) => {
  if (newStatus === 'graded') {
    handleGradingComplete()
  }
})

// Computed properties
const currentPartData = computed(() => parts.value[currentPart.value])

const canSubmitGrading = computed(() => {
  return currentPartData.value?.playId && 
         gradingStatus.value === 'not_submitted' && 
         timeRemaining.value > 0
})

const progressStats = computed(() => {
  const completed = parts.value.filter(part => part.status === 'graded').length
  const total = parts.value.length
  return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 }
})

const timeRemainingFormatted = computed(() => {
  const hours = Math.floor(timeRemaining.value / 3600)
  const minutes = Math.floor((timeRemaining.value % 3600) / 60)
  const seconds = timeRemaining.value % 60
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }
})

const timeRemainingPercentage = computed(() => {
  if (timeLimit.value === 0) return 100
  const totalSeconds = timeLimit.value * 60
  return (timeRemaining.value / totalSeconds) * 100
})

const timeWarningLevel = computed(() => {
  const percentage = timeRemainingPercentage.value
  if (percentage <= 10) return 'critical'
  if (percentage <= 25) return 'warning'
  return 'normal'
})

// Cleanup on unmount
onBeforeUnmount(() => {
  if (timeInterval.value) {
    clearInterval(timeInterval.value)
  }
})

// Initialize
onMounted(() => {
  loadExamData()
})

// Page title
useHead({
  title: computed(() => `Exam: ${exam.value?.title || 'Loading...'} - NetGrader`)
})
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex h-screen">
      <div class="w-64 border-r border-border p-4">
        <Skeleton class="h-6 w-24 mb-4" />
        <div class="space-y-2">
          <Skeleton class="h-12 w-full" />
          <Skeleton class="h-12 w-full" />
          <Skeleton class="h-12 w-full" />
        </div>
      </div>
      <div class="flex-1 p-4">
        <Skeleton class="h-8 w-48 mb-4" />
        <Skeleton class="h-64 w-full" />
      </div>
    </div>
    
    <!-- Error State -->
    <div v-else-if="error" class="p-8">
      <Alert variant="destructive">
        <AlertCircle class="h-4 w-4" />
        <AlertDescription>{{ error }}</AlertDescription>
      </Alert>
    </div>
    
    <!-- Main Exam Interface -->
    <div v-else-if="exam" class="flex h-screen">
      <!-- Part Sidebar -->
      <PartSidebar
        :parts="parts"
        :current-part="currentPart"
        :can-add-parts="false"
        :show-status="true"
        :show-progress="true"
        :user-role="'student'"
        :sequential-access="true"
        @select-part="selectPart"
      />
      
      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col">
        <!-- Exam Header with Time Tracking -->
        <div class="border-b border-border p-6 bg-card">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h1 class="text-2xl font-bold">{{ exam.title }}</h1>
              <p v-if="exam.description" class="text-muted-foreground mt-1">
                {{ exam.description }}
              </p>
            </div>
            <div class="text-right space-y-2">
              <div class="text-sm text-muted-foreground">Progress</div>
              <div class="text-lg font-semibold">
                {{ progressStats.completed }}/{{ progressStats.total }} parts
              </div>
            </div>
          </div>
          
          <!-- Time Tracking and Student Info -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Time Remaining -->
            <Card v-if="timeLimit > 0">
              <CardHeader class="pb-2">
                <CardTitle class="text-sm flex items-center">
                  <Clock class="w-4 h-4 mr-2" />
                  Time Remaining
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div class="space-y-2">
                  <div 
                    :class="[
                      'text-2xl font-bold',
                      timeWarningLevel === 'critical' ? 'text-red-600' :
                      timeWarningLevel === 'warning' ? 'text-yellow-600' :
                      'text-green-600'
                    ]"
                  >
                    {{ timeRemainingFormatted }}
                  </div>
                  <Progress 
                    :value="timeRemainingPercentage" 
                    :class="[
                      timeWarningLevel === 'critical' ? 'bg-red-100' :
                      timeWarningLevel === 'warning' ? 'bg-yellow-100' :
                      'bg-green-100'
                    ]"
                  />
                </div>
              </CardContent>
            </Card>
            
            <!-- Student Configuration -->
            <StudentConfiguration
              :student-config="studentConfig"
              :is-loading="isLoadingExam"
              :error="error"
              :show-debug-info="false"
            />
            
            <!-- Exam Info -->
            <Card>
              <CardHeader class="pb-2">
                <CardTitle class="text-sm flex items-center">
                  <FileText class="w-4 h-4 mr-2" />
                  Exam Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div class="space-y-1 text-sm">
                  <div>Parts: {{ parts.length }}</div>
                  <div v-if="timeLimit > 0">Duration: {{ timeLimit }} minutes</div>
                  <div>Mode: Individual</div>
                  <Badge variant="outline" class="mt-2">
                    Personalized Configuration
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <!-- Part Content -->
        <div class="flex-1 flex flex-col">
          <TextEditor
            v-if="currentPartData"
            :model-value="resolvedContent"
            :title="currentPartData.title"
            :readonly="true"
          />
          
          <!-- No Part Selected -->
          <div v-else class="flex-1 flex items-center justify-center">
            <div class="text-center text-muted-foreground">
              <p>Select a part from the sidebar to begin</p>
            </div>
          </div>
        </div>
        
        <!-- Grading Status Section -->
        <div v-if="currentPartData">
          <GradingStatus
            :course-id="courseId"
            :lab-id="examId"
            :part-id="currentPartId"
            :status="gradingStatus"
            :grading-progress="gradingProgress"
            :task-results="taskResults"
            :total-score="totalScore"
            :max-score="maxScore"
            :can-submit="canSubmitGrading"
            :allow-resubmission="false"
            :time-remaining="timeRemaining"
            @submit-grading="handleSubmitGrading"
          />
        </div>
      </div>
    </div>
  </div>
</template>