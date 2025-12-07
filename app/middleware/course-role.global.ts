import { useUserState, useCourseRoleState } from "~/composables/states";

export default defineNuxtRouteMiddleware(async (to, _from) => {
    const userState = useUserState();
    const courseRoleState = useCourseRoleState();
    const config = useRuntimeConfig();
    const backendURL = config.public.backendurl;
    
    // Check if we're in a course-specific route
    const courseRouteMatch = to.path.match(/^\/courses\/([^/]+)/);
    
    if (courseRouteMatch) {
        const courseId = courseRouteMatch[1];
        
        // Only fetch course role if user is authenticated
        if (userState.value && typeof userState.value === 'object' && userState.value.u_id) {
            try {
                const { data: enrollmentResponse, error } = await useFetch<{
                    success: boolean;
                    enrollment: {
                        isEnrolled: boolean;
                        role: "STUDENT" | "INSTRUCTOR" | "TA";
                        enrollmentDate: string;
                    };
                }>(`${backendURL}/v0/enrollments/status/${courseId}`, {
                    method: "GET",
                    credentials: "include",
                    server: true,
                    default: () => null,
                });

                if (error.value) {
                    console.error("Failed to fetch course role", error.value);
                    courseRoleState.value = null;
                } else if (enrollmentResponse.value?.success) {
                    courseRoleState.value = {
                        courseId,
                        isEnrolled: enrollmentResponse.value.enrollment.isEnrolled,
                        role: enrollmentResponse.value.enrollment.role,
                        enrollmentDate: enrollmentResponse.value.enrollment.enrollmentDate
                    };
                } else {
                    courseRoleState.value = null;
                }
            } catch (err) {
                console.error("Error fetching course role:", err);
                courseRoleState.value = null;
            }
        } else {
            courseRoleState.value = null;
        }
    } else {
        // Delay clearing course role state when not in a course route to prevent UI flickering
        // Only clear if we're actually navigating to a non-course page
        if (!to.path.startsWith('/courses/')) {
            setTimeout(() => {
                courseRoleState.value = null;
            }, 100); // Small delay to prevent flickering
        }
    }
});
