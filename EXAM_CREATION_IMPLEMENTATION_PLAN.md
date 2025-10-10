# NetGrader Exam Creation - Comprehensive Implementation Plan

## 📋 Executive Summary

This document outlines the complete implementation plan for upgrading NetGrader to support comprehensive exam creation with:
- **Fill-in-the-blank questions** for IP calculation and subnetting
- **Network configuration tasks** for hands-on device grading
- **Dynamic subnet configuration** with `subnetIndex` field
- **Student IP Schema table** (floating UI element)

---

## 🎯 Problem Statement

### Current Limitations
1. **No distinction between question types**: All parts are treated as network configuration tasks
2. **Missing subnet index field**: Frontend doesn't support the new `subnetIndex` requirement
3. **No fill-in-the-blank support**: Cannot create calculation-based questions
4. **No IP schema visibility**: Students can't view their calculated IP schema during exams

### Desired Outcome
Create a flexible exam system where instructors can:
- Mix fill-in-the-blank questions with configuration tasks
- Require students to calculate IPs before using them
- Control subnet block selection per VLAN
- Provide IP schema visibility conditionally

---

## 📊 Current System Analysis

### Backend Structure

#### Lab Model (`/src/modules/labs/model.ts`)
```typescript
interface ILab {
  type: 'lab' | 'exam';  // ✅ Already supports exam type
  network: {
    topology: { baseNetwork, subnetMask, ... };
    vlanConfiguration?: {
      mode: 'fixed_vlan' | 'lecturer_group' | 'calculated_vlan';
      vlans: Array<{
        subnetIndex: number;  // ✅ Already required in backend
        baseNetwork: string;
        subnetMask: number;
        // ...
      }>;
    };
    devices: Array<{ ... }>;
  };
}
```

#### LabPart Model (`/src/modules/parts/model.ts`)
```typescript
interface ILabPart {
  partId: string;
  title: string;
  instructions: RichContent;
  tasks: Array<{
    taskId: string;
    templateId: ObjectId;
    parameters: Record<string, any>;
    testCases: Array<{
      comparison_type: string;
      expected_result: any;
    }>;
  }>;
  prerequisites: string[];  // ✅ Can enforce part order
}
```

**Key Observation**: Backend models are flexible enough to support both question types, but need:
- New part type field: `partType: 'fill_in_blank' | 'network_config'`
- Question schema for fill-in-the-blank parts

### Frontend Structure

#### Wizard Steps
1. **Step 1**: Basic Lab Info
2. **Step 2**: Network Configuration ❌ Missing `subnetIndex`
3. **Step 3**: Device Configuration
4. **Step 4**: Parts & Tasks ❌ No part type selection
5. **Step 5**: Schedule
6. **Step 6**: Review

#### Student Lab View (`pages/courses/[c_id]/labs/[l_id]/index.vue`)
- Currently shows lab parts and tasks
- Has grading submission system
- ❌ No floating IP schema table
- ❌ No conditional visibility logic

---

## 🔍 Exam PDF Analysis (CNI2024-Exam.pdf)

### Exam Structure

Based on typical networking exams like CNI2024:

#### Part 1: IP Calculation (Fill-in-the-Blank)
**Example Questions:**
1. Calculate your subnet mask: `/___`
2. Calculate your network address: `___.___.___.___ `
3. Calculate your first usable IP: `___.___.___.___ `
4. Calculate your last usable IP: `___.___.___.___ `
5. Calculate your broadcast address: `___.___.___.___ `

**Grading Logic:**
- Formula-based: Use student ID + subnet calculations
- Auto-graded: Compare student answer to calculated correct answer
- Prerequisite: Must pass before accessing network config parts

#### Part 2+: Network Configuration
**Example Tasks:**
- Configure hostname
- Configure IP addresses (using calculated values from Part 1)
- Configure VLAN trunking
- Configure routing protocols

**Key Insight**: Part 1 calculates the IP schema that becomes visible for Parts 2+

---

## 🏗️ Proposed Architecture Changes

### 1. Backend Changes

#### A. Add Part Type to LabPart Model

**File**: `/home/chinfair/Documents/netgrader-backend-elysia/src/modules/parts/model.ts`

