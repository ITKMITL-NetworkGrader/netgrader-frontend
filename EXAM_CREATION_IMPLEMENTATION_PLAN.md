# NetGrader Exam Creation - Comprehensive Implementation Plan
## 📋 Executive Summary

This document outlines the complete implementation plan for upgrading NetGrader to support comprehensive exam creation with:
- **Fill-in-the-blank questions** for IP calculation and subnetting
- **DHCP configuration parts** with lecturer-defined pools
- **Network configuration tasks** for hands-on device grading
- **Dynamic, student-managed IP schemas** (mutable and versioned)
- **Dynamic subnet configuration** with `subnetIndex` field
- **Student IP Schema floating UI** (always accessible after IP calculation)

---

## 🎯 Problem Statement

### Current Limitations
1. **No distinction between question types**: All parts are treated as network configuration tasks
2. **Missing subnet index field**: Frontend doesn't support the new `subnetIndex` requirement
3. **No fill-in-the-blank support**: Cannot create calculation-based questions
4. **No DHCP support**: Cannot create DHCP configuration parts with lecturer-defined pools
5. **Static IP schemas**: Students cannot update their IP schema after DHCP assignment
6. **No IP schema visibility**: Students can't view their calculated/updated IP schema during exams

### Desired Outcome
Create a flexible exam system where instructors can:
- Mix fill-in-the-blank questions with DHCP and configuration tasks
- Define DHCP pools with specific IP ranges
- Allow students to calculate initial IPs, then update them after DHCP
- Control subnet block selection per VLAN
- Enable students to manage their own IP schemas with full version history

---

## 🔄 The Dynamic IP Schema Flow

```
Part 1: IP Calculation (Fill-in-Blank)
├─ Student calculates: Network address, usable IPs, broadcast
├─ Submits answers → Creates StudentIpSchema v1
└─ IP Schema floating button appears

Part 2: DHCP Configuration (DHCP Config)
├─ Lecturer-defined DHCP pool: 172.16.40.100 - 172.16.40.150
├─ Student configures router to serve DHCP
├─ Devices request IPs via DHCP
├─ Device gets 172.16.40.112 (different from calculated!)
└─ Student notes actual IP received

Part 1: UPDATE IP Schema (Re-submit)
├─ Student clicks "Edit Schema" in floating button
├─ Returns to Part 1 in "Update Mode"
├─ Updates answers to reflect DHCP-assigned IPs
├─ Submits updates → StudentIpSchema v2
└─ IP Schema shows "Updated" badge (v2)

Part 3+: Device Configuration & Grading
├─ Student configures devices using actual IPs from schema
├─ Submits for grading
├─ Grading service fetches latest StudentIpSchema (v2)
├─ Connects to devices using student-declared IPs
└─ Grades successfully ✅
```

---

## 📊 Clarified Requirements

### ✅ Confirmed Specifications

1. **DHCP Pool Validation**
   - If student updates IP **outside** lecturer-defined DHCP pool → submission FAILS
   - Shows "Not passed" feedback with error message
   - No warnings, direct validation failure

2. **Schema Locking**
   - **No schema locking** - students can update indefinitely
   - No time restrictions, no submission-based locks

3. **Version Limits**
   - **No version limit** - unlimited updates allowed
   - Full version history maintained

4. **Grading Service**
   - **Always use student-declared IPs** for grading
   - No fallback to calculated IPs
   - Trust student-declared schema completely

5. **Schema Mapping (Hybrid Approach)**
   - Instructor selects question type from dropdown (100% accurate)
   - System auto-detects VLAN index from question text (90% accurate, editable)
   - Final mapping shown immediately for verification

---

## 🏗️ Backend Architecture

### 1. StudentIpSchema Collection (NEW)

**Purpose**: Store each student's declared IP schema with full version history

**Collection**: `student_ip_schemas`

