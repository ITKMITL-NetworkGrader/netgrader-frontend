// IP Schema management types

export interface NetworkConfig {
  baseNetwork: string;
  subnetMask: number;
  gateway?: string;
  description?: string;
}

export interface DeviceConfig {
  deviceId: string;
  deviceName: string;
  ipVariable: string;
  hostOffset: number;
  description?: string;
  isIsolated?: boolean;
  ansibleUsername?: string;
  ansiblePassword?: string;
}

export interface IPSchemaConfig {
  networkConfig: NetworkConfig;
  deviceConfigs: DeviceConfig[];
  allocationStrategy: 'group_based' | 'student_id_based';
  reservedIPs?: string[];
}

export interface StudentCSVRow {
  studentId: string;
  groupNumber?: number;
  fullName?: string;
}

export interface CSVValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  parsedData?: StudentCSVRow[];
  stats?: {
    totalStudents: number;
    studentsWithGroups: number;
    uniqueGroups: number;
    groupNumbers: number[];
  };
}

export interface IPAssignment {
  studentId: string;
  groupNumber?: number;
  deviceAssignments: {
    deviceId: string;
    ipAddress: string;
    variableName: string;
  }[];
  ipMappings: Record<string, string>;
}

export interface NetworkInfo {
  network: string;
  broadcast: string;
  firstHost: string;
  lastHost: string;
  totalHosts: number;
  subnetMask: string;
  cidr: string;
}

export interface IPGenerationResult {
  success: boolean;
  assignments?: IPAssignment[];
  networkInfo?: NetworkInfo;
  errors?: string[];
  warnings?: string[];
}

// CSV Upload Configuration
export interface CSVUploadConfig {
  hasHeaders: boolean;
  separator: ';' | ',' | '\t';
  expectedColumns: {
    studentId: number;
    groupNumber?: number;
    fullName?: number;
  };
}

// IP Pattern Types
export type IPPattern = {
  type: 'static' | 'group_offset' | 'student_offset' | 'sequential';
  baseIP: string;
  offset?: number;
  formula?: string;
};

export interface IPGenerationStrategy {
  name: string;
  description: string;
  supportsGroups: boolean;
  supportsExams: boolean;
  generateIP: (
    baseNetwork: string,
    hostOffset: number,
    studentId?: string,
    groupNumber?: number
  ) => string;
}