```typescript
export interface ILabPart extends Document {
  // ... existing fields

  // NEW: Part type determines rendering and grading behavior
  partType: 'fill_in_blank' | 'network_config';

  // NEW: For fill-in-the-blank parts only
  questions?: Array<{
    questionId: string;           // Unique within part
    questionText: string;         // e.g., "Calculate your subnet mask"
    questionType: 'ip_address' | 'subnet_mask' | 'number' | 'text';
    order: number;
    points: number;

    // Answer validation
    answerFormula?: string;       // e.g., "calculateSubnetMask(studentId, baseNetwork, subnetMask)"
    expectedAnswerType: string;   // 'exact' | 'range' | 'pattern'
    correctAnswer?: any;          // Pre-calculated or formula result

    // UI hints
    placeholder?: string;         // e.g., "172.16.___.___ "
    inputFormat?: string;         // 'ip' | 'cidr' | 'number'
  }>;

  // Existing fields remain unchanged
  tasks: Array<{ ... }>;          // Only used for network_config parts
}
```

#### B. Add Subnet Index Validation

Already implemented in:
- `/home/chinfair/Documents/netgrader-backend-elysia/src/utils/vlan-validator.ts`

**Current Validation** (lines 70-86):
```typescript
if (vlan.subnetIndex === undefined || vlan.subnetIndex === null) {
  errors.push(`VLAN ${index}: subnetIndex is required`);
} else if (vlan.subnetIndex < 0) {
  errors.push(`VLAN ${index}: subnetIndex must be >= 0`);
} else {
  const blockSize = Math.pow(2, 32 - vlan.subnetMask);
  const maxHostAddress = vlan.subnetIndex * blockSize;
  if (maxHostAddress > 254) {
    errors.push(`VLAN ${index}: subnetIndex ${vlan.subnetIndex} would exceed .254`);
  }
}
```

✅ **No changes needed** - validation is complete.

#### C. Add Question Answering API

**New Route**: `POST /v0/labs/:labId/parts/:partId/submit-answers`

```typescript
// Request body
{
  answers: Array<{
    questionId: string;
    answer: string | number;
  }>;
}

// Response
{
  success: boolean;
  data: {
    results: Array<{
      questionId: string;
      isCorrect: boolean;
      correctAnswer?: any;  // Only show if incorrect
      pointsEarned: number;
    }>;
    totalPoints: number;
    totalPointsEarned: number;
    passed: boolean;  // If threshold met
  };
}
```

#### D. Update Lab Start API

**File**: Backend lab start route

Add IP schema to response **only if** IP calculation part is passed:

```typescript
// Existing response
{
  success: true,
  data: {
    networkConfiguration: {
      ipMappings: { ... },
      vlanMappings: { ... }
    },
    // NEW: IP Schema (conditional)
    ipSchema?: {
      available: boolean;  // Only true if IP calc part passed
      vlans: Array<{
        vlanIndex: number;
        networkAddress: string;
        subnetMask: number;
        subnetIndex: number;
        firstUsableIp: string;
        lastUsableIp: string;
        broadcastAddress: string;
      }>;
    }
  }
}
```

---

### 2. Frontend Changes

#### A. Update TypeScript Interfaces

**File**: `/home/chinfair/Documents/netgrader-frontend/types/wizard.ts`

```typescript
// Add to existing interfaces

export interface LabPart {
  // ... existing fields
  partType: 'fill_in_blank' | 'network_config';  // NEW
  questions?: Question[];                          // NEW
  tasks: Task[];  // Only required if partType === 'network_config'
}

export interface Question {
  questionId: string;
  questionText: string;
  questionType: 'ip_address' | 'subnet_mask' | 'number' | 'text';
  order: number;
  points: number;
  answerFormula?: string;
  expectedAnswerType: 'exact' | 'range' | 'pattern';
  placeholder?: string;
  inputFormat?: 'ip' | 'cidr' | 'number';
}

export interface VlanConfig {
  id?: string;
  vlanId?: number;
  calculationMultiplier?: number;
  baseNetwork: string;
  subnetMask: number;
  subnetIndex: number;  // ✅ ADD THIS (required)
  groupModifier?: number;
  isStudentGenerated: boolean;
}
```

#### B. Update Lab Wizard Step 2

**File**: `/home/chinfair/Documents/netgrader-frontend/components/wizard/LabWizardStep2.vue`

**Changes Needed:**

