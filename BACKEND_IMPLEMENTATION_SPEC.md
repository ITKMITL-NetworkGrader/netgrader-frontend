# Backend Implementation Specification
## NetGrader Dynamic IP Schema System

**Version**: 1.0
**Date**: December 2024
**Audience**: Backend Development Team
**Dependencies**: DYNAMIC_IP_SCHEMA_ARCHITECTURE.md, EXAM_CREATION_IMPLEMENTATION_PLAN.md

---

## 📋 Table of Contents

1. [Overview & Context](#overview--context)
2. [Real-World Exam Example](#real-world-exam-example)
3. [IP Calculation Algorithms](#ip-calculation-algorithms)
4. [Data Models & Schema](#data-models--schema)
5. [API Specifications](#api-specifications)
6. [Validation Rules](#validation-rules)
7. [Error Handling](#error-handling)
8. [Integration Points](#integration-points)
9. [Testing Requirements](#testing-requirements)
10. [Security & Performance](#security--performance)

---

## 📊 Overview & Context

### Problem Statement

Students take networking exams where:
1. Each student gets **random variables** (X, Y, Z, A, B) for personalized IP addressing
2. Students **calculate IPs** based on subnet requirements (e.g., "VLAN A needs ≥30 hosts")
3. Students **configure DHCP** with lecturer-defined pools
4. Device IPs may **change via DHCP**, requiring schema updates
5. **Grading service** needs student's actual IPs to connect and test devices

### Solution Architecture

**Student IP Schema** = Mutable, versioned database of student's declared IPs

- **Version 1**: Initial calculation (Part 1: IP Calculation)
- **Version 2+**: Updates after DHCP assignment (Part 2: DHCP Config)
- **Version N**: Unlimited updates, no locking
- **Grading**: Always uses latest schema version

---

## 🎓 Real-World Exam Example

### CNI2024 Exam Structure

**Reference**: `CNI2024-Exam-v1.md`, `Topology.png`

```
Student Pod Topology:
┌─────────────────────────────────────────────┐
│  ext-conn-0 (Cloud)                         │
│       │                                     │
│   [Router0] E0/0 ←→ E0/1 [Router1]         │
│       │ E0/1              │ E0/0            │
│       │                   │                 │
│       └───────[Switch0]───┘                 │
│            E0/1   E0/2                      │
│              │      │                       │
│          [PC-1] [PC-2]                      │
│        (ubuntu-0) (ubuntu-1)                │
└─────────────────────────────────────────────┘
```

### Random Variables (Per Student)

```typescript
interface StudentRandomVariables {
  X: number;  // Range: 1-255 (used in IPv4/IPv6)
  Y: number;  // Range: 1-255 (used in IPv4/IPv6)
  Z: number;  // Range: 1-255 (used for host IDs)
  A: number;  // Range: 10-99 (VLAN number)
  B: number;  // Range: 10-99 (VLAN number, B > A)
}

// Example:
const studentVariables = {
  X: 16,
  Y: 40,
  Z: 100,
  A: 10,
  B: 20
}
```

### Part 2: IP Assignment (5 points, 20 minutes)

**Student must calculate and fill in table:**

#### Requirements:
1. **Base Network**: `172.X.Y.128/25` (e.g., `172.16.40.128/25`)
2. **VLAN A**: Needs ≥30 usable IPs, closest fit
3. **VLAN B**: Needs ≥50 usable IPs, closest fit
4. **VLAN A subnet number** < **VLAN B subnet number**
5. **Router-to-Router**: `192.168.Z.0/24`

#### IPv4 Assignment Rules:

| Device | Interface | Host ID Rule |
|--------|-----------|--------------|
| Router0 | E0/0 | 1st usable in subnet |
| Router0 | E0/1 | Z (from random variables) |
| Router1 | E0/0.A | 1st usable in VLAN A |
| Router1 | E0/0.B | 1st usable in VLAN B |
| Router1 | E0/1 | Last usable in router-to-router subnet |
| Switch0 | VLAN A | Last usable in VLAN A |
| PC-1 | ens2 | 2nd usable in VLAN A |
| PC-2 | ens2 | **DHCP** (Host ID 5-10 in VLAN B) |

#### DHCP Pool Constraints:
- **Lecturer-defined**: DHCP pool MUST provide IPs with Host ID 5-10 only
- **Example**: If VLAN B subnet is `172.16.40.192/26`, valid DHCP pool:
  - Network: `172.16.40.192`
  - First usable: `172.16.40.193`
  - Host 5: `172.16.40.197`
  - Host 10: `172.16.40.202`
  - **DHCP Pool**: `172.16.40.197` - `172.16.40.202`

---

## 🧮 IP Calculation Algorithms

### Algorithm 1: Calculate Subnet Size

```typescript
/**
 * Calculate the smallest subnet mask that can fit required hosts
 *
 * @param requiredHosts - Minimum number of usable host IPs needed
 * @returns CIDR prefix length (e.g., 26 for /26)
 *
 * Formula:
 * - Usable hosts = 2^(32-prefix) - 2
 * - Find smallest prefix where usable hosts >= requiredHosts
 */
function calculateSubnetMask(requiredHosts: number): number {
  for (let prefix = 30; prefix >= 1; prefix--) {
    const usableHosts = Math.pow(2, 32 - prefix) - 2;
    if (usableHosts >= requiredHosts) {
      return prefix;
    }
  }
  throw new Error(`Cannot fit ${requiredHosts} hosts in any valid subnet`);
}

// Examples:
calculateSubnetMask(30);  // Returns 27 (/27 = 30 usable hosts)
calculateSubnetMask(50);  // Returns 26 (/26 = 62 usable hosts)
calculateSubnetMask(100); // Returns 25 (/25 = 126 usable hosts)
```

### Algorithm 2: Calculate Subnet Ranges

```typescript
/**
 * Calculate network address, first/last usable, and broadcast
 *
 * @param baseIp - Base network IP (e.g., "172.16.40.128")
 * @param prefixLength - Subnet mask in CIDR (e.g., 27)
 * @param subnetIndex - Which subnet block (0 = first, 1 = second, etc.)
 * @returns Subnet details
 */
interface SubnetCalculation {
  networkAddress: string;
  firstUsableIp: string;
  lastUsableIp: string;
  broadcastAddress: string;
  subnetMask: number;
  subnetIndex: number;
  usableHosts: number;
}

function calculateSubnet(
  baseIp: string,
  prefixLength: number,
  subnetIndex: number
): SubnetCalculation {
  // 1. Calculate block size
  const blockSize = Math.pow(2, 32 - prefixLength);

  // 2. Convert base IP to number
  const baseIpNum = ipToNumber(baseIp);

  // 3. Calculate network address
  const networkNum = baseIpNum + (subnetIndex * blockSize);
  const networkAddress = numberToIp(networkNum);

  // 4. Calculate first usable IP (network + 1)
  const firstUsableIp = numberToIp(networkNum + 1);

  // 5. Calculate broadcast address (network + blockSize - 1)
  const broadcastNum = networkNum + blockSize - 1;
  const broadcastAddress = numberToIp(broadcastNum);

  // 6. Calculate last usable IP (broadcast - 1)
  const lastUsableIp = numberToIp(broadcastNum - 1);

  // 7. Calculate usable hosts
  const usableHosts = blockSize - 2;

  return {
    networkAddress,
    firstUsableIp,
    lastUsableIp,
    broadcastAddress,
    subnetMask: prefixLength,
    subnetIndex,
    usableHosts
  };
}

// Helper: Convert IP string to 32-bit number
function ipToNumber(ip: string): number {
  const octets = ip.split('.').map(Number);
  return (octets[0] << 24) + (octets[1] << 16) + (octets[2] << 8) + octets[3];
}

// Helper: Convert 32-bit number to IP string
function numberToIp(num: number): string {
  return [
    (num >>> 24) & 255,
    (num >>> 16) & 255,
    (num >>> 8) & 255,
    num & 255
  ].join('.');
}
```

**Example Usage:**

```typescript
// Student variables: X=16, Y=40
// Base: 172.16.40.128/25

// VLAN A needs ≥30 hosts
const vlanAMask = calculateSubnetMask(30);  // Returns 27 (/27 = 30 hosts)
const vlanA = calculateSubnet("172.16.40.128", 27, 0);
// Result:
// {
//   networkAddress: "172.16.40.128",
//   firstUsableIp: "172.16.40.129",
//   lastUsableIp: "172.16.40.158",
//   broadcastAddress: "172.16.40.159",
//   subnetMask: 27,
//   subnetIndex: 0,
//   usableHosts: 30
// }

// VLAN B needs ≥50 hosts
const vlanBMask = calculateSubnetMask(50);  // Returns 26 (/26 = 62 hosts)
const vlanB = calculateSubnet("172.16.40.128", 26, 1);
// Result:
// {
//   networkAddress: "172.16.40.192",
//   firstUsableIp: "172.16.40.193",
//   lastUsableIp: "172.16.40.254",
//   broadcastAddress: "172.16.40.255",
//   subnetMask: 26,
//   subnetIndex: 1,
//   usableHosts: 62
// }
```

### Algorithm 3: Calculate Specific Host IP

```typescript
/**
 * Calculate IP for a specific host position in subnet
 *
 * @param subnet - Subnet calculation result
 * @param position - Host position: 'first', 'second', 'last', or specific number
 * @returns IP address string
 */
function getHostIp(
  subnet: SubnetCalculation,
  position: 'first' | 'second' | 'last' | number
): string {
  const networkNum = ipToNumber(subnet.networkAddress);

  if (position === 'first') {
    // First usable = network + 1
    return numberToIp(networkNum + 1);
  } else if (position === 'second') {
    // Second usable = network + 2
    return numberToIp(networkNum + 2);
  } else if (position === 'last') {
    // Last usable = broadcast - 1
    const broadcastNum = ipToNumber(subnet.broadcastAddress);
    return numberToIp(broadcastNum - 1);
  } else if (typeof position === 'number') {
    // Specific host number (1-indexed)
    if (position < 1 || position > subnet.usableHosts) {
      throw new Error(`Host ${position} out of range (1-${subnet.usableHosts})`);
    }
    return numberToIp(networkNum + position);
  }

  throw new Error(`Invalid position: ${position}`);
}

// Examples:
getHostIp(vlanA, 'first');   // "172.16.40.129" (Router1 E0/0.A)
getHostIp(vlanA, 'second');  // "172.16.40.130" (PC-1)
getHostIp(vlanA, 'last');    // "172.16.40.158" (Switch0)
getHostIp(vlanB, 5);         // "172.16.40.197" (DHCP pool start)
getHostIp(vlanB, 10);        // "172.16.40.202" (DHCP pool end)
```

### Algorithm 4: VLSM Subnet Allocation

```typescript
/**
 * Allocate multiple VLANs using VLSM from a base network
 * Allocates largest subnets first to avoid fragmentation
 *
 * @param baseNetwork - Base network (e.g., "172.16.40.128")
 * @param basePrefix - Base prefix length (e.g., 25)
 * @param requirements - Array of VLAN requirements sorted by size (largest first)
 * @returns Array of subnet allocations
 */
interface VlanRequirement {
  vlanIndex: number;
  minHosts: number;
}

interface VlanAllocation extends SubnetCalculation {
  vlanIndex: number;
}

function allocateVlans(
  baseNetwork: string,
  basePrefix: number,
  requirements: VlanRequirement[]
): VlanAllocation[] {
  // Sort requirements by minHosts descending (largest first)
  const sorted = [...requirements].sort((a, b) => b.minHosts - a.minHosts);

  const allocations: VlanAllocation[] = [];
  let currentSubnetIndex = 0;

  for (const req of sorted) {
    // Calculate required subnet mask
    const subnetMask = calculateSubnetMask(req.minHosts);

    // Validate subnet can fit in base network
    if (subnetMask < basePrefix) {
      throw new Error(
        `VLAN ${req.vlanIndex} requires /${subnetMask} but base is /${basePrefix}`
      );
    }

    // Calculate subnet
    const subnet = calculateSubnet(baseNetwork, subnetMask, currentSubnetIndex);

    // Add to allocations
    allocations.push({
      ...subnet,
      vlanIndex: req.vlanIndex
    });

    // Move to next subnet block
    // Block size determines how many subnet slots are consumed
    const blockSize = Math.pow(2, 32 - subnetMask);
    const baseBlockSize = Math.pow(2, 32 - basePrefix);
    currentSubnetIndex += Math.ceil(blockSize / baseBlockSize);
  }

  return allocations;
}

// Example: CNI2024 Exam
const vlanAllocations = allocateVlans(
  "172.16.40.128",  // Base network
  25,               // /25 base
  [
    { vlanIndex: 0, minHosts: 30 },  // VLAN A (A=10)
    { vlanIndex: 1, minHosts: 50 }   // VLAN B (B=20)
  ]
);
// Returns allocations ordered by subnet number (VLAN A before VLAN B)
```

---

## 🗄️ Data Models & Schema

### 1. StudentIpSchema Model

**Collection**: `student_ip_schemas`

```typescript
import { Schema, model, Types, Document } from 'mongoose';

interface IStudentIpSchema extends Document {
  studentId: Types.ObjectId;      // Ref: users._id
  labId: Types.ObjectId;          // Ref: labs._id

  // The actual IP schema (student-managed)
  schema: {
    // VLAN-level schema
    vlans: Array<{
      vlanIndex: number;           // Which VLAN (0-9)
      networkAddress: string;      // e.g., "172.16.40.128"
      subnetMask: number;          // CIDR prefix (e.g., 27)
      subnetIndex: number;         // Which subnet block (0, 1, 2...)
      firstUsableIp: string;       // e.g., "172.16.40.129"
      lastUsableIp: string;        // e.g., "172.16.40.158"
      broadcastAddress: string;    // e.g., "172.16.40.159"

      // Metadata
      source: 'calculated' | 'student_updated';
      updatedAt: Date;
    }>;

    // Device-level IP assignments
    devices: Array<{
      deviceId: string;            // e.g., "router1"
      interfaces: Array<{
        variableName: string;      // e.g., "gig0_0_vlan_1", "e0_0"
        ipAddress: string;         // e.g., "172.16.40.129"
        subnetMask?: string;       // e.g., "255.255.255.224" (optional)

        // Track how this IP was determined
        source: 'calculated' | 'dhcp' | 'manual_update';
        updatedAt: Date;
        updatedBy: 'initial_calculation' | 'student_update';
      }>;
    }>;
  };

  // Versioning for audit trail
  version: number;                 // Increments on each update (no max)
  previousVersionId?: Types.ObjectId; // Link to previous version

  // Metadata
  calculationPartId?: Types.ObjectId;  // Which part created this
  isLocked: boolean;               // Always false (no locking per requirements)

  createdAt: Date;
  updatedAt: Date;
}

const studentIpSchemaSchema = new Schema<IStudentIpSchema>({
  studentId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true
  },
  labId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Lab',
    index: true
  },
  schema: {
    vlans: [{
      vlanIndex: { type: Number, required: true, min: 0, max: 9 },
      networkAddress: { type: String, required: true },
      subnetMask: { type: Number, required: true, min: 1, max: 32 },
      subnetIndex: { type: Number, required: true, min: 0 },
      firstUsableIp: { type: String, required: true },
      lastUsableIp: { type: String, required: true },
      broadcastAddress: { type: String, required: true },
      source: {
        type: String,
        enum: ['calculated', 'student_updated'],
        required: true
      },
      updatedAt: { type: Date, required: true }
    }],
    devices: [{
      deviceId: { type: String, required: true },
      interfaces: [{
        variableName: { type: String, required: true },
        ipAddress: { type: String, required: true },
        subnetMask: { type: String, required: false },
        source: {
          type: String,
          enum: ['calculated', 'dhcp', 'manual_update'],
          required: true
        },
        updatedAt: { type: Date, required: true },
        updatedBy: {
          type: String,
          enum: ['initial_calculation', 'student_update'],
          required: true
        }
      }]
    }]
  },
  version: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  previousVersionId: {
    type: Schema.Types.ObjectId,
    required: false,
    ref: 'StudentIpSchema'
  },
  calculationPartId: {
    type: Schema.Types.ObjectId,
    required: false,
    ref: 'LabPart'
  },
  isLocked: {
    type: Boolean,
    required: true,
    default: false  // Always false per requirements
  }
}, {
  timestamps: true,
  collection: 'student_ip_schemas'
});

// Indexes for performance
studentIpSchemaSchema.index({ studentId: 1, labId: 1 });
studentIpSchemaSchema.index({ labId: 1, version: -1 });
studentIpSchemaSchema.index({ studentId: 1, labId: 1, version: -1 });

export const StudentIpSchema = model<IStudentIpSchema>('StudentIpSchema', studentIpSchemaSchema);
```

### 2. Updated LabPart Model

**File**: `src/modules/parts/model.ts`

```typescript
// Add to existing ILabPart interface

export interface ILabPart extends Document {
  // ... existing fields (labId, partId, title, etc.)

  // ENHANCED: Part type with 3 options
  partType: 'fill_in_blank' | 'network_config' | 'dhcp_config';

  // NEW: For fill-in-the-blank parts
  questions?: Array<{
    questionId: string;
    questionText: string;
    questionType: 'network_address' | 'first_usable_ip' | 'last_usable_ip' |
                  'broadcast_address' | 'subnet_mask' | 'ip_address' | 'number' |
                  'custom_text' | 'ip_table_questionnaire';
    order: number;
    points: number;

    // Schema mapping (how answer maps to StudentIpSchema)
    // Optional because purely textual questions do not update the schema
    schemaMapping?: {
      vlanIndex: number;         // Which VLAN (0-9)
      field: 'networkAddress' | 'subnetMask' | 'firstUsableIp' |
             'lastUsableIp' | 'broadcastAddress';
      deviceId?: string;         // For device-specific IPs
      variableName?: string;     // For device interface IPs
      autoDetected?: boolean;    // Was VLAN auto-detected?
    };

    // Validation metadata
    answerFormula?: string;      // Reserved for future auto-validation
    expectedAnswerType: 'exact' | 'range';
    placeholder?: string;
    inputFormat?: 'ip' | 'cidr' | 'number' | 'text';

    // Lecturer-defined answer (custom text questions)
    expectedAnswer?: string;     // Required when questionType === 'custom_text'
    caseSensitive?: boolean;     // Default false
    trimWhitespace?: boolean;    // Default true

    // IP Table Questionnaire (ONLY for 'ip_table_questionnaire' type)
    ipTableQuestionnaire?: {
      tableId: string;
      rowCount: number;            // 1-10 rows
      columnCount: number;         // 1-10 columns
      autoCalculate: boolean;      // Whether answers were auto-calculated

      columns: Array<{
        columnId: string;
        columnType: 'ipv4' | 'ipv6' | 'subnet_mask' | 'gateway' | 'default_gateway' |
                    'broadcast_address' | 'network_address' | 'prefix_length' |
                    'link_local_address' | 'dns';
        vlanIndex?: number;        // Required for VLAN-specific column types
        label?: string;            // Optional custom label
        order: number;             // Column display order (0-based)
      }>;

      rows: Array<{
        rowId: string;
        deviceId: string;          // Device ID (e.g., "router1")
        interfaceName: string;     // Interface name (e.g., "g0-1")
        displayName: string;       // Display format (e.g., "router1.g0-1")
        order: number;             // Row display order (0-based)
      }>;

      cells: Array<Array<{
        cellId: string;
        rowId: string;
        columnId: string;

        /**
         * How this cell should be evaluated:
         * - manual        → Compare against a single literal answer
         * - manual_range  → Accept any value within the defined range
         * - dynamic       → Resolve value from generated student schema at grading time
         */
        answerMode: 'manual' | 'manual_range' | 'dynamic';

        // Manual single-value answer (required when answerMode === 'manual')
        expectedAnswer?: string;

        // Manual range answer (required when answerMode === 'manual_range')
        expectedRange?: {
          start: string;           // Inclusive lower bound (normalised format per column type)
          end: string;             // Inclusive upper bound
          step?: number;           // Optional increment for numeric ranges (default = 1)
          format?: 'ipv4' | 'ipv6' | 'cidr' | 'number' | 'text'; // Optional hint for validation/UI
        };

        // Dynamic reference (required when answerMode === 'dynamic')
        dynamicReference?: {
          source: 'vlan' | 'device_interface'; // Which resolver to use
          field: 'ipv4' | 'ipv6' | 'subnet_mask' | 'gateway' | 'default_gateway' |
                 'broadcast_address' | 'network_address' | 'prefix_length' |
                 'link_local_address' | 'dns';
          vlanIndex?: number;      // Required when resolving VLAN-level data
          deviceId?: string;       // Required when resolving device/interface data
          interfaceName?: string;  // Required with deviceId for interface-based lookups
          previewValue?: string;   // Optional cached preview returned to the frontend
        };

        points: number;            // Points for this cell (min: 1)
        autoCalculated: boolean;   // Whether auto-calculated or manual
      }>>;  // 2D array: cells[rowIndex][columnIndex]
    };
  }>;

 /**
  * 📘 IP Table Answer Modes
  *
  * `answerMode` mirrors the options exposed in the Lab Wizard (Step 4 → Advanced IP Table Questionnaire):
  *
   * - **manual** – the instructor types a single canonical value.
   *   - Stored in `expectedAnswer`.
   *   - Grading performs a normalised string comparison (trim + lowercase for IP-like types).
   * - **manual_range** – the instructor supplies an inclusive range instead of a single value.
   *   - Stored inside `expectedRange.start`/`expectedRange.end` (frontend enforces ordering).
   *   - `utils/ipRangeUtils.ts` provides helpers for IPv4/IPv6 range comparison; numeric ranges use integer comparisons.
   *   - Optional `step` lets lecturers constrain acceptable answers (e.g., “only even offsets”).
   * - **dynamic** – the value comes from the generated Student IP Schema at grading time.
   *   - `dynamicReference.source` tells the backend whether to read from `schema.vlans` (`vlan` source) or `schema.devices[].interfaces` (`device_interface` source).
   *   - `field` maps directly to the column type dropdown in the UI.
   *   - `previewValue` is optional and purely informational (frontend may pass a cached example, backend ignores during comparison).
   *
   * The frontend prevents illegal combinations (e.g., requiring `deviceId` + `interfaceName` whenever the source is `device_interface`).
   * Metadata bindings:
   *   - Columns inherit their `columnType` and optional `vlanIndex` directly from the wizard dropdowns (see `LabWizardStep4.vue` + `IpTableBuilderModal.vue`).
   *   - Rows capture `deviceId`/`interfaceName` pairs sourced from Step 3's device inventory, ensuring backend lookups align with lab topology.
   */

  /**
   * Validation rules (enforced in service + schema middleware):
   * - Every question requires non-empty questionText and positive points.
   * - For `ip_table_questionnaire` questions:
   *     • `ipTableQuestionnaire` is REQUIRED.
   *     • `rowCount` and `columnCount` must be between 1-10.
   *     • All columns must have valid `columnType`.
   *     • VLAN-specific columns (ipv4, ipv6, subnet_mask, gateway, etc.) require `vlanIndex` (0-9).
   *     • All rows must have `deviceId` and `interfaceName`.
   *     • Every cell must define `answerMode`.
   *     • For `answerMode === 'manual'`, `expectedAnswer` is required (non-empty).
   *     • For `answerMode === 'manual_range'`, `expectedRange.start`/`expectedRange.end` are required, must parse to valid values for the column type, and `start <= end` after normalisation.
   *     • For `answerMode === 'dynamic'`, `dynamicReference` must provide the appropriate identifiers (VLAN and/or device/interface).
   *     • All cells must have `points >= 1`.
   *     • Total question points = sum of all cell points.
   *     • `schemaMapping` MUST be omitted (table answers do not update StudentIpSchema directly).
   * - For networking-focused question types (anything except `custom_text` and `ip_table_questionnaire`):
   *     • `schemaMapping` is REQUIRED.
   *     • `schemaMapping.vlanIndex` must be between 0-9.
   * - For `custom_text` questions:
   *     • `expectedAnswer` is REQUIRED (stored exactly as provided).
   *     • `caseSensitive` defaults to false when undefined.
   *     • `trimWhitespace` defaults to true when undefined.
   *     • `schemaMapping` MUST be omitted (these answers do not update StudentIpSchema).
 * - For `dhcp_config` parts:
 *     • `vlanIndex`, `startOffset`, `endOffset`, and `dhcpServerDevice` are REQUIRED.
 *     • Offset values must stay within the usable host range for the selected VLAN (derived from subnet mask and subnet index) with `startOffset < endOffset`.
   */

  // NEW: For DHCP configuration parts
  dhcpConfiguration?: {
    vlanIndex: number;             // Which VLAN this pool serves (0-9)
    startOffset: number;           // Last octet offset within VLAN host range
    endOffset: number;             // Last octet offset within VLAN host range
    dhcpServerDevice: string;      // e.g., "router1"
  };

  /**
 * ⚠️ Storage Note:
 * - Database stores ONLY offset values (usable host offsets clamped to 1-254), not full IPs
   * - Full IPs are calculated dynamically when needed:
   *   - During grading: Use lab's VLAN config + offset to connect to devices
   *   - During validation: Construct IPs to validate student submissions
 * - Frontend validation ensures offsets stay within the usable host range for the selected VLAN
   *
   * Example dynamic IP construction:
   * ```typescript
   * function constructIp(vlan: Vlan, offset: number): string {
   *   const parts = vlan.baseNetwork.split('.');
   *   parts[3] = String(offset);
   *   return parts.join('.');
   * }
   * ```
   */

  // EXISTING: Tasks (ONLY for network_config part type)
  tasks: Array<ITask>;
  task_groups: Array<ITaskGroup>;

  // ... other existing fields
}

// Validation middleware
labPartSchema.pre('save', function(next) {
  // Part type content validation
  if (this.partType === 'fill_in_blank') {
    if (!this.questions || this.questions.length === 0) {
      return next(new Error('fill_in_blank part must have questions'));
    }
    if (this.tasks.length > 0 || this.dhcpConfiguration) {
      return next(new Error('fill_in_blank part cannot have tasks or dhcpConfiguration'));
    }
  } else if (this.partType === 'dhcp_config') {
    if (!this.dhcpConfiguration) {
      return next(new Error('dhcp_config part must have dhcpConfiguration'));
    }
    if (this.tasks.length > 0 || this.questions) {
      return next(new Error('dhcp_config part cannot have tasks or questions'));
    }
  } else if (this.partType === 'network_config') {
    if (this.tasks.length === 0) {
      return next(new Error('network_config part must have tasks'));
    }
    if (this.questions || this.dhcpConfiguration) {
      return next(new Error('network_config part cannot have questions or dhcpConfiguration'));
    }
  }

  next();
});
```

---

## 🔌 API Specifications

### API 0: Create Lab Part (Lecturer Workflow)

**Endpoint**: `POST /v0/parts`

**Purpose**: Persist a lecturer-authored lab part after the wizard is completed.

**Authentication**: Instructor role required; course ownership validated upstream.

**Request Body**:

```typescript
interface CreateLabPartRequest {
  labId: string;
  partId: string;
  title: string;
  description?: string;
  instructions: string;
  order: number;
  partType: 'fill_in_blank' | 'network_config' | 'dhcp_config';
  tasks: ITaskPayload[];              // REQUIRED when partType === 'network_config', otherwise []
  task_groups: ITaskGroupPayload[];   // REQUIRED when partType === 'network_config', otherwise []
  questions?: QuestionPayload[];      // REQUIRED when partType === 'fill_in_blank'
  dhcpConfiguration?: DhcpConfigPayload; // REQUIRED when partType === 'dhcp_config'
  prerequisites: string[];
  totalPoints: number;
}
```

```typescript
interface QuestionPayload {
  questionId: string;
  questionText: string;
  questionType: 'network_address' | 'first_usable_ip' | 'last_usable_ip' |
                'broadcast_address' | 'subnet_mask' | 'ip_address' | 'number' |
                'custom_text' | 'ip_table_questionnaire';
  order: number;
  points: number;
  schemaMapping?: {
    vlanIndex: number;
    field: 'networkAddress' | 'subnetMask' | 'firstUsableIp' | 'lastUsableIp' | 'broadcastAddress';
    deviceId?: string;
    variableName?: string;
    autoDetected?: boolean;
  };
  answerFormula?: string;
  expectedAnswerType: 'exact' | 'range';
  placeholder?: string;
  inputFormat?: 'ip' | 'cidr' | 'number' | 'text';
  expectedAnswer?: string;     // REQUIRED when questionType === 'custom_text'
  caseSensitive?: boolean;     // Defaults to false when omitted
  trimWhitespace?: boolean;    // Defaults to true when omitted

  // IP Table Questionnaire (REQUIRED when questionType === 'ip_table_questionnaire')
  ipTableQuestionnaire?: IpTableQuestionnairePayload;
}

interface IpTableQuestionnairePayload {
  tableId: string;
  rowCount: number;            // 1-10 rows
  columnCount: number;         // 1-10 columns
  autoCalculate: boolean;

  columns: Array<{
    columnId: string;
    columnType: 'ipv4' | 'ipv6' | 'subnet_mask' | 'gateway' | 'default_gateway' |
                'broadcast_address' | 'network_address' | 'prefix_length' |
                'link_local_address' | 'dns';
    vlanIndex?: number;        // Required for VLAN-specific columns
    label?: string;
    order: number;
  }>;

  rows: Array<{
    rowId: string;
    deviceId: string;
    interfaceName: string;
    displayName: string;
    order: number;
  }>;

  cells: Array<Array<{
    cellId: string;
    rowId: string;
    columnId: string;
    expectedAnswer: string;
    points: number;
    autoCalculated: boolean;
  }>>;
}

interface DhcpConfigPayload {
  vlanIndex: number;             // Which VLAN this pool serves (0-9)
  startOffset: number;           // Last octet offset within VLAN host range
  endOffset: number;             // Last octet offset within VLAN host range
  dhcpServerDevice: string;
}

/**
 * ⚠️ IMPORTANT: Offset-Based Storage
 *
 * The frontend sends offset values constrained to the usable host range for the selected VLAN.
 * Host ranges account for the VLAN's subnet mask and subnet index, and are additionally clamped to 1-254.
 * The backend stores these values AS-IS in the database (no IP construction).
 *
 * Example:
 * Frontend sends:
 * {
 *   vlanIndex: 0,
 *   startOffset: 100,
 *   endOffset: 150,
 *   dhcpServerDevice: "router1"
 * }
 *
 * Backend stores directly (no transformation):
 * {
 *   vlanIndex: 0,
 *   startOffset: 100,           // Stored as-is
 *   endOffset: 150,             // Stored as-is
 *   dhcpServerDevice: "router1"
 * }
 *
 * Validation:
 * - Frontend already validates: offsets fall within the usable host range for the VLAN
 * - Frontend already validates: startOffset < endOffset
 * - Backend can optionally add server-side validation for security
 *
 * Dynamic IP Construction (when needed):
 * IPs are calculated on-the-fly during:
 * - Student submission validation
 * - Grading/device connection
 * - Display purposes
 *
 * Example helper function:
 * ```typescript
 * function constructDhcpIp(lab: Lab, vlanIndex: number, offset: number): string {
 *   const vlan = lab.network.vlanConfiguration.vlans[vlanIndex];
 *   const parts = vlan.baseNetwork.split('.');
 *   parts[3] = String(offset);
 *   return parts.join('.');
 * }
 *
 * // Usage during validation:
 * const dhcpStartIp = constructDhcpIp(lab, dhcpConfig.vlanIndex, dhcpConfig.startOffset);
 * const dhcpEndIp = constructDhcpIp(lab, dhcpConfig.vlanIndex, dhcpConfig.endOffset);
 * // Validate student's device IP is within dhcpStartIp - dhcpEndIp range
 * ```
 *
 * Benefits:
 * - Offset values work for all students (each has different VLAN base networks)
 * - No need to update database if VLAN configuration changes
 * - Smaller storage footprint
 * - Single source of truth for IP construction logic
 */
```

> **Frontend parity**: `pages/courses/[c_id]/labs/create.vue` constructs this payload. Network configuration parts send populated `tasks`/`task_groups` and leave `questions`/`dhcpConfiguration` undefined. Fill-in-the-blank parts send `questions` (including `expectedAnswer`, `caseSensitive`, and `trimWhitespace` for `custom_text`) while emitting empty `tasks` arrays. DHCP configuration parts include `dhcpConfiguration` and send empty `tasks` / `questions`.

> **Note**: `ITaskPayload` and `ITaskGroupPayload` mirror the task creation contracts documented in the _Network Configuration Tasks_ section (same shape as `ITask`/`ITaskGroup` in the model definition above). No additional fields are introduced here.

**Validation Summary**:

- `partType` drives which block is required.
- `questions` must be omitted for non `fill_in_blank` parts.
- `dhcpConfiguration` must be omitted unless `partType === 'dhcp_config'`.
- `tasks` and `task_groups` must be empty arrays for non `network_config` parts (frontend already enforces this).
- `dhcp_config` parts require: `vlanIndex`, `startOffset`, `endOffset`, `dhcpServerDevice`. Offsets must be within the usable host range for the VLAN and satisfy `startOffset < endOffset`.
- `ip_table_questionnaire` questions require:
  - Complete `ipTableQuestionnaire` object with all columns, rows, and cells configured
  - All column types must be valid
  - VLAN-specific columns must have `vlanIndex` (0-9)
  - All rows must reference valid devices from lab configuration
  - Each cell must define `answerMode` and supply the matching data:
    - `manual` → non-empty `expectedAnswer`
    - `manual_range` → valid `expectedRange.start`/`end` (inclusive, start ≤ end)
    - `dynamic` → populated `dynamicReference`
  - All cells must have `points >= 1`
  - Question's total `points` should equal sum of all cell points

The `labPartSchema.pre('save')` middleware (see Section 2) enforces these rules server-side.

---

### API 1: Submit/Update IP Calculation Answers

**Endpoint**: `POST /v0/labs/:labId/parts/:partId/submit-answers`

**Purpose**:
- Create initial StudentIpSchema (isUpdate=false)
- Update existing StudentIpSchema with new values (isUpdate=true)

**Authentication**:
- HTTP-only cookie session
- User must be enrolled in lab's course

**Request Headers**:
```http
Content-Type: application/json
Cookie: [session cookies sent automatically]
```

**Request Body**:
```typescript
interface SubmitAnswersRequest {
  answers: Array<{
    questionId: string;
    answer?: string;  // For simple questions: IP, CIDR number, plain number, or text

    // For IP Table Questionnaire questions
    tableAnswers?: Array<Array<string>>;  // 2D array: tableAnswers[rowIndex][columnIndex]
  }>;
  isUpdate: boolean;  // false = initial, true = update existing schema
}

/**
 * Answer Format Rules:
 * - Simple questions (network_address, custom_text, etc.): Use `answer` field
 * - IP Table Questionnaire: Use `tableAnswers` field (2D array)
 * - Exactly one of `answer` or `tableAnswers` must be provided per question
 */
```

**Request Example (Simple Questions)**:
```json
{
  "answers": [
    {
      "questionId": "q1_vlan_a_network",
      "answer": "172.16.40.128"
    },
    {
      "questionId": "q2_vlan_a_first_usable",
      "answer": "172.16.40.129"
    },
    {
      "questionId": "q3_vlan_a_last_usable",
      "answer": "172.16.40.158"
    },
    {
      "questionId": "q4_vlan_a_broadcast",
      "answer": "172.16.40.159"
    },
    {
      "questionId": "q5_vlan_a_subnet_mask",
      "answer": "27"
    },
    {
      "questionId": "q6_pc2_dhcp_ip",
      "answer": "172.16.40.197"
    }
  ],
  "isUpdate": false
}
```

**Request Example (IP Table Questionnaire)**:
```json
{
  "answers": [
    {
      "questionId": "q7_ip_table",
      "tableAnswers": [
        ["172.16.40.129", "255.255.255.224", "172.16.40.1", "8.8.8.8"],
        ["172.16.40.130", "255.255.255.224", "172.16.40.1", "8.8.8.8"],
        ["172.16.40.197", "255.255.255.192", "172.16.40.193", "172.16.40.1"]
      ]
    }
  ],
  "isUpdate": true
}
```

**Processing Logic**:

```typescript
async function submitAnswers(req: Request, res: Response) {
  const { labId, partId } = req.params;
  const { answers, isUpdate } = req.body;
  const studentId = req.user._id;

  // 1. Get lab part with questions
  const labPart = await LabPart.findOne({ _id: partId, labId });
  if (!labPart || labPart.partType !== 'fill_in_blank') {
    throw new ApiError(400, 'INVALID_PART_TYPE', 'Part is not fill-in-blank type');
  }

  // 2. Validate all questions are answered
  const answeredQuestionIds = new Set(answers.map(a => a.questionId));
  const missingQuestions = labPart.questions.filter(q => !answeredQuestionIds.has(q.questionId));
  if (missingQuestions.length > 0) {
    throw new ApiError(400, 'MISSING_ANSWERS', `Missing answers for: ${missingQuestions.map(q => q.questionId).join(', ')}`);
  }

  // 2a. Validate IP table questionnaire answers
  for (const answer of answers) {
    const question = labPart.questions.find(q => q.questionId === answer.questionId);
    if (!question) continue;

    if (question.questionType === 'ip_table_questionnaire') {
      // Validate tableAnswers is provided and has correct dimensions
      if (!answer.tableAnswers) {
        throw new ApiError(400, 'MISSING_TABLE_ANSWERS',
          `Question ${answer.questionId} requires tableAnswers field`);
      }

      const expectedRows = question.ipTableQuestionnaire.rowCount;
      const expectedCols = question.ipTableQuestionnaire.columnCount;

      if (answer.tableAnswers.length !== expectedRows) {
        throw new ApiError(400, 'INVALID_TABLE_DIMENSIONS',
          `Expected ${expectedRows} rows but got ${answer.tableAnswers.length}`);
      }

      for (let i = 0; i < answer.tableAnswers.length; i++) {
        if (answer.tableAnswers[i].length !== expectedCols) {
          throw new ApiError(400, 'INVALID_TABLE_DIMENSIONS',
            `Row ${i} expected ${expectedCols} columns but got ${answer.tableAnswers[i].length}`);
        }
      }

      // Validate each cell answer is not empty
      for (let rowIdx = 0; rowIdx < answer.tableAnswers.length; rowIdx++) {
        for (let colIdx = 0; colIdx < answer.tableAnswers[rowIdx].length; colIdx++) {
          const cellAnswer = answer.tableAnswers[rowIdx][colIdx];
          if (!cellAnswer || !cellAnswer.trim()) {
            throw new ApiError(400, 'EMPTY_TABLE_CELL',
              `Cell [${rowIdx + 1}, ${colIdx + 1}] cannot be empty`);
          }
        }
      }
    } else {
      // Validate simple answer is provided
      if (!answer.answer && answer.answer !== '') {
        throw new ApiError(400, 'MISSING_ANSWER',
          `Question ${answer.questionId} requires answer field`);
      }
    }
  }

  // 3. Check for DHCP range validation (if updating and part has DHCP config)
  const dhcpPart = await LabPart.findOne({
    labId,
    partType: 'dhcp_config'
  });

  if (dhcpPart?.dhcpConfiguration) {
    // Get lab to access VLAN configuration
    const lab = await Lab.findById(labId);

    // Validate device IPs are within lecturer-defined range
    for (const answer of answers) {
      const question = labPart.questions.find(q => q.questionId === answer.questionId);
      if (question?.schemaMapping?.deviceId) {
        // This is a device IP answer
        const isValid = isIpInDhcpPool(
          answer.answer,
          dhcpPart.dhcpConfiguration,
          lab
        );
        if (!isValid) {
          // Construct IPs for error message
          const vlan = lab.network.vlanConfiguration.vlans[dhcpPart.dhcpConfiguration.vlanIndex];
          const startIp = constructDhcpIp(vlan.baseNetwork, dhcpPart.dhcpConfiguration.startOffset);
          const endIp = constructDhcpIp(vlan.baseNetwork, dhcpPart.dhcpConfiguration.endOffset);

          throw new ApiError(400, 'DHCP_IP_OUT_OF_RANGE',
            `IP ${answer.answer} is outside the DHCP IP range (${startIp} - ${endIp})`,
            { questionId: question.questionId, ip: answer.answer }
          );
        }
      }
    }
  }

  // 4. Map answers to schema structure
  const schema = mapAnswersToSchema(answers, labPart.questions, labPart.labId);

  // 5. Create or update StudentIpSchema
  let studentSchema: IStudentIpSchema;

  if (!isUpdate) {
    // Create new schema (version 1)
    studentSchema = await StudentIpSchema.create({
      studentId,
      labId,
      schema,
      version: 1,
      calculationPartId: partId,
      isLocked: false
    });
  } else {
    // Update existing schema (increment version)
    const existingSchema = await StudentIpSchema.findOne({
      studentId,
      labId
    }).sort({ version: -1 });

    if (!existingSchema) {
      throw new ApiError(404, 'SCHEMA_NOT_FOUND', 'No existing schema to update');
    }

    // Create new version
    studentSchema = await StudentIpSchema.create({
      studentId,
      labId,
      schema,
      version: existingSchema.version + 1,
      previousVersionId: existingSchema._id,
      calculationPartId: partId,
      isLocked: false
    });
  }

  // 6. Calculate points (validate answers)
  const results = await validateAnswers(answers, labPart.questions, schema);
  const totalPointsEarned = results.reduce((sum, r) => sum + r.pointsEarned, 0);
  const totalPoints = labPart.questions.reduce((sum, q) => sum + q.points, 0);

  // 7. Record submission (for audit trail)
  await recordSubmission(studentId, labId, partId, {
    answers,
    results,
    totalPointsEarned,
    schemaId: studentSchema._id,
    schemaVersion: studentSchema.version
  });

  // 8. Return response
  return res.json({
    success: true,
    data: {
      results,
      totalPoints,
      totalPointsEarned,
      passed: totalPointsEarned >= totalPoints * 0.7, // 70% passing threshold
      studentIpSchema: {
        schemaId: studentSchema._id,
        version: studentSchema.version,
        schema: studentSchema.schema
      },
      message: isUpdate ? 'IP Schema updated successfully' : 'IP Schema created successfully'
    }
  });
}

// Helper: Map answers to schema structure
function mapAnswersToSchema(
  answers: Array<{ questionId: string; answer: string }>,
  questions: ILabPart['questions'],
  labId: Types.ObjectId
): IStudentIpSchema['schema'] {
  const schema: IStudentIpSchema['schema'] = {
    vlans: [],
    devices: []
  };

  // Group answers by VLAN
  const vlanMap = new Map<number, any>();
  const deviceMap = new Map<string, any>();

  for (const answer of answers) {
    const question = questions.find(q => q.questionId === answer.questionId);
    if (!question) continue;

    if (!question.schemaMapping) {
      // Pure text questions do not modify the schema
      continue;
    }

    const { vlanIndex, field, deviceId, variableName } = question.schemaMapping;

    if (deviceId && variableName) {
      // Device-level IP
      if (!deviceMap.has(deviceId)) {
        deviceMap.set(deviceId, {
          deviceId,
          interfaces: []
        });
      }
      deviceMap.get(deviceId).interfaces.push({
        variableName,
        ipAddress: answer.answer,
        source: 'calculated',
        updatedAt: new Date(),
        updatedBy: 'initial_calculation'
      });
    } else {
      // VLAN-level field
      if (!vlanMap.has(vlanIndex)) {
        vlanMap.set(vlanIndex, {
          vlanIndex,
          source: 'calculated',
          updatedAt: new Date()
        });
      }
      vlanMap.get(vlanIndex)[field] = answer.answer;
    }
  }

  schema.vlans = Array.from(vlanMap.values());
  schema.devices = Array.from(deviceMap.values());

  return schema;
}

// Helper: Validate IP is within DHCP range (using offsets)
function isIpInDhcpPool(ip: string, dhcpConfig: any, lab: Lab): boolean {
  // Construct full IPs from offsets + VLAN base network
  const vlan = lab.network.vlanConfiguration.vlans[dhcpConfig.vlanIndex];
  const startIp = constructDhcpIp(vlan.baseNetwork, dhcpConfig.startOffset);
  const endIp = constructDhcpIp(vlan.baseNetwork, dhcpConfig.endOffset);

  // Compare IP ranges
  const ipNum = ipToNumber(ip);
  const startNum = ipToNumber(startIp);
  const endNum = ipToNumber(endIp);
  return ipNum >= startNum && ipNum <= endNum;
}

function constructDhcpIp(baseNetwork: string, offset: number): string {
  const parts = baseNetwork.split('.');
  parts[3] = String(offset);
  return parts.join('.');
}
```

**Response Success (200 OK)**:
```typescript
interface SubmitAnswersResponse {
  success: true;
  data: {
    results: Array<{
      questionId: string;
      isCorrect: boolean;
      pointsEarned: number;
      correctAnswer?: string;  // Only show if incorrect (for simple questions)
      feedback?: string;

      // For IP Table Questionnaire questions only
      cellResults?: Array<Array<{
        isCorrect: boolean;
        pointsEarned: number;
        correctAnswer?: string;  // Only show if cell is incorrect
      }>>;  // 2D array: cellResults[rowIndex][columnIndex]
    }>;
    totalPoints: number;
    totalPointsEarned: number;
    passed: boolean;
    studentIpSchema: {
      schemaId: string;
      version: number;
      schema: {
        vlans: Array<VlanSchema>;
        devices: Array<DeviceSchema>;
      };
    };
    message: string;
  };
}
```

**Response Example (Simple Questions)**:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "questionId": "q1_vlan_a_network",
        "isCorrect": true,
        "pointsEarned": 5
      },
      {
        "questionId": "q6_pc2_dhcp_ip",
        "isCorrect": true,
        "pointsEarned": 5
      }
    ],
    "totalPoints": 30,
    "totalPointsEarned": 30,
    "passed": true,
    "studentIpSchema": {
      "schemaId": "507f1f77bcf86cd799439015",
      "version": 1,
      "schema": {
        "vlans": [
          {
            "vlanIndex": 0,
            "networkAddress": "172.16.40.128",
            "subnetMask": 27,
            "subnetIndex": 0,
            "firstUsableIp": "172.16.40.129",
            "lastUsableIp": "172.16.40.158",
            "broadcastAddress": "172.16.40.159",
            "source": "calculated",
            "updatedAt": "2024-12-20T10:30:00Z"
          }
        ],
        "devices": [
          {
            "deviceId": "pc2",
            "interfaces": [
              {
                "variableName": "ens2",
                "ipAddress": "172.16.40.197",
                "source": "dhcp",
                "updatedAt": "2024-12-20T10:30:00Z",
                "updatedBy": "student_update"
              }
            ]
          }
        ]
      }
    },
    "message": "IP Schema created successfully"
  }
}
```

**Response Example (IP Table Questionnaire)**:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "questionId": "q7_ip_table",
        "isCorrect": false,
        "pointsEarned": 10,
        "feedback": "10/12 points earned",
        "cellResults": [
          [
            {
              "isCorrect": true,
              "pointsEarned": 1
            },
            {
              "isCorrect": true,
              "pointsEarned": 1
            },
            {
              "isCorrect": false,
              "pointsEarned": 0,
              "correctAnswer": "172.16.40.1"
            },
            {
              "isCorrect": true,
              "pointsEarned": 1
            }
          ],
          [
            {
              "isCorrect": true,
              "pointsEarned": 1
            },
            {
              "isCorrect": true,
              "pointsEarned": 1
            },
            {
              "isCorrect": true,
              "pointsEarned": 1
            },
            {
              "isCorrect": true,
              "pointsEarned": 1
            }
          ],
          [
            {
              "isCorrect": true,
              "pointsEarned": 1
            },
            {
              "isCorrect": true,
              "pointsEarned": 1
            },
            {
              "isCorrect": false,
              "pointsEarned": 0,
              "correctAnswer": "172.16.40.193"
            },
            {
              "isCorrect": true,
              "pointsEarned": 1
            }
          ]
        ]
      }
    ],
    "totalPoints": 12,
    "totalPointsEarned": 10,
    "passed": true,
    "studentIpSchema": {
      "schemaId": "507f1f77bcf86cd799439015",
      "version": 1,
      "schema": {
        "vlans": [],
        "devices": []
      }
    },
    "message": "IP Schema created successfully"
  }
}
```

**Error Responses**:

```typescript
// 400 Bad Request - DHCP IP out of range
{
  "success": false,
  "error": {
    "code": "DHCP_IP_OUT_OF_RANGE",
    "message": "IP 172.16.40.200 is outside the DHCP IP range (172.16.40.197 - 172.16.40.202)",
    "field": "answers[5].answer",
    "details": {
      "questionId": "q6_pc2_dhcp_ip",
      "ip": "172.16.40.200",
      "poolStart": "172.16.40.197",
      "poolEnd": "172.16.40.202"
    }
  }
}

// 400 Bad Request - Missing answers
{
  "success": false,
  "error": {
    "code": "MISSING_ANSWERS",
    "message": "Missing answers for: q3_vlan_a_last_usable, q4_vlan_a_broadcast",
    "details": {
      "missingQuestionIds": ["q3_vlan_a_last_usable", "q4_vlan_a_broadcast"]
    }
  }
}

// 404 Not Found - Schema not found (when updating)
{
  "success": false,
  "error": {
    "code": "SCHEMA_NOT_FOUND",
    "message": "No existing schema to update"
  }
}

// 403 Forbidden - Not enrolled
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You are not enrolled in this lab's course"
  }
}
```

---

### API 2: Get Student IP Schema

**Endpoint**: `GET /v0/labs/:labId/ip-schema`

**Purpose**: Retrieve student's latest IP schema for display in floating button

**Authentication**: HTTP-only cookie session

**Query Parameters**: None

**Response Success (200 OK)**:
```typescript
interface GetIpSchemaResponse {
  success: true;
  data: {
    exists: boolean;
    schemaId?: string;
    version?: number;
    schema?: {
      vlans: Array<VlanSchema>;
      devices: Array<DeviceSchema>;
    };
    canEdit: boolean;  // Always true (no locking)
    calculationPartId?: string;
    updatedAt?: string;
  };
}
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "exists": true,
    "schemaId": "507f1f77bcf86cd799439015",
    "version": 2,
    "schema": {
      "vlans": [
        {
          "vlanIndex": 0,
          "networkAddress": "172.16.40.128",
          "subnetMask": 27,
          "subnetIndex": 0,
          "firstUsableIp": "172.16.40.129",
          "lastUsableIp": "172.16.40.158",
          "broadcastAddress": "172.16.40.159",
          "source": "student_updated",
          "updatedAt": "2024-12-20T11:00:00Z"
        }
      ],
      "devices": [
        {
          "deviceId": "pc2",
          "interfaces": [
            {
              "variableName": "ens2",
              "ipAddress": "172.16.40.197",
              "source": "dhcp",
              "updatedAt": "2024-12-20T11:00:00Z",
              "updatedBy": "student_update"
            }
          ]
        }
      ]
    },
    "canEdit": true,
    "calculationPartId": "507f1f77bcf86cd799439016",
    "updatedAt": "2024-12-20T11:00:00Z"
  }
}
```

**Response when schema doesn't exist**:
```json
{
  "success": true,
  "data": {
    "exists": false,
    "canEdit": true
  }
}
```

**Implementation**:
```typescript
async function getIpSchema(req: Request, res: Response) {
  const { labId } = req.params;
  const studentId = req.user._id;

  // Get latest schema
  const schema = await StudentIpSchema.findOne({
    studentId,
    labId
  }).sort({ version: -1 });

  if (!schema) {
    return res.json({
      success: true,
      data: {
        exists: false,
        canEdit: true
      }
    });
  }

  return res.json({
    success: true,
    data: {
      exists: true,
      schemaId: schema._id,
      version: schema.version,
      schema: schema.schema,
      canEdit: true,  // Always true per requirements
      calculationPartId: schema.calculationPartId,
      updatedAt: schema.updatedAt
    }
  });
}
```

---

### API 3: Submit DHCP Configuration Completion

**Endpoint**: `POST /v0/labs/:labId/parts/:partId/submit-completion`

**Purpose**: Mark DHCP configuration part as complete (called AFTER schema update)

**Authentication**: HTTP-only cookie session

**Request Body**:
```typescript
interface SubmitCompletionRequest {
  vlanIndex: number;
}
```

**Request Example**:
```json
{
  "vlanIndex": 1
}
```

**Response Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "completed": true,
    "pointsEarned": 10,
    "message": "DHCP configuration submitted successfully"
  }
}
```

**Implementation**:
```typescript
async function submitCompletion(req: Request, res: Response) {
  const { labId, partId } = req.params;
  const { vlanIndex } = req.body;
  const studentId = req.user._id;

  // 1. Get DHCP part
  const labPart = await LabPart.findOne({ _id: partId, labId });
  if (!labPart || labPart.partType !== 'dhcp_config') {
    throw new ApiError(400, 'INVALID_PART_TYPE', 'Part is not DHCP config type');
  }

  // 2. Verify student has updated their schema
  const schema = await StudentIpSchema.findOne({
    studentId,
    labId
  }).sort({ version: -1 });

  if (!schema || schema.version < 2) {
    throw new ApiError(400, 'SCHEMA_NOT_UPDATED',
      'You must update your IP schema before submitting DHCP completion');
  }

  // 3. Record completion
  const pointsEarned = labPart.totalPoints || 10;
  await recordSubmission(studentId, labId, partId, {
    vlanIndex,
    completed: true,
    pointsEarned
  });

  return res.json({
    success: true,
    data: {
      completed: true,
      pointsEarned,
      message: 'DHCP configuration submitted successfully'
    }
  });
}
```

---

### API 4: Get Student IP Schema for Grading

**Endpoint**: `GET /v0/submissions/:submissionId/student-ip-schema`

**Purpose**: Grading service fetches student's IP schema to connect to devices

**Authentication**: Internal service token (not student session)

**Response Success (200 OK)**:
```typescript
interface GetGradingSchemaResponse {
  success: true;
  data: {
    schemaId: string;
    version: number;
    deviceConnections: Record<string, Record<string, {
      ipAddress: string;
      source: 'calculated' | 'dhcp' | 'manual_update';
    }>>;
  };
}
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "schemaId": "507f1f77bcf86cd799439015",
    "version": 2,
    "deviceConnections": {
      "router1": {
        "e0_0_vlan_a": {
          "ipAddress": "172.16.40.129",
          "source": "calculated"
        }
      },
      "pc2": {
        "ens2": {
          "ipAddress": "172.16.40.197",
          "source": "dhcp"
        }
      }
    }
  }
}
```

**Implementation**:
```typescript
async function getGradingSchema(req: Request, res: Response) {
  const { submissionId } = req.params;

  // 1. Get submission
  const submission = await Submission.findById(submissionId);
  if (!submission) {
    throw new ApiError(404, 'SUBMISSION_NOT_FOUND', 'Submission not found');
  }

  // 2. Get latest schema
  const schema = await StudentIpSchema.findOne({
    studentId: submission.studentId,
    labId: submission.labId
  }).sort({ version: -1 });

  if (!schema) {
    throw new ApiError(404, 'SCHEMA_NOT_FOUND',
      'No IP schema found for this student');
  }

  // 3. Build device connections map
  const deviceConnections: Record<string, Record<string, any>> = {};

  for (const device of schema.schema.devices) {
    deviceConnections[device.deviceId] = {};
    for (const iface of device.interfaces) {
      deviceConnections[device.deviceId][iface.variableName] = {
        ipAddress: iface.ipAddress,
        source: iface.source
      };
    }
  }

  return res.json({
    success: true,
    data: {
      schemaId: schema._id,
      version: schema.version,
      deviceConnections
    }
  });
}
```

---

## ✅ Validation Rules

### Rule 1: DHCP Pool IP Range Validation

**Requirement**: Device IPs updated in schema MUST be within the lecturer-defined DHCP IP range

**Algorithm**:
```typescript
function validateDhcpPoolIp(
  ip: string,
  dhcpConfig: DhcpConfiguration,
  lab: Lab
): ValidationResult {
  // 1. Construct full IPs from offsets + VLAN base network
  const vlan = lab.network.vlanConfiguration.vlans[dhcpConfig.vlanIndex];
  const startIp = constructDhcpIp(vlan.baseNetwork, dhcpConfig.startOffset);
  const endIp = constructDhcpIp(vlan.baseNetwork, dhcpConfig.endOffset);

  // 2. Convert IPs to numbers for comparison
  const ipNum = ipToNumber(ip);
  const startNum = ipToNumber(startIp);
  const endNum = ipToNumber(endIp);

  // 3. Check range
  if (ipNum < startNum || ipNum > endNum) {
    return {
      valid: false,
      error: {
        code: 'DHCP_IP_OUT_OF_RANGE',
        message: `IP ${ip} is outside the DHCP IP range (${startIp} - ${endIp})`,
        details: {
          ip,
          rangeStart: startIp,
          rangeEnd: endIp
        }
      }
    };
  }

  return { valid: true };
}

function constructDhcpIp(baseNetwork: string, offset: number): string {
  const parts = baseNetwork.split('.');
  parts[3] = String(offset);
  return parts.join('.');
}

interface ValidationResult {
  valid: boolean;
  error?: {
    code: string;
    message: string;
    details: any;
  };
}
```

### Rule 2: IP Address Format Validation

```typescript
function validateIpAddress(ip: string): boolean {
  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(ipv4Pattern);

  if (!match) return false;

  // Check each octet is 0-255
  for (let i = 1; i <= 4; i++) {
    const octet = parseInt(match[i]);
    if (octet < 0 || octet > 255) {
      return false;
    }
  }

  return true;
}
```

### Rule 3: CIDR Prefix Validation

```typescript
function validateCidrPrefix(prefix: number): boolean {
  return Number.isInteger(prefix) && prefix >= 1 && prefix <= 32;
}
```

### Rule 4: Subnet Mask Validation

```typescript
function validateSubnetMask(mask: string): boolean {
  // Common subnet masks
  const validMasks = [
    '255.255.255.252',  // /30
    '255.255.255.248',  // /29
    '255.255.255.240',  // /28
    '255.255.255.224',  // /27
    '255.255.255.192',  // /26
    '255.255.255.128',  // /25
    '255.255.255.0',    // /24
    '255.255.254.0',    // /23
    '255.255.252.0',    // /22
    '255.255.248.0',    // /21
    '255.255.240.0',    // /20
    '255.255.224.0',    // /19
    '255.255.192.0',    // /18
    '255.255.128.0',    // /17
    '255.255.0.0',      // /16
  ];

  return validMasks.includes(mask);
}
```

### Rule 5: Answer Validation Against Expected Values

```typescript
async function validateAnswers(
  answers: Array<{ questionId: string; answer?: string; tableAnswers?: Array<Array<string>> }>,
  questions: ILabPart['questions'],
  schema: IStudentIpSchema['schema']
): Promise<Array<{
  questionId: string;
  isCorrect: boolean;
  pointsEarned: number;
  correctAnswer?: string;
  feedback?: string;
  cellResults?: Array<Array<{
    isCorrect: boolean;
    pointsEarned: number;
    correctAnswer?: string;
  }>>;
}>> {
  const results = [];

  for (const answer of answers) {
    const question = questions.find(q => q.questionId === answer.questionId);
    if (!question) continue;

    let isCorrect = false;
    let correctAnswer: string | undefined;
    let pointsEarned = 0;

    if (question.questionType === 'ip_table_questionnaire') {
      // Validate IP table questionnaire
      if (!question.ipTableQuestionnaire || !answer.tableAnswers) {
        results.push({
          questionId: question.questionId,
          isCorrect: false,
          pointsEarned: 0,
          feedback: 'Invalid table questionnaire configuration'
        });
        continue;
      }

      const table = question.ipTableQuestionnaire;
      const cellResults: Array<Array<any>> = [];
      let totalCellPoints = 0;
      let earnedCellPoints = 0;

      // Validate each cell
      for (let rowIdx = 0; rowIdx < table.rowCount; rowIdx++) {
        cellResults[rowIdx] = [];
        for (let colIdx = 0; colIdx < table.columnCount; colIdx++) {
          const expectedCell = table.cells[rowIdx][colIdx];
          const studentAnswer = answer.tableAnswers[rowIdx][colIdx];
          const columnMeta = table.columns[colIdx];
          const rowMeta = table.rows[rowIdx];

          const normalizedStudent = studentAnswer.trim().toLowerCase();

          let resolvedExpected: string | null = null;
          let cellCorrect = false;

          switch (expectedCell.answerMode) {
            case 'manual': {
              resolvedExpected = (expectedCell.expectedAnswer || '').trim();
              cellCorrect = normalizedStudent === resolvedExpected.toLowerCase();
              break;
            }

            case 'manual_range': {
              const range = expectedCell.expectedRange;
              if (!range) {
                cellCorrect = false;
                break;
              }

              cellCorrect = isWithinIpTableRange({
                studentAnswer,
                range,
                columnType: columnMeta.columnType
              });

              resolvedExpected = `${range.start} – ${range.end}`;
              break;
            }

            case 'dynamic': {
              resolvedExpected = resolveDynamicIpTableValue({
                reference: expectedCell.dynamicReference,
                column: columnMeta,
                row: rowMeta,
                schema
              });

              cellCorrect =
                resolvedExpected !== null &&
                normalizedStudent === resolvedExpected.trim().toLowerCase();
              break;
            }

            default:
              cellCorrect = false;
          }

          const cellPoints = cellCorrect ? expectedCell.points : 0;

          totalCellPoints += expectedCell.points;
          earnedCellPoints += cellPoints;

          cellResults[rowIdx][colIdx] = {
            isCorrect: cellCorrect,
            pointsEarned: cellPoints,
            correctAnswer: cellCorrect ? undefined : resolvedExpected ?? expectedCell.expectedAnswer
          };
        }
      }

      // Overall question result
      isCorrect = earnedCellPoints === totalCellPoints;
      pointsEarned = earnedCellPoints;

      results.push({
        questionId: question.questionId,
        isCorrect,
        pointsEarned,
        cellResults,
        feedback: isCorrect
          ? 'All table cells correct!'
          : `${earnedCellPoints}/${totalCellPoints} points earned`
      });
      continue;
    } else if (question.questionType === 'custom_text') {
      if (!question.expectedAnswer) {
        results.push({
          questionId: question.questionId,
          isCorrect: false,
          pointsEarned: 0,
          feedback: 'Missing lecturer expected answer'
        });
        continue;
      }

      const normalize = (value: string) => {
        let processed = value;
        if (question.trimWhitespace !== false) {
          processed = processed.trim();
        }
        if (!question.caseSensitive) {
          processed = processed.toLowerCase();
        }
        return processed;
      };

      isCorrect = normalize(answer.answer) === normalize(question.expectedAnswer);
      correctAnswer = question.expectedAnswer;
    } else if (question.schemaMapping) {
      // Get expected answer from schema
      const { vlanIndex, field } = question.schemaMapping;
      const vlan = schema.vlans.find(v => v.vlanIndex === vlanIndex);

      if (vlan) {
        const expectedValue = vlan[field];

        if (question.expectedAnswerType === 'exact') {
          // Exact match (case-insensitive for IPs)
          isCorrect = answer.answer.toLowerCase() === String(expectedValue).toLowerCase();
        } else if (question.expectedAnswerType === 'range') {
          // Range match (for DHCP pools)
          // TODO: Implement range validation
          isCorrect = true;  // Placeholder
        }

        if (!isCorrect) {
          correctAnswer = String(expectedValue);
        }
      }

      if (!vlan) {
        correctAnswer = 'Schema mapping missing';
      }
    } else {
      results.push({
        questionId: question.questionId,
        isCorrect: false,
        pointsEarned: 0,
        feedback: 'Schema mapping not configured'
      });
      continue;
    }

    results.push({
      questionId: question.questionId,
      isCorrect,
      pointsEarned: isCorrect ? question.points : 0,
      correctAnswer,
      feedback: isCorrect ? undefined : `Expected: ${correctAnswer}`
    });
  }

  return results;
}
```

> ℹ️ **Helper Functions**
>
> - `isWithinIpTableRange(...)` should live alongside the existing IP utilities (`utils/ipRangeUtils.ts`). It accepts the raw student answer, a `expectedRange` object, and the column type so it can:
>   - Convert IPv4/IPv6 strings to numeric space before comparison.
>   - Validate prefix lengths / numeric values as integers (respecting optional `step`).
>   - Fallback to lexical comparison for textual ranges if we ever allow them.
>
> - `resolveDynamicIpTableValue(...)` belongs in the grading service layer. It receives the saved `dynamicReference`, the column metadata, the row metadata, and the student's `StudentIpSchema`:
>   - When `source === 'vlan'`, read from `schema.vlans[vlanIndex][field]`.
>   - When `source === 'device_interface'`, locate `schema.devices.find(d => d.deviceId === reference.deviceId)` and then the matching interface by `interfaceName`.
>   - If the value cannot be resolved, return `null` and report the anomaly (the cell will be marked incorrect; instructors can review via audit logs).

---

## ⚠️ Error Handling

### Standard Error Response Format

```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;           // Machine-readable error code
    message: string;        // Human-readable error message
    field?: string;         // Which field caused the error (optional)
    details?: any;          // Additional error context (optional)
  };
}
```

### Error Codes Catalog

| HTTP Status | Error Code | Description | Details |
|-------------|------------|-------------|---------|
| 400 | `DHCP_IP_OUT_OF_RANGE` | Device IP outside DHCP range | `{ ip, rangeStart, rangeEnd }` |
| 400 | `INVALID_IP_FORMAT` | Malformed IP address | `{ ip, field }` |
| 400 | `INVALID_CIDR_PREFIX` | Invalid CIDR prefix (not 1-32) | `{ prefix, field }` |
| 400 | `MISSING_ANSWERS` | Required questions not answered | `{ missingQuestionIds }` |
| 400 | `MISSING_TABLE_ANSWERS` | IP table question requires tableAnswers field | `{ questionId }` |
| 400 | `INVALID_TABLE_DIMENSIONS` | Table dimensions don't match expected | `{ expectedRows, expectedCols, actualRows, actualCols }` |
| 400 | `EMPTY_TABLE_CELL` | Table cell cannot be empty | `{ rowIndex, colIndex }` |
| 400 | `INVALID_PART_TYPE` | Part type doesn't match operation | `{ expectedType, actualType }` |
| 400 | `SCHEMA_NOT_UPDATED` | Must update schema before DHCP submit | `{ currentVersion }` |
| 404 | `PART_NOT_FOUND` | Lab part doesn't exist | `{ partId }` |
| 404 | `SCHEMA_NOT_FOUND` | Student IP schema not found | `{ studentId, labId }` |
| 404 | `SUBMISSION_NOT_FOUND` | Submission doesn't exist | `{ submissionId }` |
| 403 | `FORBIDDEN` | Not enrolled in course | `{ courseId }` |
| 403 | `SCHEMA_LOCKED` | Schema locked (shouldn't happen) | `{ schemaId }` |
| 409 | `VERSION_CONFLICT` | Concurrent update conflict | `{ currentVersion, attemptedVersion }` |
| 500 | `INTERNAL_ERROR` | Unexpected server error | `{ error }` |

### Error Handling Middleware

```typescript
// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Log error for monitoring
  logger.error('API Error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?._id
  });

  // ApiError = custom error class with code & details
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        field: err.field,
        details: err.details
      }
    });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        details: err.errors
      }
    });
  }

  // Default 500 error
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  });
});

