import { useUserState, type User } from "~/composables/states";

export default defineNuxtRouteMiddleware(async (to, _from) => {
    const userState = useUserState();
    const config = useRuntimeConfig()
    const backendURL = config.public.backendurl;
    const excludedRoutes = [ "/login", "/", "/demo", "/oat"];
    
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
                console.log("User data fetched:", userState.value);
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
        console.log("User is not authenticated, redirecting to login.");
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
        return navigateTo("/courses", { replace: true });
    }
});