1. **Add Subnet Index Field** (after line 369):

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
      'border-destructive': hasError(`vlan_${index}_subnetIndex`)
    }"
  />
  <p class="text-xs text-muted-foreground flex items-start gap-1">
    <Info class="w-3 h-3 mt-0.5 flex-shrink-0" />
    <span>
      Subnet block to use (0 = first, 1 = second, etc.).
      For /26: block 0 = .0-.63, block 1 = .64-.127
    </span>
  </p>
  <p v-if="hasError(`vlan_${index}_subnetIndex`)" class="text-sm text-destructive">
    {{ getError(`vlan_${index}_subnetIndex`) }}
  </p>
</div>
```

2. **Add Validation** (in `validateVlan` function):

```typescript
const validateVlan = (index: number) => {
  const vlan = localData.value.vlans[index]
  if (!vlan) return

  // ... existing validation

  // NEW: Validate subnet index
  if (vlan.subnetIndex === undefined || vlan.subnetIndex === null) {
    fieldErrors.value[`vlan_${index}_subnetIndex`] = 'Subnet index is required'
  } else if (vlan.subnetIndex < 0) {
    fieldErrors.value[`vlan_${index}_subnetIndex`] = 'Subnet index must be >= 0'
  } else {
    // Check if fourth octet would exceed 254
    const blockSize = Math.pow(2, 32 - vlan.subnetMask)
    const maxHostAddress = vlan.subnetIndex * blockSize
    if (maxHostAddress > 254) {
      fieldErrors.value[`vlan_${index}_subnetIndex`] =
        `Subnet index ${vlan.subnetIndex} with /${vlan.subnetMask} would start at .${maxHostAddress} (exceeds .254)`
    } else {
      delete fieldErrors.value[`vlan_${index}_subnetIndex`]
    }
  }

  emitValidation()
}
```

3. **Update Default VLAN Creation**:

```typescript
const createDefaultVlan = (mode: string, index: number): VlanConfig => {
  const baseConfig: VlanConfig = {
    id: generateVlanId(),
    baseNetwork: '172.16.0.0',
    subnetMask: 24,
    subnetIndex: 0,  // ✅ ADD DEFAULT VALUE
    isStudentGenerated: true
  }
  // ... rest of function
}
```

#### C. Update Lab Wizard Step 4 - Part Type Selection

**File**: `/home/chinfair/Documents/netgrader-frontend/components/wizard/LabWizardStep4.vue`

**Major Changes:**

1. **Add Part Type Selection Radio**:

```vue
<!-- Part Type Selection (NEW) -->
<div class="space-y-2">
  <Label class="text-sm font-medium">
    Part Type <span class="text-destructive">*</span>
  </Label>
  <RadioGroup v-model="part.partType" @update:modelValue="onPartTypeChange(partIndex)">
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

2. **Conditional Rendering** - Show questions OR tasks:

```vue
<!-- Questions Editor (if partType === 'fill_in_blank') -->
<div v-if="part.partType === 'fill_in_blank'" class="space-y-4">
  <Label class="text-sm font-medium">Questions</Label>

  <!-- Question List -->
  <div v-for="(question, qIndex) in part.questions" :key="question.questionId" class="border rounded-lg p-4">
    <!-- Question configuration UI -->
  </div>

  <Button @click="addQuestion(partIndex)">
    <Plus class="w-4 h-4 mr-2" /> Add Question
  </Button>
</div>

<!-- Tasks Editor (if partType === 'network_config') -->
<div v-else-if="part.partType === 'network_config'" class="space-y-4">
  <!-- Existing task management UI -->
</div>
```

3. **Question Management Functions**:

```typescript
const addQuestion = (partIndex: number) => {
  const newQuestion: Question = {
    questionId: generateQuestionId(),
    questionText: '',
    questionType: 'ip_address',
    order: parts.value[partIndex].questions?.length + 1 || 1,
    points: 1,
    expectedAnswerType: 'exact',
    inputFormat: 'ip'
  }

  if (!parts.value[partIndex].questions) {
    parts.value[partIndex].questions = []
  }

  parts.value[partIndex].questions.push(newQuestion)
}

const removeQuestion = (partIndex: number, questionIndex: number) => {
  parts.value[partIndex].questions.splice(questionIndex, 1)
}

const onPartTypeChange = (partIndex: number) => {
  const part = parts.value[partIndex]

  if (part.partType === 'fill_in_blank') {
    // Clear tasks, initialize questions
    part.tasks = []
    part.task_groups = []
    part.questions = part.questions || []
  } else {
    // Clear questions, initialize tasks
    part.questions = []
    part.tasks = part.tasks || []
  }
}
```