// Custom ApiError class
class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any,
    public field?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

---

## 🔗 Integration Points

### 1. Integration with Existing Submission System

**Current**: Labs have submissions that record task execution results

**Required Changes**:
- Add `schemaId` and `schemaVersion` fields to Submission model
- When creating submission, fetch and store current schema version
- Grading service reads schema from submission record

```typescript
// Update Submission model
interface ISubmission {
  // ... existing fields

  // NEW: IP Schema reference
  studentIpSchemaId?: Types.ObjectId;
  studentIpSchemaVersion?: number;

  // ... rest of fields
}

// When creating submission for network_config parts
async function createSubmission(studentId, labId, partId, taskResults) {
  // Get latest student schema
  const schema = await StudentIpSchema.findOne({
    studentId,
    labId
  }).sort({ version: -1 });

  const submission = await Submission.create({
    studentId,
    labId,
    partId,
    taskResults,
    studentIpSchemaId: schema?._id,
    studentIpSchemaVersion: schema?.version,
    // ... other fields
  });

  return submission;
}
```

### 2. Integration with Grading Service

**Grading Service Flow**:
```typescript
// In grading worker
async function gradeSubmission(submissionId: string) {
  // 1. Fetch submission
  const submission = await Submission.findById(submissionId);

  // 2. Fetch student IP schema via API
  const response = await fetch(
    `${backendUrl}/v0/submissions/${submissionId}/student-ip-schema`,
    {
      headers: {
        'Authorization': `Bearer ${GRADING_SERVICE_TOKEN}`
      }
    }
  );
  const { data: schemaData } = await response.json();

  // 3. Use student-declared IPs for connections
  const deviceIp = schemaData.deviceConnections['router1']['e0_0_vlan_a'].ipAddress;

  // 4. Connect and grade
  const connection = await sshConnect(deviceIp, SSH_CREDENTIALS);
  const result = await runTests(connection, submission.tasks);

  return result;
}
```

