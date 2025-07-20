import { useUserState } from "~/composables/states";
export interface GetResponse {
    message: string;
    user: User;
}

export default defineNuxtRouteMiddleware(async (to, from) => {
    const userState = useUserState();
    const config = useRuntimeConfig()
    const dev_env = config.public.dev_env ?? false;
    const access_token = useCookie("access_token");
    const excludedRoutes = [ "/login", "/", "/demo", "/oat"];
    if (dev_env) {
        console.log("Development environment detected, skipping authentication check.");
        return;
    }
    if (!userState.value && access_token.value) {
        await $fetch<GetResponse>("/api/auth/me", {
            headers: {
                Authorization: `Bearer ${access_token.value}`,
            },
        }).then((userDataResponse) => {
            userState.value = userDataResponse.user;
        }).catch(() => {
            console.error("Failed to fetch user data");
            access_token.value = null;
            console.log("Access token has been cleared");
        });
    }

    if (!userState.value && !excludedRoutes.includes(to.path)) {
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