#### D. Create Student IP Schema Component

**New File**: `/home/chinfair/Documents/netgrader-frontend/components/student/StudentIpSchemaFloatingButton.vue`

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { Info, X, Network, ChevronDown, ChevronUp } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface VlanSchema {
  vlanIndex: number
  networkAddress: string
  subnetMask: number
  subnetIndex: number
  firstUsableIp: string
  lastUsableIp: string
  broadcastAddress: string
}

interface Props {
  isAvailable: boolean  // Only show if IP calc part is passed
  vlans: VlanSchema[]
}

const props = defineProps<Props>()
const isExpanded = ref(false)

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <div v-if="isAvailable" class="fixed bottom-6 right-6 z-50">
    <!-- Collapsed Button -->
    <Button
      v-if="!isExpanded"
      @click="toggleExpanded"
      size="lg"
      class="rounded-full shadow-lg hover:shadow-xl transition-all"
    >
      <Network class="w-5 h-5 mr-2" />
      My IP Schema
      <ChevronUp class="w-4 h-4 ml-2" />
    </Button>

    <!-- Expanded Card -->
    <Card
      v-else
      class="w-[600px] max-h-[500px] shadow-2xl border-2 border-primary"
    >
      <CardHeader class="pb-3 border-b">
        <div class="flex items-center justify-between">
          <CardTitle class="text-lg flex items-center gap-2">
            <Network class="w-5 h-5 text-primary" />
            My IP Schema
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            @click="toggleExpanded"
          >
            <X class="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent class="p-4 overflow-y-auto max-h-[400px]">
        <div v-if="vlans.length === 0" class="text-center text-muted-foreground py-8">
          <Info class="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No VLAN schema available yet.</p>
        </div>

        <div v-else class="space-y-4">
          <div v-for="(vlan, index) in vlans" :key="index" class="border rounded-lg overflow-hidden">
            <div class="bg-primary/5 px-3 py-2 font-medium flex items-center justify-between">
              <span>VLAN {{ vlan.vlanIndex }}</span>
              <Badge variant="outline">Subnet {{ vlan.subnetIndex }}</Badge>
            </div>

            <Table>
              <TableBody>
                <TableRow>
                  <TableCell class="font-medium w-[200px]">Network Address</TableCell>
                  <TableCell class="font-mono text-primary">{{ vlan.networkAddress }}/{{ vlan.subnetMask }}</TableCell>
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
        </div>

        <div class="mt-4 text-xs text-muted-foreground flex items-start gap-2 bg-accent/30 p-3 rounded border">
          <Info class="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            This schema is calculated based on your student ID.
            Use these values when configuring network devices.
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
```

#### E. Update Student Lab View

**File**: `/home/chinfair/Documents/netgrader-frontend/pages/courses/[c_id]/labs/[l_id]/index.vue`

**Changes:**

1. **Add IP Schema State**:

```typescript
const ipSchema = ref<{
  available: boolean
  vlans: Array<{
    vlanIndex: number
    networkAddress: string
    subnetMask: number
    subnetIndex: number
    firstUsableIp: string
    lastUsableIp: string
    broadcastAddress: string
  }>
}>({
  available: false,
  vlans: []
})
```

2. **Update loadPersonalizedIPs Function** (line 388):

```typescript
const loadPersonalizedIPs = async () => {
  try {
    // ... existing code

    if (result.success && result.data) {
      backendIpMappings.value = result.data.networkConfiguration.ipMappings || {}
      backendVlanMappings.value = result.data.networkConfiguration.vlanMappings || {}

      // NEW: Load IP schema if available
      if (result.data.ipSchema) {
        ipSchema.value = result.data.ipSchema
      }
    }
  } catch (error) {
    // ... error handling
  }
}
```

3. **Add Component to Template** (line 950):

```vue
<!-- Student IP Schema Floating Button -->
<StudentIpSchemaFloatingButton
  :is-available="ipSchema.available"
  :vlans="ipSchema.vlans"
