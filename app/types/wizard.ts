// Lab Creation Wizard TypeScript Interfaces
// Based on CLAUDE.md specifications
import type { PartSubmissionSummary } from './submission'

export interface RichTextContent {
  html: string
  json: any
}

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
    connectionType: 'ssh' | 'telnet' | 'console';  // Connection type
    sshPort?: number;        // SSH/Telnet port (not needed for console)
    username?: string;       // Username (required for SSH, optional for Telnet)
    password?: string;       // Password (required for SSH, optional for Telnet)
  };
}

export interface IpVariable {
  name: string;              // Variable name (e.g., "loopback0", "gig0_1", "interface-1")
  inputType: 'fullIP' | 'studentManagement' | string;  // IP configuration type (includes studentVlan0-9)
  fullIP?: string;           // Full IP address (used when inputType is 'fullIP')
  interface?: string;        // Full interface name from device template (e.g., "GigabitEthernet0/0")

  // Enhanced fields for student-generated IPs
  interfaceOffset?: number;  // Offset within network for multiple interfaces (e.g., 1, 2, 3) - Required for studentVlanX types
  vlanIndex?: number;        // Which VLAN this variable belongs to (0-9 for max 10 VLANs)
  isStudentGenerated?: boolean; // Whether this IP is auto-generated using student ID
  readonly?: boolean;        // Whether the field is read-only (true for student-generated)
  isManagementInterface?: boolean; // Whether this interface requires management IP (for backend to know)
  isVlanInterface?: boolean; // Whether this interface is a VLAN interface (for studentVlanX types)
}

// Part Types
export type PartType = 'fill_in_blank' | 'network_config';

// Question Types for Fill-in-Blank Parts
export type QuestionType = 'network_address' | 'first_usable_ip' | 'last_usable_ip' |
  'broadcast_address' | 'subnet_mask' | 'ip_address' | 'number' |
  'custom_text' | 'ip_table_questionnaire';

// IP Table Questionnaire Structure
export interface IpTableQuestionnaire {
  tableId: string;                    // Unique table identifier
  rowCount: number;                   // Number of rows (min: 1, max: 10)
  columnCount: number;                // Number of columns (min: 1, max: 10)
  columns: IpTableColumn[];           // Column definitions
  rows: IpTableRow[];                 // Row definitions
  cells: IpTableCell[][];             // Cell data [rowIndex][columnIndex]
}

export interface IpTableColumn {
  columnId: string;                   // Unique column identifier
  label: string;                      // Column label (e.g., "IPv4 Address", "Subnet Mask")
  order: number;                      // Display order (0-based)
}

export interface IpTableRow {
  rowId: string;                      // Unique row identifier
  deviceId: string;                   // Device ID (e.g., "router1")
  interfaceName: string;              // Interface name (e.g., "GigabitEthernet0/0" or "g0-1")
  displayName: string;                // Display format (e.g., "router1.g0-1")
  order: number;                      // Display order (0-based)
}

// Answer Types for IP Table Cells (simplified to static vs calculated)
export type CellAnswerType = 'static' | 'calculated';

// Cell Types for IP Table Cells (new advanced cell types)
export type CellType = 'input' | 'readonly' | 'blank';

export type CalculationType =
  | 'vlan_network_address'
  | 'vlan_first_usable'
  | 'vlan_last_usable'
  | 'vlan_broadcast'
  | 'vlan_subnet_mask'
  | 'vlan_lecturer_offset'      // Lecturer-defined exact offset (exact match)
  | 'vlan_lecturer_range'        // Lecturer-defined IP range (any IP in range is valid)
  | 'device_interface_ip'        // From device.interface
  | 'vlan_id';                   // The VLAN ID itself

export interface CalculatedAnswer {
  calculationType: CalculationType;
  vlanIndex?: number;              // Which VLAN (0-9)
  lecturerOffset?: number;         // For exact offset (1-254)
  lecturerRangeStart?: number;     // For range start (1-254)
  lecturerRangeEnd?: number;       // For range end (1-254)
  deviceId?: string;               // For device interface IPs
  interfaceName?: string;          // For device interface IPs
}

export interface IpTableCell {
  cellId: string;                     // Unique cell identifier
  rowId: string;                      // Reference to row
  columnId: string;                   // Reference to column

  // Cell type configuration
  cellType: CellType;                 // 'input', 'readonly', or 'blank'

  // Answer configuration (only for input cells)
  answerType?: CellAnswerType;        // 'static' or 'calculated' (only for input cells)

  // For static answers (only for input cells)
  staticAnswer?: string;              // Direct text answer (e.g., "8.8.8.8")

  // For calculated answers (only for input cells)
  calculatedAnswer?: CalculatedAnswer;

  // For read-only cells - pre-filled content
  readonlyContent?: string;           // Pre-filled content for readonly cells

  // For blank cells - no interaction allowed
  blankReason?: string;               // Optional reason why cell is blank (for display)

  // Legacy field (keep for backward compatibility during migration)
  expectedAnswer?: string;            // @deprecated Use staticAnswer or calculatedAnswer instead

  points: number;                     // Points for this cell (default: 1)
  autoCalculated: boolean;            // Whether this was auto-calculated or manually entered
}

// Question Interface
export interface Question {
  questionId: string;
  questionText: string;
  questionType: QuestionType;
  order: number;
  points: number;

