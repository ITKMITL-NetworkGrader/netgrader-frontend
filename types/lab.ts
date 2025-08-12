// Updated comprehensive lab schema for NetGrader

export interface TestCase {
  description?: string;
  comparison_type: string; // equals, contains, regex, success, etc.
  expected_result: any;
}

export interface AnsibleTask {
  task_id?: string;
  name: string;
  template_name: string;
  parameters?: Record<string, any>;
  test_cases?: TestCase[];
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
  hostOffset: number;
  example?: string;
}

export interface IpSchema {
  scope: "lab" | "part";
  baseNetwork: string;
  subnetMask: number;
  allocationStrategy: "group_based" | "student_id_based";
  reservedSubnets?: string[];
  variablesMapping: IpVariableMapping[];
}

export interface DeviceIpMapping {
  deviceId: string;
  ipVariable: string;
}

export interface Device {
  id: string;
  ip_address: string;
  ansible_connection: string;
  credentials: {
    ansible_user: string;
    ansible_password: string;
  };
  platform?: string;
  jump_host?: string;
  ssh_args?: string;
  use_persistent_connection?: boolean;
}

export interface LabPart {
  part_id?: string;
  title: string;
  textMd: string; // Markdown instructions for this part
  order: number;
  total_points: number;
  ipSchema?: IpSchema | null;
  deviceIpMapping?: DeviceIpMapping[] | null;
  plays: Play; // Single play object, not array
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

// API Response wrapper
export interface LabResponse {
  success: boolean;
  message: string;
  data?: Lab;
  error?: string;
}

export interface LabListResponse {
  success: boolean;
  message: string;
  data?: {
    labs: Lab[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: string;
}

// Form data interfaces for frontend
export interface LabFormData {
  title: string;
  description?: string;
  type: "lab" | "exam";
  groupsRequired: boolean;
  ipSchema?: IpSchema;
  deviceIpMapping?: DeviceIpMapping[];
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
  created_at?: Date;
  updated_at?: Date;
  status?: 'pending' | 'running' | 'completed' | 'failed';
  results?: any;
}