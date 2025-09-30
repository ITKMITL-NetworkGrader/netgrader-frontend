// Updated comprehensive lab schema for NetGrader

export interface TestCase {
  description: string;
  comparison_type: 'success' | 'failed' | 'contains' | 'not_contains' | 'ssh_success' | 'equals' | 'regex';
  expected_result: string | number | boolean;
}

export interface AnsibleTask {
  task_id?: string;
  name: string;
  template_name: string;
  parameters: Record<string, string | number | boolean>;
  test_cases: TestCase[];
  points: number;
}

export interface Play {
  play_id?: string;
  name: string;
  description?: string;
  source_device: string;
  target_device?: string;
  total_points: number;
  ansible_tasks: AnsibleTask[];
}

export interface IpVariableMapping {
  name: string;
  vlanIndex?: number;        // Which VLAN (0-9) - for studentVlanX types
  interfaceOffset?: number;  // Offset within VLAN (1-50) - for studentVlanX types
  example?: string;
}

export interface IpSchema {
  scope: "lab" | "part";
  baseNetwork: string;
  subnetMask: number;
  gateway?: string;
  allocationStrategy: "sequential" | "random" | "group_based" | "student_id_based";
  reservedSubnets?: string[];
  variablesMapping: IpVariableMapping[];
}

export interface DeviceIpMapping {
  deviceId: string;
  ipVariable: string;
}

export interface LabPart {
  part_id?: string;
  title: string;
  textMd: string; // Markdown instructions for this part
  order: number;
  total_points: number;
  ipSchema?: IpSchema | null;
  deviceIpMapping?: DeviceIpMapping[] | null;
  plays: Play[];
}

export interface Lab {
  id?: string;
  title: string;
  type: "lab" | "exam";
  description: string;
  courseId: string;
  groupsRequired: boolean;
  ipSchema?: IpSchema;
  deviceIpMapping?: DeviceIpMapping[];
  parts: LabPart[];
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Grading Job Interfaces
export interface GradingJobTestCase {
  description: string;
  comparison_type: string;
  expected_result: string | number | boolean;
}

export interface GradingJobAnsibleTask {
  task_id: string;
  name: string;
  template_name: string;
  parameters: Record<string, string | number | boolean>;
  test_cases: GradingJobTestCase[];
  points: number;
}

export interface GradingJobPlay {
  play_id: string;
  name: string;
  description?: string;
  source_device: string;
  target_device?: string;
  total_points: number;
  ansible_tasks: GradingJobAnsibleTask[];
}

export interface GradingJobPart {
  part_id: string;
  title: string;
  description?: string;
  instructionMd?: string;
  order: number;
  total_points: number;
  plays: GradingJobPlay[];
}

export interface GradingJobDevice {
  id: string;
  ip_address: string;
  ansible_connection: string;
  credentials: Record<string, string>;
}

export interface GradingJob {
  job_id?: string;
  student_id: string;
  lab_id: string;
  part: GradingJobPart;
  devices: GradingJobDevice[];
  ip_mappings: Record<string, string>;
  callback_url?: string;
}

// Task Template Interface
export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  category: 'connectivity' | 'security' | 'configuration' | 'service' | 'custom';
  parameters: TaskTemplateParameter[];
  default_test_cases: TestCase[];
}

export interface TaskTemplateParameter {
  name: string;
  type: 'string' | 'number' | 'ip_address' | 'url' | 'device_variable';
  description: string;
  required: boolean;
  default_value?: string | number | boolean;
  validation_pattern?: string;
}

// Student and Group Management
export interface Student {
  student_id: string;
  full_name?: string;
  group_number?: number;
}

export interface StudentGroup {
  group_number: number;
  students: Student[];
  ip_assignments?: Record<string, string>;
}

// API Response Types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Form Data Types
export interface LabFormData {
  title: string;
  description: string;
  type: 'lab' | 'exam';
  groupsRequired: boolean;
  ipSchema?: IpSchema;
  deviceIpMapping?: DeviceIpMapping[];
  parts: Omit<LabPart, 'part_id'>[];
}

// Play Creation Types
export interface PlayFormData {
  name: string;
  description?: string;
  source_device: string;
  target_device?: string;
  tasks: TaskFormData[];
}

export interface TaskFormData {
  name: string;
  template_name: string;
  parameters: Record<string, string | number | boolean>;
  test_cases: TestCase[];
  points: number;
}

// IP Generation Types
export interface IPGenerationConfig {
  baseNetwork: string;
  subnetMask: number;
  gateway?: string;
  strategy: 'group_based' | 'student_id_based';
  deviceMappings: DeviceIpMapping[];
  variableMappings: IpVariableMapping[];
}

export interface GeneratedIPAssignment {
  student_id: string;
  group_number?: number;
  ip_mappings: Record<string, string>;
  devices: {
    device_id: string;
    ip_address: string;
    variable_name: string;
  }[];
}

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface NetworkValidationResult extends ValidationResult {
  network_info?: {
    network: string;
    broadcast: string;
    first_host: string;
    last_host: string;
    total_hosts: number;
  };
}

// Grading Status Types (keeping from existing system)
export type GradingStatus = 'not_submitted' | 'grading' | 'graded' | 'error'

export interface TaskResult {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  passed: boolean;
  feedback?: string;
  resolvedVariables?: Record<string, string | number>;
}

export interface GradingSubmission {
  id: string;
  labId: string;
  partId: string;
  studentId: string;
  status: GradingStatus;
  taskResults: TaskResult[];
  totalScore: number;
  maxScore: number;
  resolvedVariables: Record<string, string | number>;
  submittedAt: Date;
  gradedAt?: Date;
}