  // Hybrid Schema Mapping
  schemaMapping?: {
    vlanIndex: number;         // Which VLAN (0-9), auto-detected from question text, editable
    field: 'networkAddress' | 'subnetMask' | 'firstUsableIp' | 'lastUsableIp' | 'broadcastAddress';
    deviceId?: string;         // For device-specific IPs
    variableName?: string;     // For device interface IPs
    autoDetected?: boolean;    // Was VLAN auto-detected?
  };

  // Validation
  answerFormula?: string;
  expectedAnswerType: 'exact' | 'range';
  placeholder?: string;
  inputFormat?: 'ip' | 'cidr' | 'number' | 'text';

  // Custom question support
  expectedAnswer?: string;        // Lecturer-defined exact match answer
  caseSensitive?: boolean;        // Whether comparison is case-sensitive
  trimWhitespace?: boolean;       // Whether to trim whitespace before comparison

  // IP Table Questionnaire (only for 'ip_table_questionnaire' type)
  ipTableQuestionnaire?: IpTableQuestionnaire;
}

// Lab Parts Structure
export interface LabPart {
  labId: string;             // Reference to lab (ObjectId from lab creation)
  partId: string;            // Human-readable ID (e.g., "part1", "routing")
  title: string;             // Part title
  description?: string;      // Optional description (Markdown)
  instructions: string;      // Student instructions (Markdown, max 10000 chars)
  order: number;             // Display sequence

  // Enhanced part types
  partType: PartType;        // Type of part: fill_in_blank, network_config

  // For fill-in-the-blank parts
  questions?: Question[];

  tasks: Task[];             // Array of tasks (min 1 required for network_config)
  task_groups: TaskGroup[];  // Optional task grouping

  prerequisites: string[];   // Part IDs that must be completed first
  totalPoints: number;       // Sum of task points (or question points for fill_in_blank)
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
  id: string;                // Template MongoDB ObjectId
  templateId: string;        // Human-readable template ID
  name: string;              // Display name
  description: string;       // What this template does
  source?: 'mongo' | 'minio' | string; // Where the template originates
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
  defaultTestCase?: {        // Optional single default test case
    comparison_type: string;
    expected_result: any;
  } | null;
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

// Exempt IP Range Structure
export interface IpRange {
  start: string;      // Starting IP (e.g., "10.0.0.1")
  end?: string;       // Ending IP (optional, for ranges like "10.0.0.1-10.0.0.10")
  original: string;   // Original input text for display
}

// Wizard Form Data Structure
export interface LabWizardData {
  // Step 1: Basic Lab Information
  basicInfo: {
    name: string;
    description: string;
    instructions: RichTextContent;
  };

  // Step 2: Network Configuration
  networkConfig: {
    managementNetwork: string;
    managementSubnetMask: number;
    mode: 'fixed_vlan' | 'lecturer_group' | 'calculated_vlan' | '';
    allocationStrategy: 'student_id_based' | 'group_based';
    vlanCount: number;
    vlans: Array<{
      id?: string;
      vlanId?: number;
      calculationMultiplier?: number;
      baseNetwork: string;
      subnetMask: number;
      subnetIndex: number;       // NEW: Which subnet block (0 = first, 1 = second, etc.)
      groupModifier?: number;
      isStudentGenerated: boolean;
    }>;
    exemptIpRanges: IpRange[];  // IPs to exclude from Management IP assignment
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

// Student IP Schema Types
export interface VlanSchema {
  vlanIndex: number;           // Which VLAN (0-9)
  networkAddress: string;      // e.g., "172.16.40.64"
  subnetMask: number;          // e.g., 26
  subnetIndex: number;         // Which subnet block
  firstUsableIp: string;       // e.g., "172.16.40.65"
  lastUsableIp: string;        // e.g., "172.16.40.126"
  broadcastAddress: string;    // e.g., "172.16.40.127"
  source: 'calculated' | 'student_updated';
  updatedAt: string;           // ISO date string
}

export interface DeviceInterface {
  variableName: string;        // e.g., "gig0_0_vlan_1"
  ipAddress: string;           // e.g., "172.16.40.112"
  subnetMask?: string;
  source: 'calculated' | 'dhcp' | 'manual_update';
  updatedAt: string;           // ISO date string
  updatedBy: 'initial_calculation' | 'student_update';
}

export interface DeviceSchema {
  deviceId: string;            // e.g., "router1"
  interfaces: DeviceInterface[];
}

export interface StudentIpSchema {
  exists: boolean;
  schemaId?: string;
  version: number;
  schema: {
    vlans: VlanSchema[];
    devices: DeviceSchema[];
  };
  canEdit: boolean;
  calculationPartId?: string;
  updatedAt?: string;
}

// Wizard-specific Lab Part (extended with UI state)
export interface WizardLabPart extends Omit<LabPart, 'labId'> {
  tempId: string;            // Temporary ID for wizard use
  isExpanded: boolean;       // UI state for accordion
  showInstructionsPreview?: boolean;
  tasks: WizardTask[];       // Extended tasks with UI state
  questions?: Question[];    // Questions for fill_in_blank parts
  hasSubmissions?: boolean;  // Whether students have submissions for this part
  submissionSummary?: PartSubmissionSummary;
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