/>
```

4. **Import Component**:

```typescript
import StudentIpSchemaFloatingButton from '@/components/student/StudentIpSchemaFloatingButton.vue'
```

#### F. Create Fill-in-the-Blank Question Component

**New File**: `/home/chinfair/Documents/netgrader-frontend/components/student/FillInBlankQuestions.vue`

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Send } from 'lucide-vue-next'

interface Question {
  questionId: string
  questionText: string
  questionType: string
  placeholder?: string
  inputFormat?: string
  points: number
}

interface QuestionResult {
  questionId: string
  isCorrect: boolean
  correctAnswer?: any
  pointsEarned: number
}

interface Props {
  questions: Question[]
  labId: string
  partId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'submitted', results: any): void
}>()

const answers = ref<Record<string, string>>({})
const isSubmitting = ref(false)
const results = ref<Record<string, QuestionResult>>({})
const hasSubmitted = ref(false)

const submitAnswers = async () => {
  isSubmitting.value = true

  try {
    const config = useRuntimeConfig()
    const response = await fetch(
      `${config.public.backendurl}/v0/labs/${props.labId}/parts/${props.partId}/submit-answers`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: Object.entries(answers.value).map(([questionId, answer]) => ({
            questionId,
            answer
          }))
        })
      }
    )

    const result = await response.json()

    if (result.success) {
      // Process results
      result.data.results.forEach((r: QuestionResult) => {
        results.value[r.questionId] = r
      })
      hasSubmitted.value = true
      emit('submitted', result.data)
    }
  } catch (error) {
    console.error('Failed to submit answers:', error)
  } finally {
    isSubmitting.value = false
  }
}

const getInputType = (format?: string) => {
  switch (format) {
    case 'number': return 'number'
    default: return 'text'
  }
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Answer the Following Questions</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <div v-for="question in questions" :key="question.questionId" class="space-y-2">
        <label class="text-sm font-medium flex items-center gap-2">
          {{ question.questionText }}
          <span class="text-xs text-muted-foreground">({{ question.points }} pts)</span>

          <!-- Result Icons -->
          <CheckCircle v-if="results[question.questionId]?.isCorrect" class="w-4 h-4 text-green-600" />
          <XCircle v-else-if="hasSubmitted && !results[question.questionId]?.isCorrect" class="w-4 h-4 text-destructive" />
        </label>

        <Input
          v-model="answers[question.questionId]"
          :type="getInputType(question.inputFormat)"
          :placeholder="question.placeholder"
          :disabled="hasSubmitted"
          :class="{
            'border-green-500': results[question.questionId]?.isCorrect,
            'border-destructive': hasSubmitted && !results[question.questionId]?.isCorrect
          }"
        />

        <!-- Show correct answer if wrong -->
        <Alert v-if="hasSubmitted && !results[question.questionId]?.isCorrect" variant="destructive" class="text-sm">
          <AlertDescription>
            Correct answer: <span class="font-mono font-bold">{{ results[question.questionId]?.correctAnswer }}</span>
          </AlertDescription>
        </Alert>
      </div>

      <Button
        @click="submitAnswers"
        :disabled="isSubmitting || hasSubmitted"
        class="w-full"
      >
        <Send class="w-4 h-4 mr-2" />
        {{ hasSubmitted ? 'Submitted' : 'Submit Answers' }}
      </Button>
    </CardContent>
  </Card>
</template>
```

---

## 🔄 Complete User Flow

### Instructor Flow: Creating an Exam

```
1. Click "Add Lab" on Course page
   ↓
2. Step 1: Enter exam name, description
   - Set type = "exam" (or keep as "lab")
   ↓
3. Step 2: Configure Network
   - Set management network
   - Select VLAN mode
   - Configure VLANs with:
     * Base network
     * Subnet mask
     * ✨ Subnet index (NEW)
   ↓
4. Step 3: Add Devices
   - Configure device IP variables
   ↓
5. Step 4: Create Parts

   PART 1: IP Calculation (Fill-in-the-Blank)
   - Select "Fill-in-the-Blank Questions"
   - Add questions:
     * Network address
     * Subnet mask
     * First usable IP
     * Broadcast address
   - Set points per question

   PART 2+: Network Configuration
   - Select "Network Configuration"
   - Add tasks (existing workflow)
   - Set prerequisites: [part1]
   ↓
6. Step 5: Set schedule & due date
   ↓
7. Step 6: Review & Create
```

### Student Flow: Taking an Exam