### 3. Integration with Lab Start API

**Current**: `POST /v0/labs/:labId/start` initializes student's lab environment

**Required Enhancement**: Return student's IP schema if it exists

```typescript
async function startLab(req: Request, res: Response) {
  const { labId } = req.params;
  const studentId = req.user._id;

  // ... existing lab start logic

  // Fetch student schema
  const schema = await StudentIpSchema.findOne({
    studentId,
    labId
  }).sort({ version: -1 });

  return res.json({
    success: true,
    data: {
      // ... existing response data

      // NEW: Student IP Schema
      studentIpSchema: schema ? {
        exists: true,
        schemaId: schema._id,
        version: schema.version,
        schema: schema.schema,
        canEdit: true,
        calculationPartId: schema.calculationPartId
      } : {
        exists: false,
        canEdit: true
      }
    }
  });
}
```

---

## 🧪 Testing Requirements

### Unit Tests

```typescript
describe('IP Calculation Algorithms', () => {
  describe('calculateSubnetMask', () => {
    it('should calculate /27 for 30 hosts', () => {
      expect(calculateSubnetMask(30)).toBe(27);
    });

    it('should calculate /26 for 50 hosts', () => {
      expect(calculateSubnetMask(50)).toBe(26);
    });

    it('should throw error for impossible host count', () => {
      expect(() => calculateSubnetMask(2**31)).toThrow();
    });
  });

  describe('calculateSubnet', () => {
    it('should calculate correct VLAN A subnet', () => {
      const result = calculateSubnet('172.16.40.128', 27, 0);
      expect(result.networkAddress).toBe('172.16.40.128');
      expect(result.firstUsableIp).toBe('172.16.40.129');
      expect(result.lastUsableIp).toBe('172.16.40.158');
      expect(result.broadcastAddress).toBe('172.16.40.159');
    });
  });

  describe('getHostIp', () => {
    const vlanA = calculateSubnet('172.16.40.128', 27, 0);

    it('should get first usable IP', () => {
      expect(getHostIp(vlanA, 'first')).toBe('172.16.40.129');
    });

    it('should get second usable IP', () => {
      expect(getHostIp(vlanA, 'second')).toBe('172.16.40.130');
    });

    it('should get last usable IP', () => {
      expect(getHostIp(vlanA, 'last')).toBe('172.16.40.158');
    });

    it('should get specific host number', () => {
      expect(getHostIp(vlanA, 5)).toBe('172.16.40.133');
    });
  });
});

describe('DHCP Pool Validation', () => {
  const dhcpConfig = {
    vlanIndex: 1,
    startOffset: 197,
    endOffset: 202,
    dhcpServerDevice: 'router1'
  };

  const lab = {
    network: {
      vlanConfiguration: {
        vlans: [
          { baseNetwork: '172.16.40.0', subnetMask: 26 },
          { baseNetwork: '172.16.40.192', subnetMask: 26 }
        ]
      }
    }
  };

  it('should accept IP within pool', () => {
    const result = validateDhcpPoolIp('172.16.40.200', dhcpConfig, lab);
    expect(result.valid).toBe(true);
  });

  it('should reject IP below pool', () => {
    const result = validateDhcpPoolIp('172.16.40.196', dhcpConfig, lab);
    expect(result.valid).toBe(false);
    expect(result.error?.code).toBe('DHCP_IP_OUT_OF_RANGE');
  });

  it('should reject IP above pool', () => {
    const result = validateDhcpPoolIp('172.16.40.203', dhcpConfig, lab);
    expect(result.valid).toBe(false);
    expect(result.error?.code).toBe('DHCP_IP_OUT_OF_RANGE');
  });
});
```

