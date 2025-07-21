// Lab Management System Type Definitions

export interface LabPart {
  id: string
  title: string
  content: string
  playId: string | null
  playVariables?: Record<string, any> // Variable bindings for this part
  order: number
  status?: 'not_submitted' | 'grading' | 'graded'
}

export interface Lab {
  id: string
  title: string
  description: string
  parts: LabPart[]
  courseId: string
  groupsRequired: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface Exam {
  id: string
  title: string
  description: string
  parts: LabPart[] // Reuse same part structure
  courseId: string
  timeLimit?: number // in minutes
  subnetGenerationConfig: SubnetGenerationConfig
  studentConfigurations: Map<string, ExamConfiguration> // Pre-generated configs
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface SubnetGenerationConfig {
  algorithm: 'default' | 'custom'
  customAlgorithm?: string // JavaScript code for custom generation
  baseNetwork: string // e.g., "10.30.6.0/24"
  variableRanges: {
    examNumber: { min: number, max: number }
    vlanRange: { min: number, max: number }
  }
}

export interface Play {
  id: string
  name: string
  description: string
  taskCount: number
  totalPoints: number
  gradingFlow: GradingStep[]
  variables: PlayVariable[] // Variables that can be used in this play
  isReusable: boolean
}

export interface PlayVariable {
  name: string
  type: 'string' | 'number' | 'ip_address' | 'group_number' | 'vlan_id' | 'subnet'
  description: string
  defaultValue?: any
  required: boolean
  validation?: {
    min?: number
    max?: number
    pattern?: string
    options?: string[]
  }
}

export interface PlayVariableBinding {
  variableName: string
  value: any
  source: 'static' | 'group' | 'student' | 'generated'
  generationRule?: string
}

export interface PlaySelection {
  playId: string
  variables: PlayVariableBinding[]
  isValid: boolean
  validationErrors?: string[]
}

export interface GradingStep {
  id: string
  name: string
  points: number
  order: number
  criteria: string
  variableFields?: string[] // Fields that use variables
}

export interface Student {
  id: string
  studentId: string
  name: string
  email: string
  groupNumber?: number
  isActive: boolean
}

export interface StudentGroup {
  id: string
  courseId: string
  groupNumber: number
  students: Student[] // Array of student objects
  createdAt: Date
  updatedAt: Date
  maxSize?: number
  isActive: boolean
}

export interface CSVUploadResult {
  success: boolean
  processedRows: number
  errors: CSVError[]
  students: StudentEnrollment[]
  groups?: StudentGroup[]
}

export interface CSVError {
  row: number
  field: string
  value: string
  message: string
}

export interface GroupAssignmentRequest {
  studentId: string
  groupNumber: number
  courseId: string
}

export interface StudentEnrollment {
  studentId: string
  courseId: string
  groupNumber?: number
  examConfig?: ExamConfiguration
}

export interface ExamConfiguration {
  studentId: string
  vlan1: number
  vlan2: number
  ipv4Subnet: string
  ipv6Subnet: string
  outInterfaceIpv4: string
  outInterfaceIpv6: string
  generatedAnswers: any
  variables?: Record<string, any> // Additional variables for this student
  generatedAt: Date
}

export interface SubnetGenerationResult {
  studentId: string
  configuration: ExamConfiguration
  variables: Record<string, any>
  success: boolean
  errors?: string[]
}

export interface TaskResult {
  id: string
  name: string
  score: number
  maxScore: number
  passed: boolean
  feedback?: string
  resolvedVariables?: Record<string, any>
}

export interface GradingSubmission {
  id: string
  labId: string
  partId: string
  studentId: string
  status: 'grading' | 'graded' | 'failed'
  taskResults: TaskResult[]
  totalScore: number
  maxScore: number
  resolvedVariables: Record<string, any>
  submittedAt: Date
  gradedAt?: Date
  gradingStartedAt?: Date
  attempts: number
  maxAttempts?: number
  gradingErrors?: GradingError[]
  queueId?: string // RabbitMQ message ID
}

export interface GradingQueue {
  id: string
  submissionId: string
  studentId: string
  labId: string
  partId: string
  playId: string
  resolvedVariables: Record<string, any>
  priority: number
  createdAt: Date
  processedAt?: Date
  status: 'pending' | 'processing' | 'completed' | 'failed'
}

export type GradingStatus = 'not_submitted' | 'grading' | 'graded'

// Variable Resolution Types
export interface VariableContext {
  studentId?: string
  groupNumber?: number
  courseId: string
  examNumber?: number
  mode: 'lab' | 'exam'
}

export interface VariableResolutionResult {
  resolvedContent: string
  resolvedVariables: Record<string, any>
  errors?: string[]
}

export interface VariableTemplate {
  template: string
  variables: Record<string, any>
  requiredVariables: string[]
}

// Grading Status Extended Types
export interface GradingProgress {
  status: GradingStatus
  progress: number
  currentTask?: string
  completedTasks: number
  totalTasks: number
  estimatedTimeRemaining?: number
}

export interface GradingError {
  code: string
  message: string
  taskId?: string
  details?: any
}

// API Response Types
export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
}

// Form Data Types
export interface LabFormData {
  title: string
  description: string
  parts: Omit<LabPart, 'id'>[]
  groupsRequired: boolean
}

export interface ExamFormData {
  title: string
  description: string
  parts: Omit<LabPart, 'id'>[]
  timeLimit?: number
  subnetGenerationConfig: SubnetGenerationConfig
}

// UI State Types
export interface LabEditorState {
  currentPart: number
  isLoading: boolean
  hasUnsavedChanges: boolean
  selectedPlayId: string | null
}

export interface GradingStatusState {
  status: GradingStatus
  progress: number
  taskResults: TaskResult[]
  totalScore: number
  maxScore: number
  isPolling: boolean
  lastUpdated?: Date
  errors?: GradingError[]
}

// Utility Types
export type LabMode = 'create' | 'edit' | 'view'
export type ExamMode = 'create' | 'edit' | 'take'
export type UserRole = 'student' | 'lecturer' | 'admin'

export interface PaginationParams {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Database Entity Base Types
export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
  isActive: boolean
}

// Extended interfaces with base entity
export interface LabEntity extends Omit<Lab, 'id' | 'createdAt' | 'updatedAt'>, BaseEntity {}
export interface ExamEntity extends Omit<Exam, 'id' | 'createdAt' | 'updatedAt'>, BaseEntity {}
export interface PlayEntity extends Omit<Play, 'id'>, BaseEntity {}
export interface StudentGroupEntity extends Omit<StudentGroup, 'id' | 'createdAt' | 'updatedAt'>, BaseEntity {}