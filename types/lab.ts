export interface LabPart {
  id: string
  title: string
  content: string
  playId: string | null
  playVariables?: Record<string, any>
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
  parts: LabPart[]
  courseId: string
  timeLimit?: number
  subnetGenerationConfig: SubnetGenerationConfig
  studentConfigurations: Map<string, ExamConfiguration>
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface SubnetGenerationConfig {
  algorithm: 'default' | 'custom'
  customAlgorithm?: string
  baseNetwork: string
  variableRanges: {
    examNumber: { min: number, max: number }
    vlanRange: { min: number, max: number }
  }
  usableIPs: number
  subnetMask: number
}

export interface Play {
  id: string
  name: string
  description: string
  taskCount: number
  totalPoints: number
  gradingFlow: GradingStep[]
  variables: PlayVariable[]
  isReusable: boolean
}

export interface PlayVariable {
  name: string
  type: 'string' | 'number' | 'ip_address' | 'group_number' | 'vlan_id' | 'subnet'
  description: string
  defaultValue?: any
  required: boolean
}

export interface PlayVariableBinding {
  variableName: string
  value: any
  source: 'static' | 'group' | 'student' | 'generated'
  generationRule?: string
}

export interface GradingStep {
  id: string
  name: string
  points: number
  order: number
  criteria: string
  variableFields?: string[]
}

export interface Student {
  id: string
  name: string
  studentId: string
  email: string
}

export interface StudentGroup {
  id: string
  courseId: string
  groupNumber: number
  students: Student[]
  createdAt: Date
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
  generatedAt: Date | string
  generatedAnswers: any
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
  status: 'grading' | 'graded'
  taskResults: TaskResult[]
  totalScore: number
  maxScore: number
  resolvedVariables: Record<string, any>
  submittedAt: Date
  gradedAt?: Date
}

export type GradingStatus = 'not_submitted' | 'grading' | 'graded' | 'error'