### Integration Tests

```typescript
describe('POST /v0/labs/:labId/parts/:partId/submit-answers', () => {
  let studentUser: IUser;
  let lab: ILab;
  let part: ILabPart;

  beforeEach(async () => {
    // Setup test data
    studentUser = await createTestStudent();
    lab = await createTestLab();
    part = await createTestFillInBlankPart(lab._id);
  });

  it('should create initial IP schema (version 1)', async () => {
    const response = await request(app)
      .post(`/v0/labs/${lab._id}/parts/${part._id}/submit-answers`)
      .set('Cookie', studentUser.sessionCookie)
      .send({
        answers: [
          { questionId: 'q1', answer: '172.16.40.128' },
          { questionId: 'q2', answer: '172.16.40.129' },
          // ... more answers
        ],
        isUpdate: false
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.studentIpSchema.version).toBe(1);

    // Verify schema in database
    const schema = await StudentIpSchema.findById(
      response.body.data.studentIpSchema.schemaId
    );
    expect(schema).toBeDefined();
    expect(schema.version).toBe(1);
  });

  it('should update existing schema (version 2)', async () => {
    // Create initial schema
    await StudentIpSchema.create({
      studentId: studentUser._id,
      labId: lab._id,
      schema: { vlans: [], devices: [] },
      version: 1
    });

    const response = await request(app)
      .post(`/v0/labs/${lab._id}/parts/${part._id}/submit-answers`)
      .set('Cookie', studentUser.sessionCookie)
      .send({
        answers: [
          { questionId: 'q1', answer: '172.16.40.197' },  // Updated DHCP IP
        ],
        isUpdate: true
      });

    expect(response.status).toBe(200);
    expect(response.body.data.studentIpSchema.version).toBe(2);
  });

  it('should reject IP outside DHCP pool', async () => {
    // Create DHCP part with pool constraints
    const dhcpPart = await createTestDhcpPart(lab._id, {
      startOffset: 197,
      endOffset: 202
    });

    const response = await request(app)
      .post(`/v0/labs/${lab._id}/parts/${part._id}/submit-answers`)
      .set('Cookie', studentUser.sessionCookie)
      .send({
        answers: [
          { questionId: 'q_pc2_ip', answer: '172.16.40.250' },  // Outside pool
        ],
        isUpdate: true
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('DHCP_IP_OUT_OF_RANGE');
  });
});
```