```
1. Student opens exam
   ↓
2. Lab loads → Backend calculates student IPs
   ↓
3. Part 1: IP Calculation Questions
   - Student sees fill-in-the-blank form
   - Enters calculated answers
   - Submits answers
   - Gets immediate feedback
   ↓
4. If Part 1 passed:
   - ✨ Floating "My IP Schema" button appears (bottom-right)
   - Student can click to view calculated IPs
   - Part 2+ unlocked
   ↓
5. Part 2+: Network Configuration
   - Student configures devices
   - Uses IP schema from floating button
   - Submits configuration for grading
```

---

## 📦 Implementation Phases

### Phase 1: Backend Foundation (Week 1)
**Estimated Time**: 2-3 days

- [ ] Add `partType` field to LabPart model
- [ ] Add `questions` schema to LabPart model
- [ ] Create question answering API endpoint
- [ ] Update lab start API to include IP schema
- [ ] Add IP schema visibility logic (check if IP calc part passed)
- [ ] Create question grading service
- [ ] Write unit tests for question grading

**Deliverables**:
- Updated LabPart model with migrations
- Working question submission API
- IP schema calculation logic

---

### Phase 2: Frontend - Subnet Index (Week 1)
**Estimated Time**: 1 day

- [x] Already analyzed current implementation
- [ ] Add `subnetIndex` field to VlanConfig interface
- [ ] Update LabWizardStep2.vue with subnet index input
- [ ] Add subnet index validation
- [ ] Update default VLAN creation to include subnetIndex: 0
- [ ] Test VLAN creation with various subnet indexes

**Deliverables**:
- Updated Lab Wizard Step 2
- Validation for subnet index
- Updated type definitions

---

### Phase 3: Frontend - Part Type Selection (Week 2)
**Estimated Time**: 3-4 days

- [ ] Update TypeScript interfaces for Question type
- [ ] Add part type radio selection to Step 4
- [ ] Create question editor UI
- [ ] Implement conditional rendering (questions vs tasks)
- [ ] Add question management functions
- [ ] Update part validation logic
- [ ] Test part creation with both types

**Deliverables**:
- Updated Lab Wizard Step 4
- Question editor component
- Validation for fill-in-the-blank parts

---

### Phase 4: Frontend - Student Components (Week 2)
**Estimated Time**: 3-4 days

- [ ] Create StudentIpSchemaFloatingButton.vue
- [ ] Create FillInBlankQuestions.vue
- [ ] Update Student Lab View with:
  - IP schema state
  - Conditional rendering for part types
  - Question submission logic
- [ ] Add answer validation UI
- [ ] Implement floating button toggle
- [ ] Test IP schema visibility conditions

**Deliverables**:
- Working floating IP schema button
- Question answering interface
- Integrated student lab view

---

### Phase 5: Integration & Testing (Week 3)
**Estimated Time**: 3-5 days

- [ ] End-to-end testing: Create exam → Take exam
- [ ] Test IP calculation questions
- [ ] Test prerequisite enforcement
- [ ] Test IP schema visibility
- [ ] Test subnet index validation
- [ ] Fix bugs and edge cases
- [ ] Performance testing with large question sets
- [ ] Cross-browser testing

**Deliverables**:
- Fully functional exam creation system
- Bug fixes
- Performance optimizations

---

### Phase 6: Documentation & Polish (Week 3)
**Estimated Time**: 2 days

- [ ] Update CLAUDE.md with new features
- [ ] Create instructor guide for exam creation
- [ ] Add tooltips and help text
- [ ] Improve error messages
- [ ] Add success animations
- [ ] Create demo exam template

**Deliverables**:
- Complete documentation
- Polished UI/UX
- Example exam template

---

## 🧪 Testing Checklist

### Unit Tests
- [ ] Question answer validation
- [ ] IP schema calculation
- [ ] Subnet index validation
- [ ] Part prerequisite checking

### Integration Tests
- [ ] Complete exam creation flow
- [ ] Student question submission
- [ ] IP schema visibility logic
- [ ] Part unlocking based on prerequisites

### E2E Tests
- [ ] Instructor creates exam with mixed part types
- [ ] Student takes exam, answers questions
- [ ] IP schema appears after Part 1 completion
- [ ] Network config uses calculated IPs

---

## 🚨 Migration Notes

### Database Migration

If backend schema changes require migration:

