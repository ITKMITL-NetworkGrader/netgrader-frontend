import { useUserState, useCourseRoleState, type User } from "~/composables/states";

export default defineNuxtRouteMiddleware(async (to, _from) => {
    const userState = useUserState();
    const courseRoleState = useCourseRoleState();
    const config = useRuntimeConfig()
    const backendURL = config.public.backendurl;
    const excludedRoutes = ["/login", "/", "/demo", "/oat"];

    // Always try to restore user state if it's not set, or if coming from login page
    const shouldRefetchUser = !userState.value ||
        userState.value === false ||
        _from?.path === "/login";

    if (shouldRefetchUser) {
        try {
            const userDataResponse = await $fetch<User>(`${backendURL}/v0/auth/me`, {
                method: "GET",
                credentials: "include",
            });

            if (userDataResponse) {
                userState.value = userDataResponse;
            } else {
                userState.value = null; // Explicitly set to null when no data
            }
        } catch (err) {
            console.error("Error fetching user data:", err);
            userState.value = null; // Explicitly set to null on error
        }
    }

    // if (import.meta.dev) {
    //     console.log("Development environment detected, skipping route protection.");
    //     return;
    // }

    // Check if user is properly authenticated (not just a falsy value)
    const isAuthenticated = userState.value &&
        typeof userState.value === 'object' &&
        userState.value !== null &&
        userState.value.u_id &&
        userState.value.role; // Ensure role is present

    // Check authentication for protected routes
    if (!isAuthenticated && !excludedRoutes.includes(to.path)) {
        return navigateTo({
            path: "/login",
            query: {
                next: to.fullPath
            },
            replace: true,
        });
    }

    if (to.path === "/login" && isAuthenticated) {
        return navigateTo("/courses", { replace: true });
    }

    if (to.path === "/manage" && (!isAuthenticated || !["INSTRUCTOR", "ADMIN"].includes(userState.value?.role || ""))) {
        return navigateTo("/", { replace: true });
    }

    const matchCoursePath = (path: string): string | null => {
        const patterns = [
            /^\/courses\/([^/]+)\/labs\/[^/]+\/status$/,
            /^\/courses\/([^/]+)\/labs\/[^/]+\/edit$/,
            /^\/courses\/([^/]+)\/labs\/create$/,
            /^\/courses\/([^/]+)(?:\/.+)?$/
        ];

        for (const pattern of patterns) {
            const match = path.match(pattern);
            if (match) {
                return match[1];
            }
        }
        return null;
    };

    const isCourseInfoPage = (path: string): boolean => {
        return /^\/courses\/[^/]+\/?$/.test(path);
    };

    const ensureCourseRole = async (courseId: string) => {
        if (!isAuthenticated) return null;

        if (courseRoleState.value?.courseId === courseId && courseRoleState.value.role) {
            return courseRoleState.value;
        }

        try {
            const response = await $fetch<{
                success: boolean;
                enrollment: {
                    isEnrolled: boolean;
                    role: "STUDENT" | "INSTRUCTOR" | "TA";
                    enrollmentDate: string;
                };
            }>(`${backendURL}/v0/enrollments/status/${courseId}`, {
                method: "GET",
                credentials: "include"
            });

            if (response?.success && response.enrollment) {
                courseRoleState.value = {
                    courseId,
                    isEnrolled: response.enrollment.isEnrolled,
                    role: response.enrollment.role,
                    enrollmentDate: response.enrollment.enrollmentDate
                };
                return courseRoleState.value;
            }
        } catch (error) {
            console.error("Failed to ensure course role:", error);
        }

        courseRoleState.value = null;
        return null;
    };

    const courseIdFromPath = matchCoursePath(to.path);

    if (courseIdFromPath) {
        if (isCourseInfoPage(to.path)) {
            await ensureCourseRole(courseIdFromPath);
            return;
        }
        const courseRole = await ensureCourseRole(courseIdFromPath);

        if (!courseRole || !courseRole.isEnrolled) {
            return navigateTo("/", { replace: true });
        }

        const restrictedLabRoles = [
            /^\/courses\/[^/]+\/labs\/[^/]+\/status$/,
            /^\/courses\/[^/]+\/labs\/[^/]+\/edit$/,
            /^\/courses\/[^/]+\/labs\/create$/
        ];

        const isRestrictedLabRoute = restrictedLabRoles.some((pattern) => pattern.test(to.path));

        if (isRestrictedLabRoute && !["INSTRUCTOR", "TA"].includes(courseRole.role)) {
            return navigateTo("/", { replace: true });
        }
    }
});
