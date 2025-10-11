# Dynamic IP Schema Architecture - NetGrader Exam System

## 🎯 Core Concept

**Student IP Schema is MUTABLE and STUDENT-MANAGED**

Students can:
1. Initially calculate IPs based on formulas (Part 1: IP Calculation)
2. Configure DHCP with lecturer-defined pools (Part 2: DHCP Config)
3. Update their IP schema when devices receive DHCP IPs
4. Have their configurations graded using their latest declared IPs

---

## 📊 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXAM FLOW WITH DHCP                          │
└─────────────────────────────────────────────────────────────────┘

Part 1: IP Calculation (Fill-in-Blank)
├─ Student calculates: Network address, usable IPs, broadcast
├─ Submits initial answers → Creates StudentIpSchema v1
└─ IP Schema becomes visible in floating button

Part 2: DHCP Configuration (Network Config)
├─ Lecturer-defined DHCP pool: 172.16.40.100 - 172.16.40.150
├─ Student configures router to serve DHCP
├─ Devices request IPs via DHCP
├─ Device gets 172.16.40.112 (different from calculated!)
└─ Student notes actual IP received

Part 1: UPDATE IP Calculation (Re-submit)
├─ Student clicks "Edit Schema" in floating button
├─ Returns to Part 1 in "Update Mode"
├─ Updates IP answers to reflect DHCP-assigned IPs
├─ Submits updates → StudentIpSchema v2
└─ IP Schema floating button shows "Updated" badge

Part 3+: Device Configuration & Grading
├─ Student configures devices using actual IPs
├─ Submits for grading
├─ Grading service fetches latest StudentIpSchema (v2)
├─ Connects to devices using student-declared IPs
└─ Grades successfully ✅
```

---

## 🗄️ Backend Data Models

### 1. StudentIpSchema Collection (NEW)

**Purpose**: Store each student's declared IP schema (versioned)

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

      // Source of this schema entry
      source: 'calculated' | 'student_updated';
      updatedAt: Date;
    }>;

    // Device-level IP assignments
    devices: Array<{
      deviceId: string;            // e.g., "router1"
      interfaces: Array<{
        variableName: string;      // e.g., "gig0_0_vlan_1"
        ipAddress: string;         // e.g., "172.16.40.112"
        subnetMask?: string;       // Optional

        // Track how this IP was determined
        source: 'calculated' | 'dhcp' | 'manual_update';
        dhcpPoolName?: string;     // If from DHCP
        updatedAt: Date;
        updatedBy: 'initial_calculation' | 'student_update';
      }>;
    }>;
  };

  // Versioning for audit trail
  version: number;                 // Increments on each update
  previousVersionId?: Types.ObjectId; // Link to previous version

  // Metadata
  calculationPartId?: Types.ObjectId;  // Which part this came from
  isLocked: boolean;               // Lock after exam submission

  createdAt: Date;
  updatedAt: Date;
}

const studentIpSchemaSchema = new Schema<IStudentIpSchema>({
  studentId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  labId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Lab'
  },
  schema: {
    vlans: [{
      vlanIndex: { type: Number, required: true },
      networkAddress: { type: String, required: true },
      subnetMask: { type: Number, required: true },
      subnetIndex: { type: Number, required: true },
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
        dhcpPoolName: { type: String, required: false },
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
    default: 1
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
    default: false
  }
}, {
  timestamps: true
});

// Indexes
studentIpSchemaSchema.index({ studentId: 1, labId: 1 });
studentIpSchemaSchema.index({ labId: 1, version: -1 });

export const StudentIpSchema = model<IStudentIpSchema>('StudentIpSchema', studentIpSchemaSchema);
```

---