```typescript
interface IStudentIpSchema extends Document {
  studentId: Types.ObjectId;      // Ref: users._id
  labId: Types.ObjectId;           // Ref: labs._id

  // The actual IP schema (student-managed)
  schema: {
    // VLAN-level schema
    vlans: Array<{
      vlanIndex: number;           // Which VLAN (0-9)
      networkAddress: string;      // e.g., "172.16.40.64"
      subnetMask: number;          // e.g., 26
      subnetIndex: number;         // Which subnet block
      firstUsableIp: string;       // e.g., "172.16.40.65"
      lastUsableIp: string;        // e.g., "172.16.40.126"
      broadcastAddress: string;    // e.g., "172.16.40.127"

      // Source tracking
      source: 'calculated' | 'student_updated';
      updatedAt: Date;
    }>;

    // Device-level IP assignments (for DHCP updates)
    devices: Array<{
      deviceId: string;            // e.g., "router1"
      interfaces: Array<{
        variableName: string;      // e.g., "gig0_0_vlan_1"
        ipAddress: string;         // e.g., "172.16.40.112"
        subnetMask?: string;

        // Track how this IP was determined
        source: 'calculated' | 'dhcp' | 'manual_update';
        dhcpPoolName?: string;     // If from DHCP
        updatedAt: Date;
        updatedBy: 'initial_calculation' | 'student_update';
      }>;
    }>;
  };

  // Versioning for audit trail
  version: number;                 // Increments on each update (no limit)
  previousVersionId?: Types.ObjectId; // Link to previous version

  // Metadata
  calculationPartId?: Types.ObjectId;  // Which part created this
  isLocked: boolean;               // Always false per requirements

  createdAt: Date;
  updatedAt: Date;
}
```

### 2. Updated LabPart Model

**File**: `/home/chinfair/Documents/netgrader-backend-elysia/src/modules/parts/model.ts`

```typescript
export interface ILabPart extends Document {
  // ... existing fields

  // Enhanced part types
  partType: 'fill_in_blank' | 'network_config' | 'dhcp_config';

  // For fill-in-the-blank parts
  questions?: Array<{
    questionId: string;
    questionText: string;
    questionType: 'network_address' | 'first_usable_ip' | 'last_usable_ip' |
                  'broadcast_address' | 'subnet_mask' | 'ip_address' | 'number';
    order: number;
    points: number;

    // NEW: Hybrid Schema Mapping
    schemaMapping: {
      vlanIndex: number;         // Auto-detected from question text, editable
      field: 'networkAddress' | 'subnetMask' | 'firstUsableIp' |
             'lastUsableIp' | 'broadcastAddress';
      deviceId?: string;         // For device-specific IPs
      variableName?: string;     // For device interface IPs
    };

    // Validation
    answerFormula?: string;
    expectedAnswerType: 'exact' | 'range';
    placeholder?: string;
    inputFormat?: 'ip' | 'cidr' | 'number';
  }>;

  // NEW: For DHCP configuration parts
  dhcpConfiguration?: {
    poolName: string;              // e.g., "VLAN1_POOL"
    vlanIndex: number;             // Which VLAN this pool serves

    // Lecturer-defined DHCP pool (STRICT VALIDATION)
    startIp: string;               // e.g., "172.16.40.100"
    endIp: string;                 // e.g., "172.16.40.150"
    subnetMask: string;            // e.g., "255.255.255.192"

    // Optional DHCP settings
    defaultGateway?: string;
    dnsServers?: string[];
    leaseTime?: number;            // seconds

    // Instructions for students
    configurationInstructions: string;

    // Expected device to configure DHCP on
    dhcpServerDevice: string;      // e.g., "router1"
  };

  // Existing fields
  tasks: Array<{ ... }>;
  prerequisites: string[];
}
```

---

## 🔌 Backend API Endpoints

### 1. Submit/Update IP Calculation Answers

**Endpoint**: `POST /v0/labs/:labId/parts/:partId/submit-answers`

**Request Body**:
```json
{
  "answers": [
    {
      "questionId": "q1_network_address",
      "answer": "172.16.40.64"
    },
    {
      "questionId": "q2_first_usable",
      "answer": "172.16.40.65"
    }
  ],
  "isUpdate": false  // false = initial, true = update existing schema
}
```

**Validation Logic**:
1. Validate each answer against formula/expected value
2. If answer is device IP and part has DHCP config:
   - Check if IP is within lecturer-defined DHCP pool
   - If outside pool → **FAIL** with error message
