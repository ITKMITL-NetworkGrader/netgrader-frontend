import { useUserState, useCourseRoleState } from "~/composables/states";

/**
 * Composable for managing role-based access control
 */
export const useRoleGuard = () => {
    const userState = useUserState();
    const courseRoleState = useCourseRoleState();

    // Global role checks
    const isStudent = computed(() => userState.value?.role === "STUDENT");
    const isInstructor = computed(() => userState.value?.role === "INSTRUCTOR");
    const isAdmin = computed(() => userState.value?.role === "ADMIN");

    // Global role permissions
    const canManageAnyHourse = computed(() => isAdmin.value);
    const canCreateCourse = computed(() => isInstructor.value || isAdmin.value);
    const canAccessManagePage = computed(() => isInstructor.value || isAdmin.value);

    // Course role checks
    const isCourseStudent = computed(() => courseRoleState.value?.role === "STUDENT");
    const isCourseTA = computed(() => courseRoleState.value?.role === "TA");
    const isCourseInstructor = computed(() => courseRoleState.value?.role === "INSTRUCTOR");
    const isEnrolledInCourse = computed(() => courseRoleState.value?.isEnrolled === true);

    // Course role permissions
    const canManageCurrentCourse = computed(() => 
        isCourseInstructor.value || isCourseTA.value
    );
    
    const canDeleteCurrentCourse = computed(() => 
        isCourseInstructor.value || isAdmin.value
    );
    
    const canEditCourseContent = computed(() => 
        isCourseInstructor.value || isCourseTA.value
    );
    
    const canCreateLabsExams = computed(() => 
        isCourseInstructor.value || isCourseTA.value
    );
    
    const canGradeStudents = computed(() => 
        isCourseInstructor.value || isCourseTA.value
    );

    // Helper function to check if user can edit/delete a specific course
    const canEditCourse = (courseCreatorId?: string) => {
        if (isAdmin.value) return true;
        if (isInstructor.value && userState.value?.u_id === courseCreatorId) return true;
        return false;
    };

    const canDeleteCourse = (courseCreatorId?: string) => {
        if (isAdmin.value) return true;
        if (isInstructor.value && userState.value?.u_id === courseCreatorId) return true;
        return false;
    };

    return {
        // Global role states
        isStudent,
        isInstructor,
        isAdmin,
        
        // Global permissions
        canManageAnyHourse,
        canCreateCourse,
        canAccessManagePage,
        
        // Course role states
        isCourseStudent,
        isCourseTA,
        isCourseInstructor,
        isEnrolledInCourse,
        
        // Course permissions
        canManageCurrentCourse,
        canDeleteCurrentCourse,
        canEditCourseContent,
        canCreateLabsExams,
        canGradeStudents,
        
        // Helper functions
        canEditCourse,
        canDeleteCourse
    };
};