### 2. Updated LabPart Model - Add DHCP Part Type

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
    questionType: 'ip_address' | 'subnet_mask' | 'network_address' | 'broadcast_address' | 'number';
    order: number;
    points: number;

    // Mapping to IP schema field
    schemaMapping?: {
      vlanIndex?: number;        // Which VLAN this question maps to
      field: 'networkAddress' | 'subnetMask' | 'firstUsableIp' | 'lastUsableIp' | 'broadcastAddress';
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

    // Lecturer-defined DHCP pool
    startIp: string;               // e.g., "172.16.40.100"
    endIp: string;                 // e.g., "172.16.40.150"
    subnetMask: string;            // e.g., "255.255.255.192"

    // Optional DHCP settings
    defaultGateway?: string;
    dnsServers?: string[];
    leaseTime?: number;            // seconds

    // Instructions for students
    configurationInstructions: string;  // "Configure your router to serve..."

    // Expected device to configure DHCP on
    dhcpServerDevice: string;      // e.g., "router1"
  };

  // Existing fields
  tasks: Array<{ ... }>;
  prerequisites: string[];
}
```

**Schema Update**:

```typescript
const labPartSchema = new Schema<ILabPart>({
  // ... existing fields

  partType: {
    type: String,
    enum: ['fill_in_blank', 'network_config', 'dhcp_config'],
    required: true,
    default: 'network_config'
  },

  questions: [{
    questionId: { type: String, required: true },
    questionText: { type: String, required: true },
    questionType: {
      type: String,
      enum: ['ip_address', 'subnet_mask', 'network_address', 'broadcast_address', 'number'],
      required: true
    },
    order: { type: Number, required: true },
    points: { type: Number, required: true },
    schemaMapping: {
      vlanIndex: { type: Number },
      field: {
        type: String,
        enum: ['networkAddress', 'subnetMask', 'firstUsableIp', 'lastUsableIp', 'broadcastAddress']
      },
      deviceId: { type: String },
      variableName: { type: String }
    },
    answerFormula: { type: String },
    expectedAnswerType: {
      type: String,
      enum: ['exact', 'range'],
      default: 'exact'
    },
    placeholder: { type: String },
    inputFormat: {
      type: String,
      enum: ['ip', 'cidr', 'number']
    }
  }],

  dhcpConfiguration: {
    poolName: { type: String },
    vlanIndex: { type: Number },
    startIp: { type: String },
    endIp: { type: String },
    subnetMask: { type: String },
    defaultGateway: { type: String },
    dnsServers: [{ type: String }],
    leaseTime: { type: Number },
    configurationInstructions: { type: String },
    dhcpServerDevice: { type: String }
  }
});
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
  "isUpdate": false  // false = initial submission, true = update existing
}
```

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
    "totalPoints": 20,
    "totalPointsEarned": 18,
    "passed": true,
    "
": {
      "schemaId": "507f1f77bcf86cd799439015",
      "version": 1,
      "vlans": [...],
      "devices": [...]
    },
    "message": "IP Schema created successfully"
  }
}
```

**Logic**:
1. Validate answers against formulas
2. If `isUpdate === false`:
   - Create new StudentIpSchema (version 1)
   - Map answers to schema fields using `schemaMapping`
3. If `isUpdate === true`:
   - Fetch existing StudentIpSchema
   - Increment version
   - Update schema fields
   - Archive previous version
4. Return updated schema to frontend

---

### 2. Get Student IP Schema

**Endpoint**: `GET /v0/labs/:labId/ip-schema`

**Response**:
```json
{
  "success": true,
  "data": {
    "schemaId": "507f1f77bcf86cd799439015",
    "version": 2,
    "isLocked": false,
    "schema": {
      "vlans": [
        {
          "vlanIndex": 0,
          "networkAddress": "172.16.40.64",
          "subnetMask": 26,
          "subnetIndex": 1,
          "firstUsableIp": "172.16.40.65",
          "lastUsableIp": "172.16.40.126",
          "broadcastAddress": "172.16.40.127",
          "source": "student_updated",
          "updatedAt": "2024-01-15T10:30:00Z"
        }
      ],
      "devices": [
        {
          "deviceId": "router1",
          "interfaces": [
            {
              "variableName": "gig0_0_vlan_1",
              "ipAddress": "172.16.40.112",
              "source": "dhcp",
              "dhcpPoolName": "VLAN1_POOL",
              "updatedAt": "2024-01-15T10:30:00Z",
              "updatedBy": "student_update"
            }
          ]
        }
      ]
    },
    "updatedAt": "2024-01-15T10:30:00Z",
    "canEdit": true,
    "calculationPartId": "507f1f77bcf86cd799439016"
  }
}
```

---

### 3. Update Lab Start API