### End-to-End Test Scenario (CNI2024 Exam)

```typescript
describe('CNI2024 Exam Flow', () => {
  it('should complete full exam workflow', async () => {
    const student = await createTestStudent();
    const randomVars = { X: 16, Y: 40, Z: 100, A: 10, B: 20 };

    // Create exam with 3 part types
    const exam = await createExam({
      name: 'CNI2024 Exam',
      parts: [
        {
          partType: 'fill_in_blank',
          title: 'IP Calculation',
          questions: [
            {
              questionId: 'q1_vlan_a_network',
              questionText: 'Calculate network address for VLAN A',
              questionType: 'network_address',
              schemaMapping: { vlanIndex: 0, field: 'networkAddress' },
              points: 5
            },
            // ... more questions
          ]
        },
        {
          partType: 'dhcp_config',
          title: 'DHCP Configuration',
          dhcpConfiguration: {
            vlanIndex: 1,
            startOffset: 197,
            endOffset: 202,
            dhcpServerDevice: 'router2'
          }
        },
        {
          partType: 'network_config',
          title: 'Basic Connectivity',
          tasks: [/* ping tests */]
        }
      ]
    });

    // Part 1: Submit IP calculations
    const part1Response = await submitAnswers(student, exam.parts[0]._id, {
      answers: [
        { questionId: 'q1_vlan_a_network', answer: '172.16.40.128' },
        // ... calculated answers
      ],
      isUpdate: false
    });
    expect(part1Response.studentIpSchema.version).toBe(1);

    // Part 2: Update schema with DHCP IPs
    const part2UpdateResponse = await submitAnswers(student, exam.parts[0]._id, {
      answers: [
        { questionId: 'q_pc2_ip', answer: '172.16.40.197' },  // DHCP IP
      ],
      isUpdate: true
    });
    expect(part2UpdateResponse.studentIpSchema.version).toBe(2);

    // Part 2: Submit DHCP completion
    const part2CompleteResponse = await submitCompletion(student, exam.parts[1]._id, {
      vlanIndex: 1
    });
    expect(part2CompleteResponse.completed).toBe(true);

    // Part 3: Submit network config tasks (uses schema v2)
    const part3Response = await submitTasks(student, exam.parts[2]._id, {
      taskId: 'ping_pc2',
      // ... task execution
    });

    // Verify grading used correct IPs
    const submission = await Submission.findOne({
      studentId: student._id,
      partId: exam.parts[2]._id
    });
    expect(submission.studentIpSchemaVersion).toBe(2);
  });
});
```

