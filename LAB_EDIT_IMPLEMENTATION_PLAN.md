# Lab Edit Page - Implementation Plan

## 📋 Overview

This document outlines the comprehensive plan for implementing a Lab Edit page that reuses existing Lab Wizard components to minimize code duplication and token usage.

---

## Architecture Overview

The existing Lab Wizard has:
- **6 steps**: Basic Info → Network Config → Devices → Parts & Tasks → Schedule → Review
- **Reusable components**: `LabWizardStep1.vue` through `LabWizardStep6.vue`
- **Wizard data structure**: Reactive object with all lab configuration
- **API endpoints**: Creates lab first, then creates parts

---

## API Endpoints

### Lab Update
- **Endpoint**: `PUT {backendurl}/v0/labs/{id}`
- **Purpose**: Update lab basic info, network config, devices
- **Request**: Same structure as create endpoint

### Part Update
- **Endpoint**: `PUT {backendurl}/v0/parts/{id}`
- **Purpose**: Update individual lab parts
- **Request**: Same structure as create endpoint
- **Note**: When updating a lab, all lab parts should be updated together

### Part Deletion
- **Endpoint**: `DELETE {backendurl}/v0/parts/{id}`
- **Purpose**: Delete a lab part
- **Use case**: Remove parts that are no longer needed
- **✅ CASCADE DELETE IMPLEMENTED**: Backend automatically deletes associated submissions
  - When a part is deleted, all submissions for that part are automatically removed
  - Prevents orphaned submissions in the database
  - Returns deletion stats in response: `{ deletionStats: { submissionsDeleted: number } }`
  - Frontend can show user: "Deleted part and X student submissions"

---

## Implementation Plan - Step by Step

### Phase 1: Setup & Data Loading 🎯

#### Step 1.1: Create Edit Page Route
- **File**: `/pages/courses/[c_id]/labs/[l_id]/edit.vue`
- **Actions**:
  - Copy structure from `create.vue`
  - Update breadcrumb to show "Edit Lab"
  - Update header title from "Create New Lab" to "Edit Lab"
  - Change button text from "Create" to "Update Lab"

#### Step 1.2: Fetch Existing Lab Data
- **Use existing composables**:
  - `useCourseLabs` for lab operations
  - `fetchLabById(labId)` to get lab details
  - `fetchLabParts(labId)` to get all parts
- **Additional data needed**:
  - Device templates (for step 3)
  - Task templates (for step 4)

#### Step 1.3: Transform Backend Data to Wizard Format
- **Lab data mapping**:
  - `title` → `basicInfo.name`
  - `description` → `basicInfo.description`
  - `network.topology` → `networkConfig`
  - `network.devices` → `devices` array
  - Schedule fields → `schedule` object

- **Parts data mapping**:
  - Parts array → `wizardData.parts`
  - Tasks within parts → nested task structure
  - Task groups → `task_groups` array

- **Handle complex fields**:
  - IP variables per device
  - VLAN configuration
  - Task parameters and test cases

---

### Phase 2: Reuse Wizard Components 🔄

#### Step 2.1: Component Reuse Strategy
- ✅ **No changes needed** to `LabWizardStep1` through `LabWizardStep6`
- ✅ Components already work with `v-model`
- ✅ Just need to pre-populate the `wizardData` reactive object
- ✅ Validation logic works as-is

#### Step 2.2: Update Page Metadata
- Change page title: "Create Lab" → "Edit Lab"
- Update breadcrumb navigation
- Change action button: "Create" → "Update Lab"
- Keep same 6-step progression UI

---

### Phase 3: Update API Logic 🔌