**Endpoint**: `POST /v0/labs/:labId/start`

**Enhanced Response**:
```json
{
  "success": true,
  "data": {
    "networkConfiguration": {
      "ipMappings": { ... },
      "vlanMappings": { ... }
    },

    // NEW: Student IP Schema (if exists)
    "studentIpSchema": {
      "exists": true,
      "schemaId": "507f1f77bcf86cd799439015",
      "version": 2,
      "schema": {
        "vlans": [...],
        "devices": [...]
      },
      "canEdit": true,
      "calculationPartId": "507f1f77bcf86cd799439016"
    }
  }
}
```

---

### 4. Grading Service Integration

**New Endpoint**: `GET /v0/submissions/:submissionId/student-ip-schema`

**Purpose**: Grading service fetches student's latest IP schema before connecting to devices

**Response**:
```json
{
  "success": true,
  "data": {
    "schemaId": "507f1f77bcf86cd799439015",
    "version": 2,
    "deviceConnections": {
      "router1": {
        "gig0_0_vlan_1": {
          "ipAddress": "172.16.40.112",
          "source": "dhcp"
        }
      }
    },
    "fallbackToCalculated": false
  }
}
```

**Grading Service Flow**:
```typescript
// In grading worker
async function gradeSubmission(submissionId: string) {
  // 1. Fetch student's IP schema
  const ipSchema = await fetchStudentIpSchema(submissionId);

  // 2. Use student-declared IPs for connections
  const deviceIp = ipSchema.deviceConnections['router1']['gig0_0_vlan_1'].ipAddress;

  // 3. Connect and grade
  const connection = await sshConnect(deviceIp, credentials);
  const result = await runTests(connection, tasks);

  return result;
}
```

---

## 🎨 Frontend Components

### 1. Enhanced Student IP Schema Floating Button

**File**: `/home/chinfair/Documents/netgrader-frontend/components/student/StudentIpSchemaFloatingButton.vue`

**New Features**:
- Show version number and last updated time
- "Edit Schema" button to return to IP Calculation part
- Visual indicator when schema has been updated
- Show source of each IP (calculated vs DHCP vs manual)

```vue
<template>
  <div v-if="schema.exists" class="fixed bottom-6 right-6 z-50">
    <!-- Collapsed Button -->
    <Button
      v-if="!isExpanded"
      @click="toggleExpanded"
      size="lg"
      class="rounded-full shadow-lg relative"
    >
      <Network class="w-5 h-5 mr-2" />
      My IP Schema

      <!-- Updated Badge -->
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
            <!-- Edit Button -->
            <Button
              v-if="schema.canEdit && !isExamLocked"
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
          <div v-for="vlan in schema.schema.vlans" :key="vlan.vlanIndex" class="border rounded-lg overflow-hidden">
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

          <!-- Device IP Assignments -->
          <div v-if="schema.schema.devices.length > 0" class="mt-6">
            <h4 class="font-semibold mb-3 flex items-center gap-2">
              <Server class="w-4 h-4" />
              Device IP Assignments
            </h4>

            <div v-for="device in schema.schema.devices" :key="device.deviceId" class="border rounded-lg p-3 space-y-2">
              <div class="font-medium text-sm">{{ device.deviceId }}</div>

              <div v-for="iface in device.interfaces" :key="iface.variableName" class="flex items-center justify-between text-sm border-t pt-2">
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
              <li>You can edit this schema if IPs change (e.g., after DHCP)</li>
              <li>The grading service will use these IPs when testing your devices</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
// ... implementation
const editSchema = () => {
  // Navigate back to IP Calculation part in update mode
  router.push({
    path: currentRoute.value.path,
    query: {
      part: schema.value.calculationPartId,
      mode: 'update'
    }
  })
}
</script>
```

---

### 2. Updated Fill-in-Blank Component with Update Mode

**File**: `/home/chinfair/Documents/netgrader-frontend/components/student/FillInBlankQuestions.vue`

**New Features**:
- Detect "update mode" from query params
- Pre-fill answers from existing schema
- Show "Update" instead of "Submit" button
- Show previous answers vs new answers