---

## 🔒 Security & Performance

### Security Considerations

1. **Authentication & Authorization**:
   ```typescript
   // Middleware to verify student owns the schema
   async function verifySchemaOwnership(req, res, next) {
     const { labId } = req.params;
     const studentId = req.user._id;

     // Verify student is enrolled in course
     const lab = await Lab.findById(labId);
     const enrollment = await Enrollment.findOne({
       userId: studentId,
       courseId: lab.courseId
     });

     if (!enrollment) {
       throw new ApiError(403, 'FORBIDDEN', 'Not enrolled in this course');
     }

     next();
   }
   ```

2. **Input Sanitization**:
   ```typescript
   // Sanitize IP inputs to prevent injection
   function sanitizeIpInput(ip: string): string {
     // Remove any non-IP characters
     return ip.replace(/[^0-9.]/g, '');
   }
   ```

3. **Rate Limiting**:
   ```typescript
   // Limit schema updates to prevent abuse
   const updateLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,  // 15 minutes
     max: 10,  // Max 10 updates per 15 min
     message: 'Too many schema updates, please try again later'
   });

   app.post('/v0/labs/:labId/parts/:partId/submit-answers',
     updateLimiter,
     submitAnswers
   );
   ```

### Performance Optimizations

1. **Database Indexes**:
   ```javascript
   // Compound index for fast schema lookups
   studentIpSchemaSchema.index({ studentId: 1, labId: 1, version: -1 });

   // Index for grading service
   submissionSchema.index({ _id: 1, studentIpSchemaId: 1 });
   ```