#### Step 3.1: Create Update Function for Lab
```typescript
const updateLab = async (labId: string, labData: LabUpdateRequest) => {
  const response = await fetch(`${backendUrl}/v0/labs/${labId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(labData)
  })
  // Handle response
}
```

#### Step 3.2: Create Update Function for Parts
```typescript
const updatePart = async (partId: string, partData: PartUpdateRequest) => {
  const response = await fetch(`${backendUrl}/v0/parts/${partId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partData)
  })
  // Handle response
}
```

#### Step 3.3: Create Delete Function for Parts
```typescript
const deletePart = async (partId: string) => {
  const response = await fetch(`${backendUrl}/v0/parts/${partId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  })
  // Handle response
}
```

#### Step 3.4: Implement Coordinated Update
- **Flow**:
  1. Update lab first with `PUT /v0/labs/{id}`
  2. Track original parts vs current parts to determine:
     - **New parts**: Parts in wizardData without `_id` → Create with `POST /v0/parts`
     - **Updated parts**: Parts with `_id` that exist in original → Update with `PUT /v0/parts/{id}`
     - **Deleted parts**: Parts in original but not in wizardData → Delete with `DELETE /v0/parts/{id}`
  3. Execute all part operations
  4. Show progress for each operation

- **Part deletion flow**:
  ```typescript
  // Compare original parts with current parts
  const deletedPartIds = originalParts
    .filter(origPart => !wizardData.parts.some(p => p._id === origPart._id))
    .map(p => p._id)

  // Delete each removed part
  for (const partId of deletedPartIds) {
    await deletePart(partId)
  }
  ```

- **Error handling**:
  - Rollback strategy if updates fail
  - Show progress indicator for each operation
  - Display specific error messages
  - If part deletion fails, show warning (may have student submissions)

---

### Phase 4: State Management 📦

#### Step 4.1: Track Original vs Modified Data
- Keep reference to original lab data
- Track which fields changed
- Optimization: Only update modified parts
- Prevent unnecessary API calls

#### Step 4.2: Handle Validation
- Reuse existing step validation logic
- Ensure all steps pass before update
- Show validation errors on affected steps
- Prevent navigation to next step if invalid

---

### Phase 5: User Experience ✨

#### Step 5.1: Loading States
- **Initial load**:
  - Show loading spinner while fetching lab data
  - Skeleton loaders for wizard steps
  - Disable navigation during load

- **During update**:
  - Disable all form inputs
  - Show progress indicator
  - Display "Updating lab..." message

#### Step 5.2: Success/Error Handling
- **Success**:
  - Show success toast/notification
  - Redirect to lab view page: `/courses/{c_id}/labs/{l_id}`
  - Display confirmation message

- **Error**:
  - Show error message with details
  - Stay on edit page
  - Allow user to retry
  - Highlight validation errors on specific steps

#### Step 5.3: Save Draft Functionality
- Reuse existing draft save logic
- Store in localStorage with unique key: `lab-edit-draft-${labId}`
- Different from create drafts: `lab-create-draft-${courseId}`
- Auto-save every N seconds
- Restore draft on page reload

---

## Detailed Step-by-Step Execution Order

Here's the order for implementation (one at a time, waiting for approval):

1. ✅ **Create edit page skeleton**
   - Copy `create.vue` to `[l_id]/edit.vue`
   - Update titles, breadcrumbs, button text
   - Verify routing works

2. ✅ **Add data loading logic**
   - Fetch lab and parts on page mount
   - Show loading state with skeleton UI
   - Handle loading errors

3. ✅ **Transform data**
   - Map backend lab data to `wizardData` format
   - Handle all nested structures (devices, parts, tasks)
   - Test data loads correctly in wizard steps

4. ✅ **Update API functions**
   - Create `updateLab()` function
   - Create `updatePart()` function
   - Test API calls with dummy data

5. ✅ **Wire up update logic**
   - Replace `handleCreateLab()` with `handleUpdateLab()`
   - Implement coordinated lab + parts update
   - Add progress tracking

6. ✅ **Test and refinement**
   - Build and test complete flow
   - Fix any bugs or issues
   - Test edge cases (validation, errors, etc.)

---

## Questions for Clarification

### 1. Part Deletion ✅ RESOLVED (CASCADE DELETE IMPLEMENTED)
- **Question**: Should we allow deleting parts in edit mode?
- **Answer**: YES - DELETE endpoint is available at `DELETE {backendurl}/v0/parts/{id}`
- **Implementation**: Track original parts and compare with modified parts to detect deletions
- **✅ Backend Enhancement**: CASCADE DELETE automatically removes associated submissions
  - When a part is deleted, all student submissions are also deleted
  - No orphaned data in database
  - Response includes deletion stats for user feedback
  - Frontend can show: "Part deleted successfully. X student submissions were also removed."

### 2. Device Changes Impact
- **Question**: If devices are modified, should we warn about impact on existing student submissions?
- **Consideration**: Changing devices/IPs could affect grading
- **Recommendation**: Show warning modal if devices are modified

### 3. Draft Naming Strategy
- **Question**: Should drafts for edit be separate from create drafts?
- **Recommendation**: Yes, use different localStorage keys:
  - Create: `lab-create-draft-${courseId}`
  - Edit: `lab-edit-draft-${labId}`

### 4. Post-Update Navigation
- **Question**: After successful update, where should user go?
- **Options**:
  - **Option A**: Lab view page (see the updated lab)
  - **Option B**: Course page (see all labs)
  - **Option C**: Stay on edit page with success message
- **Recommendation**: Option A - redirect to lab view page

---

## Estimated Token Usage per Step

- **Step 1** (Skeleton): ~5k tokens
- **Step 2** (Data loading): ~8k tokens
- **Step 3** (Data transformation): ~10k tokens
- **Step 4** (API functions): ~8k tokens
- **Step 5** (Wire up update): ~6k tokens
- **Step 6** (Testing): ~3k tokens

**Total**: ~40k tokens (well within budget)

---

## Benefits of This Approach

✅ **Maximum reuse** - All 6 wizard components used as-is without modification
✅ **Consistent UX** - Edit looks and works exactly like create
✅ **Minimal code** - Only page container and API calls differ
✅ **Easy maintenance** - Changes to wizard components benefit both create and edit
✅ **Token efficient** - Reusing existing components saves significant tokens
✅ **Reduced bugs** - Less new code means fewer places for bugs to hide
✅ **Faster development** - Building on existing, tested components

---

## Technical Notes

### Data Structure Mapping

#### Lab Data (Backend → Frontend)
```typescript
// Backend lab structure
{
  _id: string
  courseId: string
  title: string  // → wizardData.basicInfo.name
  description: string  // → wizardData.basicInfo.description
  network: {
    topology: {
      baseNetwork: string  // → wizardData.networkConfig.managementNetwork
      subnetMask: number  // → wizardData.networkConfig.managementSubnetMask
      // ... more fields
    }
    devices: Array<{
      deviceId: string
      templateId: string
      ipVariables: Array<{name: string, hostOffset: number}>
    }>
  }
  dueDate?: Date  // → wizardData.schedule.dueDate
  availableFrom?: Date  // → wizardData.schedule.availableFrom
  availableUntil?: Date  // → wizardData.schedule.availableUntil
}
```

#### Parts Data (Backend → Frontend)
```typescript
// Backend part structure
{
  _id: string
  labId: string
  partId: string
  title: string
  description?: string
  instructions: string
  order: number
  tasks: Array<Task>
  task_groups: Array<TaskGroup>
  prerequisites: string[]
  totalPoints: number
}
```

### Error Scenarios to Handle

1. **Lab not found**: Show 404 error
2. **Permission denied**: User not instructor/TA of course
3. **Lab already in use**: Students have submissions (show warning)
4. **Network error**: API call fails (show retry option)
5. **Validation error**: Data doesn't pass validation (highlight fields)
6. **Partial update failure**: Lab updated but part update failed (show status)
7. **Part deletion failed**: Part has student submissions (show error, explain reason)
8. **Part not found**: Part was already deleted (handle gracefully)

---

## Future Enhancements (Out of Scope)

- Version history for labs
- Rollback to previous version
- Duplicate lab functionality
- Bulk edit for multiple parts
- Preview changes before saving
- Compare with original (diff view)

---

## Success Criteria

The Lab Edit page will be considered complete when:

1. ✅ Page loads existing lab data correctly
2. ✅ All 6 wizard steps display populated data
3. ✅ User can modify any field in any step
4. ✅ Validation works correctly
5. ✅ Update API calls work for lab and parts
6. ✅ Success/error states handled properly
7. ✅ Navigation and redirects work correctly
8. ✅ Draft save/restore works
9. ✅ Build succeeds with no errors
10. ✅ Manual testing passes all scenarios

---

## Next Steps

1. **Get approval** on this plan
2. **Answer clarification questions** (or use recommended defaults)
3. **Start with Step 1**: Create edit page skeleton
4. **Proceed iteratively**: Complete one step, get feedback, move to next
5. **Test thoroughly**: After each step and at the end

---

**Document Status**: Draft
**Created**: 2025-01-19
**Last Updated**: 2025-01-19
**Author**: Claude Code
**Related Files**:
- `/pages/courses/[c_id]/labs/create.vue`
- `/components/wizard/LabWizardStep*.vue`
