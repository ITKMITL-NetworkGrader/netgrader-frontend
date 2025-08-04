import { Type } from "lucide-vue-next";
import { useUserState } from "~/composables/states";

export default defineNuxtRouteMiddleware(async (to, from) => {
    const userState = useUserState();
    const config = useRuntimeConfig()
    const backendURL = config.public.backendurl;
    const access_token = useCookie("auth_token");
    console.log(access_token.value)
    const excludedRoutes = [ "/login", "/", "/demo", "/oat"];
    if (config.public.env === "DEV") {
        console.log("Development environment detected, skipping authentication check.");
        return;
    }
    if (!userState.value && access_token.value) {
        console.log(`${backendURL}/v0/auth/me`, "Fetching user data with access token");
        await $fetch<User>(`${backendURL}/v0/auth/me`, {
            method: "GET",
            credentials: "include",
        }).then((userDataResponse) => {
            userState.value = userDataResponse;
        }).catch((e) => {
            console.error("Failed to fetch user data", e);
            // access_token.value = null;
            // console.log("Access token has been cleared");
        });
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