2. **Caching**:
   ```typescript
   // Cache latest schemas in Redis
   async function getLatestSchema(studentId, labId) {
     const cacheKey = `schema:${studentId}:${labId}:latest`;

     // Try cache first
     const cached = await redis.get(cacheKey);
     if (cached) {
       return JSON.parse(cached);
     }

     // Fetch from DB
     const schema = await StudentIpSchema.findOne({
       studentId,
       labId
     }).sort({ version: -1 });

     // Cache for 5 minutes
     if (schema) {
       await redis.setex(cacheKey, 300, JSON.stringify(schema));
     }

     return schema;
   }
   ```

3. **Query Optimization**:
   ```typescript
   // Use lean() for read-only queries
   const schema = await StudentIpSchema
     .findOne({ studentId, labId })
     .sort({ version: -1 })
     .lean()  // Returns plain JS object (faster)
     .exec();
   ```

4. **Pagination for Version History**:
   ```typescript
   // If showing version history UI in future
   async function getSchemaHistory(studentId, labId, page = 1, limit = 10) {
     const schemas = await StudentIpSchema
       .find({ studentId, labId })
       .sort({ version: -1 })
       .skip((page - 1) * limit)
       .limit(limit)
       .select('version updatedAt schema.vlans.source')  // Only needed fields
       .lean();

     return schemas;
   }
   ```

