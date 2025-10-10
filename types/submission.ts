// Submission and Grading System Types
// Based on the backend schema and API requirements

export interface ITestCaseResult {
  description: string;
  expected_value: any;
  actual_value: any;
  comparison_type: string;
  status: 'passed' | 'failed' | 'error';
  points_earned: number;
  points_possible: number;
  message: string;
}

export interface IDebugInfo {
  enabled: boolean;
  parameters_received?: Record<string, any>;
  registered_variables?: Record<string, any>;
  command_results?: Array<Record<string, any>>;
  validation_details?: Array<Record<string, any>>;
  custom_debug_points?: Record<string, any>;
}

export interface ITestResult {
  test_name: string;
  status: 'passed' | 'failed' | 'error';
  message: string;
  points_earned: number;
  points_possible: number;
  execution_time: number;
  test_case_results: ITestCaseResult[];
  extracted_data?: Record<string, any>;
  raw_output?: string;
  debug_info?: IDebugInfo;
  group_id?: string;
}

export interface IGroupResult {
  group_id: string;
  title: string;
  status: 'passed' | 'failed' | 'cancelled';
  group_type: string;
  points_earned: number;
  points_possible: number;
  execution_time: number;
  task_results: ITestResult[];
  message: string;
  rescue_executed: boolean;
  cleanup_executed: boolean;
}

export interface IGradingResult {
  job_id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  total_points_earned: number;
  total_points_possible: number;
  test_results: ITestResult[];
  group_results: IGroupResult[];
  total_execution_time: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
  cancelled_reason?: string;
}

export interface IProgressUpdate {
  message: string;
  current_test?: string;
  tests_completed: number;
  total_tests: number;
  percentage: number;
  timestamp: Date;
}

export interface ISubmission {
  jobId: string;
  studentId: string;
  labId: string;
  partId: string;
  
  // Submission Status
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  submittedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  
  // Grading Results
  gradingResult?: IGradingResult;
  
  // Progress Tracking
  progressHistory: IProgressUpdate[];
  
  // Additional metadata
  attempt: number;
  ipMappings: Record<string, string>;
  callbackUrl: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// API Request/Response Types
export interface CreateSubmissionRequest {
  lab_id: string;
  part_id: string;
}

export interface CreateSubmissionResponse {
  success: boolean;
  data?: {
    jobId: string;
    status: string;
    message: string;
  };
  message?: string;
  error?: string;
}

export interface GetSubmissionResponse {
  success: boolean;
  data?: ISubmission;
  message?: string;
  error?: string;
}

// UI State Types
export interface SubmissionState {
  isSubmitting: boolean;
  currentSubmission: ISubmission | null;
  lastSubmissionJobId: string | null;
  pollingInterval: NodeJS.Timeout | null;
  sseConnection: EventSource | null;  // SSE connection for real-time updates
  showProgressDetails: boolean;
}

// Grading Status Display Types
export interface GradingStatusDisplay {
  status: 'idle' | 'submitting' | 'grading' | 'completed' | 'failed' | 'cancelled';
  message: string;
  progress?: {
    percentage: number;
    current_test?: string;
    tests_completed: number;
    total_tests: number;
  };
  results?: IGradingResult;
  error?: string;
}