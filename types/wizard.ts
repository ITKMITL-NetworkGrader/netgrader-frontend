// Lab Creation Wizard TypeScript Interfaces
// Based on CLAUDE.md specifications

// Core Lab Structure
export interface Lab {
  courseId: string;           // Already provided from course context
  name: string;               // Lab name (max 100 chars)
  description?: string;       // Optional description (max 2000 chars)
  instructions: string;       // Student-facing instructions (Markdown)
  
  network: {
    topology: {
      baseNetwork: string;    // CIDR base (e.g., "192.168.1.0")
      subnetMask: number;     // Subnet mask (e.g., 24)
    };
    devices: Device[];        // Array of network devices
  };
  
  parts: LabPart[];          // Lab parts (created after lab creation)
  
  dueDate?: Date;            // Optional due date
  availableFrom?: Date;      // Optional availability start
  availableUntil?: Date;     // Optional availability end
}

export interface Device {
  deviceId: string;          // Unique device identifier
  templateId: string;        // Device template ID (ObjectId)
  ipVariables: IpVariable[]; // IP variable configurations
  connectionParams?: {       // Connection parameters (optional)
    sshPort: number;
    username: string;
    password: string;
  };
}

export interface IpVariable {
  name: string;              // Variable name (e.g., "loopback0", "gig0_1", "interface-1")
  inputType: 'hostOffset' | 'fullIP';  // Whether to use host offset or full IP address
  hostOffset?: number;       // Host offset for IP calculation (used when inputType is 'hostOffset')
  fullIP?: string;           // Full IP address (used when inputType is 'fullIP')
  interface?: string;        // Full interface name from device template (e.g., "GigabitEthernet0/0")
}

// Lab Parts Structure
export interface LabPart {
  labId: string;             // Reference to lab (ObjectId from lab creation)
  partId: string;            // Human-readable ID (e.g., "part1", "routing")
  title: string;             // Part title
  description?: string;      // Optional description (Markdown)
  instructions: string;      // Student instructions (Markdown, max 10000 chars)
  order: number;             // Display sequence
  
  tasks: Task[];             // Array of tasks (min 1 required)
  task_groups: TaskGroup[];  // Optional task grouping
  
  prerequisites: string[];   // Part IDs that must be completed first
  totalPoints: number;       // Sum of task points
}

// Task Structure
export interface Task {
  taskId: string;            // Unique within part
  name: string;              // Task name
  description?: string;      // Optional description
  templateId: string;        // Task template ID (ObjectId)
  
  // Execution Configuration
  executionDevice: string;   // Device ID from lab.network.devices
  targetDevices: string[];   // Device IDs for multi-device tasks
  
  // Task Parameters (passed to template)
  parameters: Record<string, any>;
  
  // Grading Configuration
  testCases: TestCase[];     // Array of test cases
  
  order: number;             // Order within part
  points: number;            // Total points for task
  group_id?: string;         // Optional group ID if task belongs to a group
}

export interface TestCase {
  comparison_type: string;   // Type of comparison: equals, contains, regex, success, ssh_success, greater_than
  expected_result: any;      // Expected value/result for comparison
}

export interface TaskGroup {
  group_id: string;          // Unique group identifier
  title: string;             // Group title
  description?: string;      // Optional description
  group_type: "all_or_nothing" | "proportional";
  points: number;            // Group points
  continue_on_failure: boolean;
  timeout_seconds: number;
}

// Task Templates
export interface TaskTemplate {
  _id: string;               // Template MongoDB ObjectId
  templateId: string;        // Human-readable template ID
  name: string;              // Display name
  description: string;       // What this template does
  parameterSchema: Array<{   // Required parameters
    name: string;
    type: string;
    description?: string;
    required: boolean;
  }>;
  defaultTestCases: Array<{  // Default test cases
    comparison_type: string;
    expected_result: any;
  }>;
}

// Device Templates
export interface DeviceTemplate {
  id: string;
  name: string;
  deviceType: string;
  platform: string;
  defaultInterfaces: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  connectionParams: {
    defaultSSHPort: number;
    authentication: {
      usernameTemplate: string;
      passwordTemplate: string;
    };
  };
}

// Wizard Form Data Structure
export interface LabWizardData {
  // Step 1: Basic Lab Information
  basicInfo: {
    name: string;
    description: string;
    instructions: string;
  };
  
  // Step 2: Network Configuration
  networkConfig: {
    baseNetwork: string;
    subnetMask: number;
  };
  
  // Step 3: Device Configuration
  devices: Device[];
  
  // Step 4: Parts & Tasks
  parts: WizardLabPart[];
  
  // Step 5: Schedule & Publishing
  schedule: {
    availableFrom?: Date;
    availableUntil?: Date;
    dueDate?: Date;
  };
  
  // Course context (provided)
  courseId: string;
  courseName: string;
  courseCode: string;
}

// Wizard-specific Lab Part (extended with UI state)
export interface WizardLabPart extends Omit<LabPart, 'labId'> {
  tempId: string;            // Temporary ID for wizard use
  isExpanded: boolean;       // UI state for accordion
  tasks: WizardTask[];       // Extended tasks with UI state
}

// Wizard-specific Task (extended with UI state)
export interface WizardTask extends Task {
  tempId: string;            // Temporary ID for wizard use
  isExpanded: boolean;       // UI state for accordion
  groupId?: string;          // Which task group this belongs to
}

// Task Group UI State
export interface WizardTaskGroup extends TaskGroup {
  tempId: string;            // Temporary ID for wizard use
  taskIds: string[];         // Task IDs in this group
  isExpanded: boolean;       // UI state for accordion
}

// Validation Results
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface StepValidation {
  step1: ValidationResult;
  step2: ValidationResult;
  step3: ValidationResult;
  step4: ValidationResult;
  step5: ValidationResult;
}

// API Response Types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface LabCreationResponse {
  success: boolean;
  data: {
    labId: string;
    message: string;
  };
}

export interface PartCreationResponse {
  success: boolean;
  data: {
    partId: string;
    labId: string;
    message: string;
  };
}

// Wizard Navigation
export interface WizardStep {
  id: number;
  title: string;
  description: string;
  isComplete: boolean;
  isAccessible: boolean;
}

// Course Context (from parent)
export interface CourseContext {
  courseId: string;
  courseName: string;
  courseCode: string;
  instructorId: string;
}

// Form Field Types
export interface FormFieldError {
  field: string;
  message: string;
}

export interface FormValidationState {
  showValidation: boolean;
  errors: FormFieldError[];
  warnings: FormFieldError[];
}

// Drag & Drop Types for Task Grouping
export interface DragDropItem {
  id: string;
  type: 'task' | 'group';
  data: WizardTask | WizardTaskGroup;
}

export interface DropZone {
  id: string;
  type: 'group' | 'ungrouped';
  accepts: string[];
}

// Rich Text Editor Types
export interface EditorContent {
  markdown: string;
  html: string;
  plainText: string;
}

// File Upload Types
export interface FileUploadResult {
  success: boolean;
  data?: {
    url: string;
    filename: string;
  };
  error?: string;
}