---

## 📋 Implementation Checklist

### Phase 1: Models & Database (Week 1)

- [ ] Create StudentIpSchema model with schema definition
- [ ] Add indexes for performance
- [ ] Update LabPart model with questions and dhcpConfiguration fields
- [ ] Add validation middleware for part types
- [ ] Update Submission model with schema reference fields
- [ ] Write database migration scripts
- [ ] Test model validation rules

### Phase 2: IP Calculation Service (Week 1-2)

- [ ] Implement `calculateSubnetMask()` function
- [ ] Implement `calculateSubnet()` function
- [ ] Implement `getHostIp()` function
- [ ] Implement `allocateVlans()` function
- [ ] Implement `ipToNumber()` and `numberToIp()` helpers
- [ ] Write comprehensive unit tests (>90% coverage)
- [ ] Document all calculation algorithms

### Phase 3: API Endpoints (Week 2)

- [ ] Implement `POST /v0/labs/:labId/parts/:partId/submit-answers`
  - [ ] Initial schema creation (isUpdate=false)
  - [ ] Schema update (isUpdate=true)
  - [ ] Answer validation
  - [ ] DHCP pool validation
  - [ ] Schema mapping logic
- [ ] Implement `GET /v0/labs/:labId/ip-schema`
- [ ] Implement `POST /v0/labs/:labId/parts/:partId/submit-completion`
- [ ] Implement `GET /v0/submissions/:submissionId/student-ip-schema`
- [ ] Add authentication middleware
- [ ] Add error handling middleware
- [ ] Write integration tests for all endpoints

### Phase 4: Validation & Error Handling (Week 2-3)

- [ ] Implement DHCP pool IP validation
- [ ] Implement IP format validation
- [ ] Implement CIDR prefix validation
- [ ] Implement subnet mask validation
- [ ] Create ApiError class with error codes
- [ ] Document all error codes
- [ ] Test all error scenarios

### Phase 5: Integration (Week 3)

- [ ] Update lab start API to return schema
- [ ] Add schema reference to submission creation
- [ ] Update grading service integration
- [ ] Test end-to-end exam workflow
- [ ] Performance testing and optimization
- [ ] Add monitoring and logging

### Phase 6: Documentation & Deployment (Week 3-4)

- [ ] API documentation (OpenAPI/Swagger)
- [ ] Developer guide for frontend team
- [ ] Database migration guide
- [ ] Deployment checklist
- [ ] Rollback plan
- [ ] User acceptance testing

---

## 🎯 Success Criteria

### Functional Requirements ✅

- [x] Students can submit initial IP calculations
- [x] System creates StudentIpSchema version 1
- [x] Students can update schema (creates version 2+)
- [x] DHCP pool validation rejects IPs outside range
- [x] No schema locking (unlimited updates)
- [x] Grading service uses student-declared IPs
- [x] Version history maintained

### Performance Requirements 📊

- [ ] Schema retrieval: <100ms (p95)
- [ ] Schema creation: <500ms (p95)
- [ ] Schema update: <500ms (p95)
- [ ] Support 100+ concurrent students
- [ ] Database queries use indexes

### Quality Requirements ✨

- [ ] Unit test coverage: >90%
- [ ] Integration test coverage: >80%
- [ ] All error scenarios tested
- [ ] API documentation complete
- [ ] Code review approved
- [ ] No breaking changes to existing labs

---

## 📞 Questions for Clarification

If the backend team has questions during implementation, they should contact the frontend team about:

1. **Answer Validation**: Should incorrect answers still create/update the schema, or only correct answers?
2. **Concurrent Updates**: How to handle two simultaneous schema update requests?
3. **IPv6 Support**: Is IPv6 calculation needed for v1, or can it be v2?
4. **Version Pruning**: Should old versions be archived after N versions?
5. **Grading Fallback**: What if grading service can't find schema (new lab type)?

---

**End of Backend Implementation Specification**

This document should be sufficient for the backend team to implement the complete StudentIpSchema system. For questions or clarifications, please reach out to the frontend development team.
