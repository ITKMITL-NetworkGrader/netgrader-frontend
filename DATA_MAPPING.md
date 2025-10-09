# LabResultsModal Data Mapping

This document shows exactly what data is used in `LabResultsModal.vue` and where it's defined in the schema.

## Data Sources

### Primary Data: `ISubmission[]` (from `types/submission.ts`)

## Field Mapping

### From `ISubmission` interface
Located in: `types/submission.ts:75-101`

| Field Used in Component | Schema Definition | Line in types/submission.ts |
|------------------------|-------------------|----------------------------|
| `submission.partId` | `partId: string` | Line 78 |
| `submission.attempt` | `attempt: number` | Line 94 |
| `submission.submittedAt` | `submittedAt: Date` | Line 83 |
| `submission.gradingResult` | `gradingResult?: IGradingResult` | Line 88 |

### From `IGradingResult` interface
Located in: `types/submission.ts:52-64`

| Field Used in Component | Schema Definition | Line |
|------------------------|-------------------|------|
| `gradingResult.total_points_earned` | `total_points_earned: number` | Line 55 |
| `gradingResult.total_points_possible` | `total_points_possible: number` | Line 56 |
| `gradingResult.total_execution_time` | `total_execution_time: number` | Line 59 |
| `gradingResult.test_results` | `test_results: ITestResult[]` | Line 57 |
| `gradingResult.group_results` | `group_results: IGroupResult[]` | Line 58 |

### From `ITestResult` interface
Located in: `types/submission.ts:24-36`

| Field Used in Component | Schema Definition | Line |
|------------------------|-------------------|------|
| `test.test_name` | `test_name: string` | Line 25 |
| `test.status` | `status: 'passed' \| 'failed' \| 'error'` | Line 26 |
| `test.message` | `message: string` | Line 27 |
| `test.points_earned` | `points_earned: number` | Line 28 |
| `test.points_possible` | `points_possible: number` | Line 29 |
| `test.test_case_results` | `test_case_results: ITestCaseResult[]` | Line 31 |

### From `ITestCaseResult` interface
Located in: `types/submission.ts:4-13`

| Field Used in Component | Schema Definition | Line |
|------------------------|-------------------|------|
| `testCase.description` | `description: string` | Line 5 |
| `testCase.expected_value` | `expected_value: any` | Line 6 |
| `testCase.actual_value` | `actual_value: any` | Line 7 |
| `testCase.status` | `status: 'passed' \| 'failed' \| 'error'` | Line 9 |
| `testCase.message` | `message: string` | Line 12 |

### From `IGroupResult` interface
Located in: `types/submission.ts:38-50`

| Field Used in Component | Schema Definition | Line |
|------------------------|-------------------|------|
| `group.title` | `title: string` | Line 40 |
| `group.group_type` | `group_type: string` | Line 42 |
| `group.points_earned` | `points_earned: number` | Line 43 |
| `group.points_possible` | `points_possible: number` | Line 44 |
| `group.message` | `message: string` | Line 47 |

## Data Flow

1. **Component receives**: `submissions: ISubmission[]` and `labParts: LabPart[]`

2. **Computed property `partResults`** (lines 241-306 in LabResultsModal.vue):
   - Loops through `labParts`
   - For each part, filters submissions by `partId`
   - Gets the latest submission (highest `attempt` number)
   - Extracts data from `submission.gradingResult`

3. **Template displays**:
   - Overall stats from aggregated `partResults`
   - Per-part breakdown in accordion
   - Test results from `gradingResult.test_results[]`
   - Test case details from `test.test_case_results[]`
   - Group results from `gradingResult.group_results[]`

## Verification Method

All fields were verified by reading `types/submission.ts` (lines 1-148) which contains:
- ✅ `ITestCaseResult` interface
- ✅ `IDebugInfo` interface
- ✅ `ITestResult` interface
- ✅ `IGroupResult` interface
- ✅ `IGradingResult` interface
- ✅ `ISubmission` interface

The types are also imported and used in `composables/useSubmissions.ts` which fetches the actual data from the backend API endpoint: `/v0/submissions/student/{studentId}?labId={labId}`

## Safety Checks in Code

The component includes null/undefined checks:

```typescript
// Line 245: Check if part has submissions
if (partSubmissions.length === 0) {
  // Return default empty result
}

// Line 256: Safe access to gradingResult
const gradingResult = latestSubmission.gradingResult

// Line 262-264: Use optional chaining and defaults
pointsEarned: gradingResult?.total_points_earned || 0,
pointsPossible: gradingResult?.total_points_possible || part.totalPoints || 0,
```

All fields accessed are guaranteed to exist per the TypeScript interfaces.
