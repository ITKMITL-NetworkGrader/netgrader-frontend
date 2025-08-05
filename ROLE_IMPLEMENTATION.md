# Role-Based Access Control Implementation Summary

## Overview
This implementation introduces a comprehensive role-based access control system with two distinct role types:

### Global Roles
- **STUDENT**: Lowest tier, basic access to enrolled courses
- **INSTRUCTOR**: Middle tier, can create courses and manage their own courses  
- **ADMIN**: Highest tier, can create, edit, and delete any course

### Course Roles
- **STUDENT**: Lowest tier, can view course content and submit assignments
- **TA**: Middle tier, can edit course content, create/edit/delete labs and exams
- **INSTRUCTOR**: Highest tier, has all TA permissions plus can delete the course

## Changes Made

### 1. Updated User Interface (`composables/states.ts`)
- Modified `User` interface to make `role` required (Global Role)
- Added `CourseRole` interface for course-specific permissions
- Added `Enrollment` interface for enrollment management
- Added `useCourseRoleState()` composable

### 2. New Course Role Middleware (`middleware/course-role.global.ts`)
- Automatically fetches course role for routes matching `/courses/[c_id]/**`
- Uses API endpoint: `GET /v0/enrollments/status/[c_id]`
- Stores course role in global state
- Clears course role when leaving course routes

### 3. Updated Auth Middleware (`middleware/authguard.global.ts`)
- Enhanced authentication check to require role presence
- Updated `/manage` route protection for both INSTRUCTOR and ADMIN roles

### 4. New Role Guard Composable (`composables/useRoleGuard.ts`)
- Centralized role-based permission checking
- Provides computed properties for all role states and permissions
- Helper functions for course-specific permission checks

### 5. Updated Navigation (`components/NavigationBar.vue`)
- Uses new role guard for Manage button visibility
- Shows Manage button for both INSTRUCTOR and ADMIN roles

### 6. Updated Course Management (`composables/useCourse.ts`)
- Simplified to focus on course data fetching
- Course role information now comes from global middleware
- Removed duplicate role fetching logic

### 7. Updated Course Page (`pages/courses/[c_id]/index.vue`)
- Uses new `Enrollment` interface for student management
- Updated API endpoint for enrollment data: `GET /v0/enrollments/[c_id]`
- Fixed template to use `fullName` instead of `name`
- Uses new role guard for permission checks

### 8. Cleaned Up Type Definitions (`types/lab.ts`)
- Removed duplicate interfaces
- Fixed TypeScript `any` types to be more specific
- Removed unused `StudentEnrollment` interface

## API Endpoints Used

### Course Role Fetching
```
GET /v0/enrollments/status/[c_id]
Response: {
    "success": boolean,
    "enrollment": {
        "isEnrolled": boolean,
        "role": "STUDENT" | "INSTRUCTOR" | "TA",
        "enrollmentDate": string
    }
}
```

### Enrollment Management
```
GET /v0/enrollments/[c_id]
Response: {
    "status": boolean,
    "enrollments": [
        {
            "u_id": string,
            "c_id": string,
            "u_role": "STUDENT" | "INSTRUCTOR" | "TA",
            "enrollmentDate": string,
            "fullName": string
        }
    ]
}
```

### Global User Data
```
GET /v0/auth/me
Response: User object with required role field
```

## Key Features

1. **Automatic Role Fetching**: Course roles are fetched automatically when navigating to course pages
2. **Centralized Permissions**: All role-based logic is centralized in the role guard composable
3. **Type Safety**: Strong TypeScript interfaces for all role-related data
4. **Clean Separation**: Clear distinction between global and course-specific roles
5. **Backward Compatibility**: Changes maintain existing functionality while adding new role features

## Usage Examples

```typescript
// In any component
const { 
    canManageCurrentCourse,
    canDeleteCurrentCourse,
    canCreateCourse,
    isEnrolledInCourse 
} = useRoleGuard()

// Check if user can manage the current course
if (canManageCurrentCourse.value) {
    // Show management UI
}

// Check if user can delete a specific course
if (canDeleteCourse(courseCreatorId)) {
    // Show delete button
}
```