```vue
<script setup lang="ts">
const route = useRoute()
const isUpdateMode = computed(() => route.query.mode === 'update')

// Load existing answers if in update mode
onMounted(async () => {
  if (isUpdateMode.value) {
    const schema = await fetchStudentIpSchema(props.labId)
    if (schema) {
      // Pre-fill answers from schema
      prefillAnswersFromSchema(schema)
    }
  }
})

const prefillAnswersFromSchema = (schema: any) => {
  props.questions.forEach(question => {
    if (question.schemaMapping) {
      const { vlanIndex, field, deviceId, variableName } = question.schemaMapping

      if (vlanIndex !== undefined) {
        const vlan = schema.schema.vlans.find((v: any) => v.vlanIndex === vlanIndex)
        if (vlan) {
          answers.value[question.questionId] = vlan[field]
          previousAnswers.value[question.questionId] = vlan[field]
        }
      } else if (deviceId && variableName) {
        const device = schema.schema.devices.find((d: any) => d.deviceId === deviceId)
        if (device) {
          const iface = device.interfaces.find((i: any) => i.variableName === variableName)
          if (iface) {
            answers.value[question.questionId] = iface.ipAddress
            previousAnswers.value[question.questionId] = iface.ipAddress
          }
        }
      }
    }
  })
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>
        {{ isUpdateMode ? 'Update Your IP Schema' : 'Answer the Following Questions' }}
      </CardTitle>
      <p v-if="isUpdateMode" class="text-sm text-muted-foreground">
        Update your IP addresses to reflect actual DHCP assignments or manual changes
      </p>
    </CardHeader>

    <CardContent class="space-y-4">
      <div v-for="question in questions" :key="question.questionId" class="space-y-2">
        <!-- Question Label -->
        <label class="text-sm font-medium">
          {{ question.questionText }}
          <span class="text-xs text-muted-foreground">({{ question.points }} pts)</span>
        </label>

        <!-- Show previous answer if in update mode -->
        <div v-if="isUpdateMode && previousAnswers[question.questionId]" class="text-xs text-muted-foreground flex items-center gap-2 mb-1">
          <span>Previous:</span>
          <code class="bg-muted px-2 py-1 rounded">{{ previousAnswers[question.questionId] }}</code>
        </div>

        <!-- Input Field -->
        <Input
          v-model="answers[question.questionId]"
          :type="getInputType(question.inputFormat)"
          :placeholder="question.placeholder"
          :disabled="hasSubmitted"
          :class="{
            'border-green-500': results[question.questionId]?.isCorrect,
            'border-destructive': hasSubmitted && !results[question.questionId]?.isCorrect,
            'border-amber-500': isUpdateMode && answers[question.questionId] !== previousAnswers[question.questionId]
          }"
        />
      </div>

      <Button
        @click="submitAnswers"
        :disabled="isSubmitting || hasSubmitted"
        class="w-full"
      >
        <Send class="w-4 h-4 mr-2" />
        {{ isUpdateMode ? 'Update Schema' : 'Submit Answers' }}
      </Button>
    </CardContent>
  </Card>
</template>
```

---

### 3. New DHCP Configuration Part Component

**New File**: `/home/chinfair/Documents/netgrader-frontend/components/student/DhcpConfigurationPart.vue`

```vue
<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        <Network class="w-5 h-5" />
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

      <!-- Configuration Steps -->
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
  labId: string
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
</script>
```

---

## 🎯 Complete Exam Flow Example

### Exam: CNI2024 Network Configuration

**Part 1: IP Calculation (Fill-in-Blank)**
```
Questions:
1. Calculate your network address for VLAN 1: ___.___.___.___
2. Calculate your subnet mask in CIDR: /___
3. Calculate your first usable IP: ___.___.___.___
4. Calculate your broadcast address: ___.___.___.___

Student submits → StudentIpSchema v1 created
IP Schema floating button appears
```

**Part 2: DHCP Configuration (DHCP Config)**
```
DHCP Pool: VLAN1_POOL
VLAN: 1
Start IP: 172.16.40.100 (Lecturer-defined)
End IP: 172.16.40.150 (Lecturer-defined)
Subnet Mask: 255.255.255.192
Default Gateway: 172.16.40.65

Instructions:
"Configure your router1 to serve DHCP for VLAN 1 using the pool above."

Student configures DHCP
PC1 requests IP via DHCP → Gets 172.16.40.112
```