3. Map answers to schema fields using `schemaMapping`
4. Create or update StudentIpSchema with new version

**Response**:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "questionId": "q1_network_address",
        "isCorrect": true,
        "pointsEarned": 5
      }
    ],
    "totalPointsEarned": 18,
    "studentIpSchema": {
      "schemaId": "507f...",
      "version": 2,
      "schema": { ... }
    }
  }
}
```

### 2. Get Student IP Schema

**Endpoint**: `GET /v0/labs/:labId/ip-schema`

**Response**:
```json
{
  "success": true,
  "data": {
    "exists": true,
    "schemaId": "507f...",
    "version": 2,
    "schema": {
      "vlans": [...],
      "devices": [...]
    },
    "canEdit": true,  // Always true (no locking)
    "calculationPartId": "507f...",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 3. Grading Service Integration

**Endpoint**: `GET /v0/submissions/:submissionId/student-ip-schema`

**Purpose**: Grading service fetches latest student IP schema

**Response**:
```json
{
  "success": true,
  "data": {
    "schemaId": "507f...",
    "version": 2,
    "deviceConnections": {
      "router1": {
        "gig0_0_vlan_1": {
          "ipAddress": "172.16.40.112",
          "source": "dhcp"
        }
      }
    }
  }
}
```

---

## 🎨 Frontend Implementation

### 1. Updated TypeScript Interfaces

**File**: `/home/chinfair/Documents/netgrader-frontend/types/wizard.ts`

```typescript
// Add/Update these interfaces

export interface LabPart {
  partType: 'fill_in_blank' | 'network_config' | 'dhcp_config';
  questions?: Question[];
  tasks?: Task[];
  dhcpConfiguration?: DhcpConfiguration;
  // ... other fields
}

export interface Question {
  questionId: string;
  questionText: string;
  questionType: 'network_address' | 'first_usable_ip' | 'last_usable_ip' |
                'broadcast_address' | 'subnet_mask';
  order: number;
  points: number;

  // Hybrid schema mapping
  schemaMapping: {
    vlanIndex: number;         // Auto-detected, editable
    field: 'networkAddress' | 'firstUsableIp' | 'lastUsableIp' |
           'broadcastAddress' | 'subnetMask';
    autoDetected: boolean;     // Was VLAN auto-detected?
  };

  placeholder?: string;
  inputFormat?: 'ip' | 'cidr' | 'number';
}

export interface DhcpConfiguration {
  poolName: string;
  vlanIndex: number;
  startIp: string;
  endIp: string;
  subnetMask: string;
  defaultGateway?: string;
  dnsServers?: string[];
  leaseTime?: number;
  configurationInstructions: string;
  dhcpServerDevice: string;
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
```

### 2. Lab Wizard Step 2 - Add Subnet Index

**File**: `components/wizard/LabWizardStep2.vue`

Add this field after Subnet Mask dropdown (line ~369):

```vue
<!-- Subnet Index (NEW) -->
<div class="space-y-2">
  <Label class="text-sm font-medium">
    Subnet Block <span class="text-destructive">*</span>
  </Label>
  <Input
    v-model.number="vlan.subnetIndex"
    type="number"
    min="0"
    placeholder="0"
    @input="validateVlan(index)"
    :class="{
      'border-destructive': hasError(`vlan_${index}_subnetIndex`),
      'border-green-500': !hasError(`vlan_${index}_subnetIndex`) && vlan.subnetIndex !== undefined
    }"
  />
  <p class="text-xs text-muted-foreground flex items-start gap-1">
    <Info class="w-3 h-3 mt-0.5 flex-shrink-0" />
    <span>
      Subnet block to use (0 = first, 1 = second, etc.).
      For /26: block 0 = .0-.63, block 1 = .64-.127, block 2 = .128-.191
    </span>
  </p>
  <p v-if="hasError(`vlan_${index}_subnetIndex`)" class="text-sm text-destructive">
    {{ getError(`vlan_${index}_subnetIndex`) }}
  </p>
</div>
```

Add validation in `validateVlan`:

```typescript
// Validate subnet index
if (vlan.subnetIndex === undefined || vlan.subnetIndex === null) {
  fieldErrors.value[`vlan_${index}_subnetIndex`] = 'Subnet index is required'
} else if (vlan.subnetIndex < 0) {
  fieldErrors.value[`vlan_${index}_subnetIndex`] = 'Subnet index must be >= 0'
} else {
  const blockSize = Math.pow(2, 32 - vlan.subnetMask)
  const maxHostAddress = vlan.subnetIndex * blockSize
  if (maxHostAddress > 254) {
    fieldErrors.value[`vlan_${index}_subnetIndex`] =
      `Subnet index ${vlan.subnetIndex} with /${vlan.subnetMask} would start at .${maxHostAddress} (exceeds .254)`
  } else {
    delete fieldErrors.value[`vlan_${index}_subnetIndex`]
  }
}
```

### 3. Lab Wizard Step 4 - Hybrid Schema Mapping

**File**: `components/wizard/LabWizardStep4.vue`

Add three part type options:

```vue
<!-- Part Type Selection (NEW) -->
<div class="space-y-2">
  <Label class="text-sm font-medium">
    Part Type <span class="text-destructive">*</span>
  </Label>
  <RadioGroup v-model="part.partType" @update:modelValue="onPartTypeChange(partIndex)">
    <!-- Fill-in-the-Blank -->
    <div class="flex items-center space-x-2">
      <RadioGroupItem value="fill_in_blank" id="fill-blank" />
      <Label for="fill-blank" class="flex items-center gap-2 cursor-pointer">
        <FileQuestion class="w-4 h-4" />
        <div>
          <div class="font-medium">Fill-in-the-Blank Questions</div>
          <div class="text-xs text-muted-foreground">IP calculation, subnetting questions</div>
        </div>
      </Label>
    </div>

    <!-- DHCP Configuration (NEW) -->
    <div class="flex items-center space-x-2">
      <RadioGroupItem value="dhcp_config" id="dhcp-config" />
      <Label for="dhcp-config" class="flex items-center gap-2 cursor-pointer">
        <Server class="w-4 h-4" />
        <div>
          <div class="font-medium">DHCP Configuration</div>
          <div class="text-xs text-muted-foreground">Configure DHCP with lecturer-defined pool</div>
        </div>
      </Label>
    </div>

    <!-- Network Configuration -->
    <div class="flex items-center space-x-2">
      <RadioGroupItem value="network_config" id="network-config" />
      <Label for="network-config" class="flex items-center gap-2 cursor-pointer">
        <Network class="w-4 h-4" />
        <div>
          <div class="font-medium">Network Configuration</div>
          <div class="text-xs text-muted-foreground">Hands-on device configuration tasks</div>
        </div>
      </Label>
    </div>
  </RadioGroup>
</div>
```

**Hybrid Question Editor with Auto-Detection**:

```vue
<!-- Question Editor (if partType === 'fill_in_blank') -->
<div v-if="part.partType === 'fill_in_blank'" class="space-y-4">
  <div v-for="(question, qIndex) in part.questions" :key="question.questionId"
       class="border rounded-lg p-4 space-y-3">

    <!-- Question Text -->
    <div class="space-y-2">
      <Label>Question Text <span class="text-destructive">*</span></Label>
      <Input
        v-model="question.questionText"
        placeholder="e.g., Calculate your network address for VLAN 1: ___"
        @input="onQuestionTextChange(partIndex, qIndex)"
      />
    </div>

    <!-- Question Type (Manual Selection - 100% Accurate) -->
    <div class="space-y-2">
      <Label>Question Type <span class="text-destructive">*</span></Label>
      <Select v-model="question.questionType">
        <SelectTrigger>
          <SelectValue placeholder="Select question type..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="network_address">Network Address</SelectItem>
          <SelectItem value="first_usable_ip">First Usable IP</SelectItem>
          <SelectItem value="last_usable_ip">Last Usable IP</SelectItem>
          <SelectItem value="broadcast_address">Broadcast Address</SelectItem>
          <SelectItem value="subnet_mask">Subnet Mask (CIDR)</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- VLAN Index (Hybrid: Auto-detect + Manual Override) -->
    <div class="space-y-2">
      <Label>Target VLAN <span class="text-destructive">*</span></Label>
      <div class="flex items-center gap-2">
        <Select v-model="question.schemaMapping.vlanIndex">
          <SelectTrigger class="flex-1">
            <SelectValue placeholder="Select VLAN..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="i in vlanCount" :key="i-1" :value="i-1">
              VLAN {{ i }}
            </SelectItem>
          </SelectContent>
        </Select>

        <!-- Auto-detection indicator -->
        <Badge v-if="question.schemaMapping.autoDetected" variant="secondary" class="text-xs">
          🤖 Auto-detected
        </Badge>
      </div>
      <p v-if="question.schemaMapping.autoDetected" class="text-xs text-muted-foreground">
        VLAN was auto-detected from question text. You can change it above.
      </p>
    </div>

    <!-- Final Mapping Preview -->
    <Alert>
      <Info class="w-4 h-4" />
      <AlertDescription class="text-xs">
        <strong>This answer will be stored in:</strong><br>
        <code class="text-xs">schema.vlans[{{ question.schemaMapping.vlanIndex }}].{{ getFieldName(question.questionType) }}</code>
      </AlertDescription>
    </Alert>

    <!-- Points -->
    <div class="space-y-2">
      <Label>Points</Label>
      <Input
        v-model.number="question.points"
        type="number"
        min="1"
        placeholder="5"
      />
    </div>
  </div>

  <Button @click="addQuestion(partIndex)">
    <Plus class="w-4 h-4 mr-2" /> Add Question
  </Button>
</div>
```

**Auto-detection Logic**:

```typescript
// Auto-detect VLAN from question text
function onQuestionTextChange(partIndex: number, questionIndex: number) {
  const question = parts.value[partIndex].questions[questionIndex]
  const text = question.questionText

  // Try to detect VLAN number
  const vlanMatch = text.match(/VLAN\s*(\d+)/i)
  if (vlanMatch) {
    const vlanNumber = parseInt(vlanMatch[1])
    question.schemaMapping.vlanIndex = vlanNumber - 1  // Convert to 0-indexed
    question.schemaMapping.autoDetected = true
  } else {
    // No VLAN detected, default to 0
    question.schemaMapping.vlanIndex = 0
    question.schemaMapping.autoDetected = false
  }

  // Auto-set field based on question type
  question.schemaMapping.field = getFieldFromQuestionType(question.questionType)
}

function getFieldFromQuestionType(type: string): string {
  const mapping = {
    'network_address': 'networkAddress',
    'first_usable_ip': 'firstUsableIp',
    'last_usable_ip': 'lastUsableIp',
    'broadcast_address': 'broadcastAddress',
    'subnet_mask': 'subnetMask'
  }
  return mapping[type] || 'networkAddress'
}
```

### 4. Student IP Schema Floating Button (Enhanced)

**File**: `components/student/StudentIpSchemaFloatingButton.vue`

```vue
<template>
  <div v-if="schema.exists" class="fixed bottom-6 right-6 z-50">
    <!-- Collapsed Button -->
    <Button
      v-if="!isExpanded"
      @click="toggleExpanded"
      size="lg"
      class="rounded-full shadow-lg hover:shadow-xl transition-all"
    >
      <Network class="w-5 h-5 mr-2" />
      My IP Schema

      <!-- Version Badge -->
      <Badge v-if="schema.version > 1" variant="secondary" class="ml-2">
        v{{ schema.version }}
      </Badge>

      <ChevronUp class="w-4 h-4 ml-2" />
    </Button>

    <!-- Expanded Card -->
    <Card v-else class="w-[700px] max-h-[600px] shadow-2xl border-2 border-primary">
      <CardHeader class="pb-3 border-b">
        <div class="flex items-center justify-between">
          <div>
            <CardTitle class="text-lg flex items-center gap-2">
              <Network class="w-5 h-5 text-primary" />
              My IP Schema
              <Badge variant="outline">v{{ schema.version }}</Badge>
            </CardTitle>
            <p class="text-xs text-muted-foreground mt-1">
              Last updated: {{ formatDate(schema.updatedAt) }}
            </p>
          </div>

          <div class="flex items-center gap-2">
            <!-- Edit Button (always available - no locking) -->
            <Button
              variant="outline"
              size="sm"
              @click="editSchema"
            >
              <Edit class="w-4 h-4 mr-1" />
              Edit
            </Button>

            <Button variant="ghost" size="sm" @click="toggleExpanded">
              <X class="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent class="p-4 overflow-y-auto max-h-[500px]">
        <!-- VLAN Schema -->
        <div class="space-y-4">
          <div v-for="vlan in schema.schema.vlans" :key="vlan.vlanIndex"
               class="border rounded-lg overflow-hidden">
            <div class="bg-primary/5 px-3 py-2 font-medium flex items-center justify-between">
              <span>VLAN {{ vlan.vlanIndex }}</span>
              <div class="flex items-center gap-2">
                <Badge variant="outline">Subnet {{ vlan.subnetIndex }}</Badge>
                <Badge
                  :variant="vlan.source === 'calculated' ? 'secondary' : 'default'"
                  class="text-xs"
                >
                  {{ vlan.source === 'calculated' ? 'Calculated' : 'Updated' }}
                </Badge>
              </div>
            </div>

            <Table>
              <TableBody>
                <TableRow>
                  <TableCell class="font-medium w-[200px]">Network Address</TableCell>
                  <TableCell class="font-mono text-primary">
                    {{ vlan.networkAddress }}/{{ vlan.subnetMask }}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell class="font-medium">First Usable IP</TableCell>
                  <TableCell class="font-mono text-primary">{{ vlan.firstUsableIp }}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell class="font-medium">Last Usable IP</TableCell>
                  <TableCell class="font-mono text-primary">{{ vlan.lastUsableIp }}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell class="font-medium">Broadcast Address</TableCell>
                  <TableCell class="font-mono text-primary">{{ vlan.broadcastAddress }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <!-- Device IP Assignments (if any) -->
          <div v-if="schema.schema.devices && schema.schema.devices.length > 0" class="mt-6">
            <h4 class="font-semibold mb-3 flex items-center gap-2">
              <Server class="w-4 h-4" />
              Device IP Assignments
            </h4>

            <div v-for="device in schema.schema.devices" :key="device.deviceId"
                 class="border rounded-lg p-3 space-y-2">
              <div class="font-medium text-sm">{{ device.deviceId }}</div>

              <div v-for="iface in device.interfaces" :key="iface.variableName"
                   class="flex items-center justify-between text-sm border-t pt-2">
                <span class="text-muted-foreground">{{ iface.variableName }}</span>
                <div class="flex items-center gap-2">
                  <span class="font-mono text-primary">{{ iface.ipAddress }}</span>
                  <Badge
                    variant="outline"
                    class="text-xs"
                    :class="{
                      'bg-blue-50 border-blue-300': iface.source === 'calculated',
                      'bg-green-50 border-green-300': iface.source === 'dhcp',
                      'bg-yellow-50 border-yellow-300': iface.source === 'manual_update'
                    }"
                  >
                    {{ iface.source === 'dhcp' ? 'DHCP' : iface.source === 'calculated' ? 'Calc' : 'Manual' }}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Help Text -->
        <div class="mt-4 text-xs text-muted-foreground flex items-start gap-2 bg-accent/30 p-3 rounded border">
          <Info class="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p class="font-medium mb-1">About this schema:</p>
            <ul class="list-disc list-inside space-y-1">
              <li>This schema reflects your current IP configuration</li>
              <li>You can edit this schema anytime (no time limits)</li>
              <li>Grading uses these IPs when testing your devices</li>
              <li>Version {{ schema.version }} - {{ schema.version > 1 ? 'Updated' : 'Initial' }}</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'

interface Props {
  schema: StudentIpSchema
}

const props = defineProps<Props>()
const router = useRouter()
const route = useRoute()
const isExpanded = ref(false)

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}

const editSchema = () => {
  // Navigate to IP Calculation part in update mode
  router.push({
    path: route.path,
    query: {
      part: props.schema.calculationPartId,
      mode: 'update'
    }
  })
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'Unknown'
  return new Date(dateStr).toLocaleString()
}
</script>
```

### 5. DHCP Configuration Part Component (NEW)

**File**: `components/student/DhcpConfigurationPart.vue`

```vue
<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        <Server class="w-5 h-5" />
        DHCP Configuration
      </CardTitle>
    </CardHeader>

    <CardContent class="space-y-4">
      <!-- Lecturer-Defined DHCP Pool -->
      <Alert>
        <Info class="w-4 h-4" />
        <AlertTitle>DHCP Pool Configuration</AlertTitle>
        <AlertDescription class="space-y-2 mt-2">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <span class="text-xs text-muted-foreground">Pool Name:</span>
              <div class="font-mono font-medium">{{ dhcpConfig.poolName }}</div>
            </div>
            <div>
              <span class="text-xs text-muted-foreground">VLAN:</span>
              <div class="font-mono font-medium">{{ dhcpConfig.vlanIndex }}</div>
            </div>
            <div>
              <span class="text-xs text-muted-foreground">Start IP:</span>
              <div class="font-mono font-medium text-primary">{{ dhcpConfig.startIp }}</div>
            </div>
            <div>
              <span class="text-xs text-muted-foreground">End IP:</span>
              <div class="font-mono font-medium text-primary">{{ dhcpConfig.endIp }}</div>
            </div>
            <div>
              <span class="text-xs text-muted-foreground">Subnet Mask:</span>
              <div class="font-mono font-medium">{{ dhcpConfig.subnetMask }}</div>
            </div>
            <div v-if="dhcpConfig.defaultGateway">
              <span class="text-xs text-muted-foreground">Gateway:</span>
              <div class="font-mono font-medium">{{ dhcpConfig.defaultGateway }}</div>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      <!-- Instructions -->
      <div class="prose prose-sm max-w-none">
        <div v-html="renderMarkdown(dhcpConfig.configurationInstructions)" />
      </div>

      <!-- Important Steps -->
      <Alert variant="default" class="bg-blue-50 border-blue-200">
        <AlertCircle class="w-4 h-4 text-blue-600" />
        <AlertTitle class="text-blue-800">Important Steps</AlertTitle>
        <AlertDescription class="text-blue-700">
          <ol class="list-decimal list-inside space-y-1 text-sm mt-2">
            <li>Configure your {{ dhcpConfig.dhcpServerDevice }} with the DHCP pool above</li>
            <li>Note the IP addresses assigned to each device</li>
            <li>Update your IP Schema with the actual DHCP-assigned IPs</li>
            <li>Continue with device configuration using the actual IPs</li>
          </ol>
        </AlertDescription>
      </Alert>

      <!-- Validation Warning -->
      <Alert variant="destructive">
        <AlertTriangle class="w-4 h-4" />
        <AlertTitle>DHCP Pool Validation</AlertTitle>
        <AlertDescription class="text-sm">
          <strong>Important:</strong> When updating your IP schema, device IPs <strong>must be within</strong>
          the lecturer-defined pool ({{ dhcpConfig.startIp }} - {{ dhcpConfig.endIp }}).
          IPs outside this range will fail validation.
        </AlertDescription>
      </Alert>

      <!-- Link to Update IP Schema -->
      <div class="flex justify-end">
        <Button @click="goToUpdateSchema" variant="outline">
          <Edit class="w-4 h-4 mr-2" />
          Update My IP Schema
        </Button>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { marked } from 'marked'

interface DhcpConfig {
  poolName: string
  vlanIndex: number
  startIp: string
  endIp: string
  subnetMask: string
  defaultGateway?: string
  configurationInstructions: string
  dhcpServerDevice: string
}

interface Props {
  dhcpConfig: DhcpConfig
  calculationPartId: string
}

const props = defineProps<Props>()
const router = useRouter()

const goToUpdateSchema = () => {
  router.push({
    path: router.currentRoute.value.path,
    query: {
      part: props.calculationPartId,
      mode: 'update'
    }
  })
}

const renderMarkdown = (markdown: string) => {
  return marked(markdown)
}
</script>
```

---

## 📦 Implementation Phases

### Phase 1: Backend - StudentIpSchema Model (3 days)
- [ ] Create StudentIpSchema MongoDB model
- [ ] Add indexes (studentId + labId, version)
- [ ] Write migration for existing data
- [ ] Create schema calculation service
- [ ] Add version management (unlimited versions)

### Phase 2: Backend - IP Schema APIs (4 days)
- [ ] Update submit-answers endpoint (support isUpdate flag)
- [ ] Add DHCP pool validation (fail if outside pool)
- [ ] Create get-ip-schema endpoint
- [ ] Update lab start API to include schema
- [ ] Create grading service integration endpoint
- [ ] Test versioning and updates

### Phase 3: Backend - DHCP Part Type (2 days)
- [ ] Update LabPart model with dhcpConfiguration
- [ ] Add DHCP part validation
- [ ] Create DHCP part creation flow
- [ ] Add DHCP pool validation logic

### Phase 4: Frontend - Subnet Index (1 day) ✅ COMPLETED
- [x] Add subnetIndex field to VlanConfig interface
- [x] Update LabWizardStep2.vue with subnet index input
- [x] Add subnet index validation
- [x] Update default VLAN creation with subnetIndex: 1 (UI uses 1-indexed)
- [x] Test with various subnet masks

**⚠️ CRITICAL NOTE - Subnet Index Conversion**:
- **Frontend UI**: Uses **1-indexed** subnet blocks (1 = first, 2 = second, etc.) for better UX
- **Backend API**: Expects **0-indexed** values (0 = first, 1 = second, etc.)
- **Conversion Required**: Before submitting to backend → `backendValue = uiValue - 1`
- This conversion must happen in the lab creation/update API submission logic

### Phase 5: Frontend - Hybrid Schema Mapping (5 days)
- [ ] Update TypeScript interfaces with schemaMapping
- [ ] Add DHCP part type to Step 4
- [ ] Implement VLAN auto-detection logic (regex-based)
- [ ] Create question editor with hybrid mapping UI
- [ ] Show "Auto-detected" badge
- [ ] Add final mapping preview
- [ ] Test auto-detection accuracy

### Phase 6: Frontend - Student Components (5 days)
- [ ] Update StudentIpSchemaFloatingButton:
  - Version display
  - Edit button (always available)
  - Source indicators
  - Device IP assignments
- [ ] Update FillInBlankQuestions with update mode
- [ ] Create DhcpConfigurationPart component
- [ ] Add navigation to update schema
- [ ] Test DHCP pool validation on frontend

### Phase 7: Integration & Testing (5 days)
- [ ] E2E: Create exam → Take exam → Update schema
- [ ] Test DHCP flow with actual IPs
- [ ] Test grading with updated schema
- [ ] Test version history
- [ ] Test unlimited updates (no locking)
- [ ] Test DHCP pool validation failure

### Phase 8: Documentation & Polish (2 days)
- [ ] Update CLAUDE.md
- [ ] Create instructor guide
- [ ] Add inline help text
- [ ] Performance optimization

**Total Time**: ~27 days (5-6 weeks)

---

## 🎯 Success Criteria

- [ ] Instructors can create exams with three part types
- [ ] Students can calculate initial IPs (Part 1)
- [ ] Students can configure DHCP with lecturer pools (Part 2)
- [ ] Students can update IP schemas unlimited times
- [ ] DHCP pool validation fails IPs outside range
- [ ] Grading always uses student-declared IPs
- [ ] IP schema shows version history
- [ ] No schema locking - always editable
- [ ] Subnet index validated correctly
- [ ] No breaking changes to existing labs

---

## 🚀 Ready to Start!

**Recommendation: Start with Phase 4 (Frontend Subnet Index) - Quick Win (1 day)**

This gives immediate value and is independent of other phases. Then proceed with backend phases 1-3, followed by frontend phases 5-6.

**Or start with Phase 1 (Backend StudentIpSchema) if you prefer backend-first approach.**

Which would you like to begin with? 🎯

 ☐ Implement question editor with hybrid schema mapping and auto-detection
  ☐ Create DHCP configuration editor in Step 4
  ☐ Create/Enhance Student IP Schema Floating Button component
  ☐ Create Fill-in-Blank Questions student component with update mode
  ☐ Create DHCP Configuration Part student component
  ☐ Test complete exam creation and student workflow