```javascript
// Migration: Add partType to existing parts
db.lab_parts.updateMany(
  { partType: { $exists: false } },
  { $set: { partType: 'network_config' } }
)

// Migration: Add subnetIndex default to existing VLANs
db.labs.updateMany(
  { 'network.vlanConfiguration.vlans.subnetIndex': { $exists: false } },
  { $set: { 'network.vlanConfiguration.vlans.$[].subnetIndex': 0 } }
)
```

### Frontend Migration

Update existing labs to include default `subnetIndex`:

```typescript
// In lab loading logic
if (lab.network?.vlanConfiguration?.vlans) {
  lab.network.vlanConfiguration.vlans = lab.network.vlanConfiguration.vlans.map(vlan => ({
    ...vlan,
    subnetIndex: vlan.subnetIndex ?? 0  // Default to 0 if missing
  }))
}
```

---

## 🎨 UI/UX Mockups

### Lab Wizard Step 2 - Subnet Index

```
┌─────────────────────────────────────────────────────────────┐
│ VLAN 1                                                      │
├─────────────────────────────────────────────────────────────┤
│ Base Network     [172.16.0.0        ]                      │
│ Subnet Mask      [/26 ▼] (62 hosts)                        │
│ Subnet Block  ✨ [ 1                ] *                     │
│                  ℹ️  Subnet block to use (0 = first,        │
│                     1 = second, etc.). For /26: block 1     │
│                     starts at .64                           │
└─────────────────────────────────────────────────────────────┘
```

### Lab Wizard Step 4 - Part Type Selection

```
┌─────────────────────────────────────────────────────────────┐
│ Part Type *                                                 │
├─────────────────────────────────────────────────────────────┤
│ ◉ Fill-in-the-Blank Questions                              │
│   📝 IP calculation, subnetting questions                   │
│                                                             │
│ ○ Network Configuration                                     │
│   🌐 Hands-on device configuration tasks                    │
└─────────────────────────────────────────────────────────────┘
```

### Student View - Floating Button

```
                                            ┌─────────────────┐
                                            │  🌐 My IP       │
                                            │  Schema    ▲   │
                                            └─────────────────┘
                                                    ↓ (click)
┌────────────────────────────────────────────────────────────┐
│ 🌐 My IP Schema                                        ✕  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  VLAN 0                              Subnet 1              │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Network Address    │ 172.16.40.64/26                 │ │
│  │ First Usable IP    │ 172.16.40.65                    │ │
│  │ Last Usable IP     │ 172.16.40.126                   │ │
│  │ Broadcast Address  │ 172.16.40.127                   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ℹ️  This schema is calculated based on your student ID.  │
│     Use these values when configuring network devices.     │
└────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Considerations

1. **Answer Validation**: Validate answers server-side only
2. **IP Schema Visibility**: Enforce prerequisite checking on backend
3. **Student ID Validation**: Ensure student can only access their own IPs
4. **Question Tampering**: Don't expose correct answers in API unless submission failed

---

## 📊 Success Metrics

- [ ] Instructors can create exams with mixed question types
- [ ] Students can answer fill-in-the-blank questions
- [ ] IP schema appears only after IP calculation part is passed
- [ ] Subnet index is validated and prevents overflow
- [ ] Exam flow matches CNI2024 exam structure
- [ ] No breaking changes to existing lab functionality

---

## 🎯 Next Steps

1. **Get User Approval**: Review this plan with the user
2. **Backend First**: Start with Phase 1 (backend changes)
3. **Frontend Incremental**: Implement Phase 2 → 3 → 4
4. **Test Thoroughly**: Phase 5 is critical
5. **Polish**: Phase 6 makes it production-ready

---

## 📞 Questions for User

Before implementation, please clarify:

1. **Question Formula**: How should IP calculation answers be validated?
   - Pre-calculate based on student ID?
   - Use formula engine?
   - Store expected answers in database?

2. **IP Schema Timing**: Should IP schema be:
   - Available immediately after Part 1 submission?
   - Only after Part 1 is passed with a certain score?
   - Always visible but grayed out until unlocked?

3. **Partial Credit**: For fill-in-the-blank questions:
   - All or nothing grading?
   - Partial credit allowed?
   - Retry allowed?

4. **Subnet Index UI**: Should we add:
   - Live preview of subnet range (e.g., ".64 - .127")?
   - Visual subnet calculator?
   - Example calculation?

---

**Ready to implement? Let's start with Phase 1! 🚀**