**Part 1: Update IP Calculation (Update Mode)**
```
Student clicks "Edit Schema" in floating button
Returns to Part 1 in update mode
Sees previous answers pre-filled
Updates question 3: "172.16.40.112" (DHCP IP for PC1)
Submits → StudentIpSchema v2 created
IP Schema shows "Updated" badge
```

**Part 3: Router Configuration (Network Config)**
```
Student configures router using actual IPs
Submits for grading
Grading service:
  1. Fetches StudentIpSchema v2
  2. Connects to PC1 at 172.16.40.112 (not calculated IP)
  3. Runs tests
  4. Grades successfully ✅
```

---

## 📋 Updated Implementation Phases

### Phase 1: Backend - StudentIpSchema Model (3 days)
- [ ] Create StudentIpSchema MongoDB model
- [ ] Add indexes
- [ ] Write migration for existing data
- [ ] Create schema calculation service
- [ ] Add version management

### Phase 2: Backend - IP Schema APIs (3 days)
- [ ] Update submit-answers endpoint (support update mode)
- [ ] Create get-ip-schema endpoint
- [ ] Update lab start API to include schema
- [ ] Create schema update endpoint
- [ ] Add grading service integration endpoint

### Phase 3: Backend - DHCP Part Type (2 days)
- [ ] Update LabPart model with dhcpConfiguration
- [ ] Add DHCP part validation
- [ ] Create DHCP part creation flow

### Phase 4: Frontend - Subnet Index (1 day)
- [ ] Add subnetIndex field to Step 2
- [ ] Update validation
- [ ] Test with various subnet masks

### Phase 5: Frontend - Part Type Selection (4 days)
- [ ] Add DHCP part type to Step 4
- [ ] Create DHCP configuration editor
- [ ] Update question editor with schemaMapping
- [ ] Add question-to-schema mapping UI

### Phase 6: Frontend - Student Components (5 days)
- [ ] Update StudentIpSchemaFloatingButton with:
  - Version display
  - Edit button
  - Source indicators (calculated/DHCP/manual)
  - Device IP assignments
- [ ] Update FillInBlankQuestions with update mode
- [ ] Create DhcpConfigurationPart component
- [ ] Add navigation to update schema

### Phase 7: Integration & Testing (5 days)
- [ ] E2E test: Create exam → Take exam → Update schema
- [ ] Test DHCP flow with actual device
- [ ] Test grading with updated schema
- [ ] Test version rollback
- [ ] Test concurrent updates

### Phase 8: Documentation & Polish (2 days)
- [ ] Update user guides
- [ ] Add inline help text
- [ ] Create video tutorial
- [ ] Performance optimization

---

## 🚨 Critical Considerations

### 1. Race Conditions
**Problem**: Student updates schema while grading is in progress

**Solution**:
- Lock schema when grading starts
- Use versioning - grading uses schema version at submission time
- Store schema version ID in submission record

### 2. Schema Validation
**Problem**: Student enters invalid IPs (outside DHCP pool)

**Solution**:
- Validate IP updates against DHCP pool ranges
- Warn if IP is outside lecturer-defined ranges
- Allow override with confirmation

### 3. Grading Service Integration
**Problem**: Grading service needs to know which IPs to use

**Solution**:
- Submission includes `studentIpSchemaId` and `version`
- Grading fetches exact schema version used at submission
- Fallback to calculated IPs if schema not found

### 4. Audit Trail
**Problem**: Need to track why schema was updated

**Solution**:
- Store previous version links
- Add `updateReason` field (DHCP assignment, manual correction, etc.)
- Keep full version history until exam locked

---

## ✅ Success Criteria

- [ ] Student can calculate initial IPs
- [ ] Student can configure DHCP with lecturer-defined pool
- [ ] Student can update IP schema after DHCP assignment
- [ ] IP Schema floating button shows version and source
- [ ] Grading service uses student-declared IPs
- [ ] Schema updates are versioned and auditable
- [ ] No breaking changes to existing labs

---

**This architecture supports your dynamic IP schema requirements! Ready to implement?** 🚀
