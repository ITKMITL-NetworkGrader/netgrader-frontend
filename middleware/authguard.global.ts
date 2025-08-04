import { Type } from "lucide-vue-next";
import { useUserState } from "~/composables/states";

export default defineNuxtRouteMiddleware(async (to, from) => {
    const userState = useUserState();
    const config = useRuntimeConfig()
    const backendURL = config.public.backendurl;
    const excludedRoutes = [ "/login", "/", "/demo", "/oat"];
    if (import.meta.dev) {
        console.log("Development environment detected, skipping authentication check.");
        // return;
    }
    if (!userState.value) {
        const { data: userDataResponse, error } = await useFetch<User>(`${backendURL}/v0/auth/me`, {
            method: "GET",
            credentials: "include",
        });

        console.log("Fetching user data from backend");
        console.log("User data response:", userDataResponse.value);

        if (error.value) {
            console.error("Failed to fetch user data", error.value);
        } else if (userDataResponse.value) {
            userState.value = userDataResponse.value;
        }
    }
    
    if (!userState.value && !excludedRoutes.includes(to.path)) {
        console.log(userState.value, "User state is not set, redirecting to login I don't even know why");
        console.log("User not authenticated, redirecting to login");
        return navigateTo({
            path: "/login",
            query: {
                next: to.fullPath
            },
            replace: true,
        });
    }

    if (to.path === "/login" && userState.value) {
        return navigateTo("/courses", { replace: true });
    }

    if (to.path === "/manage" && userState.value?.role !== "INSTRUCTOR") {
        return navigateTo("/courses", { replace: true });
    }
});
