<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from 'vue-sonner'

const userState = useUserState()
const route = useRoute()
const dropdownOpen = ref(false)
const mobileMenuOpen = ref(false)
const config = useRuntimeConfig()
const backendUrl = config.public.backendurl

// Track if component is mounted to avoid hydration issues
const isMounted = ref(false)

onMounted(() => {
    isMounted.value = true
})

// Dark mode functionality

const logout = async () => {
    try {
        await $fetch(`${backendUrl}/v0/auth/logout`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        userState.value = null
        toast.success('Logged out successfully!', {
            description: 'You have been logged out.',
        })
        navigateTo('/', {
            replace: true,
        })
    } catch (error) {
        console.error('Logout failed:', error)
    }
}

// Check if user is actually authenticated (not just a string "false")
const isAuthenticated = computed(() => {
    return userState.value && 
           typeof userState.value === 'object' && 
           userState.value !== null &&
           userState.value.u_id
})

// Navigation items configuration
const navigationItems = computed(() => [
    {
        label: 'Home',
        to: '/',
        show: true,
        active: route.path === '/'
    },
    {
        label: 'Courses',
        to: '/courses',
        show: isAuthenticated.value,
        active: route.path.startsWith('/courses')
    },
    {
        label: 'Manage',
        to: '/manage',
        show: isAuthenticated.value && userState.value?.role === 'INSTRUCTOR',
        active: route.path.startsWith('/manage')
    }
])

// Close mobile menu when route changes
watch(() => route.path, () => {
    mobileMenuOpen.value = false
})
</script>

<template>
    <div class="font-roboto-mono">
        <!-- Enhanced navigation with better glass effect -->
        <nav class="fixed top-0 w-full h-16 z-50 glass border-b border-border/30 supports-[backdrop-filter]:bg-background/60">
            <div class="layout-container flex items-center justify-between h-full px-4 sm:px-6 lg:px-8 mx-8 sm:mx-10 lg:mx-12">
            <!-- Logo with improved styling -->
            <NuxtLink 
                to="/" 
                class="flex items-center gap-2 text-xl font-bold transition-colors hover:text-primary group"
                aria-label="NetGrader Home"
            >
                <div class="w-8 h-8 rounded bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-sm font-mono transition-transform group-hover:scale-105">
                NG
                </div>
                <span class="hidden sm:inline">NetGrader</span>
            </NuxtLink>

            <!-- Desktop Navigation -->
            <div class="hidden md:flex items-center gap-1">
                <nav class="flex items-center gap-1" role="navigation" aria-label="Main navigation">
                <NuxtLink
                    v-for="item in navigationItems.filter(item => item.show)"
                    :key="item.to"
                    :to="item.to"
                    class="px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    :class="{
                    'bg-accent text-accent-foreground': item.active,
                    'text-muted-foreground hover:text-foreground': !item.active
                    }"
                >
                    {{ item.label }}
                </NuxtLink>
                </nav>

                <!-- User section -->
                <div class="flex items-center gap-3 ml-4 pl-4 border-l border-border/30">
                <!-- Theme toggle button -->
                <!-- <button
                    class="p-2 rounded-md hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground transition-colors"
                    :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
                    @click="toggleTheme"
                >
                    <Icon 
                    :name="isDark ? 'lucide:sun' : 'lucide:moon'" 
                    class="w-4 h-4" 
                    />
                </button> -->
                
                <!-- Login button for guests -->
                <NuxtLink 
                    v-if="!isAuthenticated" 
                    to="/login"
                    class="inline-flex"
                >
                    <Button 
                    size="sm" 
                    class="btn-primary"
                    >
                    Login
                    </Button>
                </NuxtLink>

                <!-- User dropdown for authenticated users -->
                <DropdownMenu v-if="isAuthenticated" v-model:open="dropdownOpen">
                    <DropdownMenuTrigger as-child>
                    <button
                        class="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        :class="{ 'bg-accent text-accent-foreground': dropdownOpen }"
                    >
                        <div class="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-xs font-semibold">
                        {{ userState?.fullName?.[0] || '?' }}
                        </div>
                        <span class="font-bai-jamjuree hidden lg:inline">
                        {{ userState?.fullName || 'User' }}
                        </span>
                        <Icon name="lucide:chevron-down" class="w-4 h-4 transition-transform" :class="{ 'rotate-180': dropdownOpen }" />
                    </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent class="w-56" align="end">
                    <div class="px-3 py-2 text-sm">
                        <p class="font-medium">{{ userState?.fullName || 'User' }}</p>
                        <p class="text-muted-foreground text-xs">{{ userState?.u_id }}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem class="cursor-pointer">
                        <Icon name="lucide:user" class="w-4 h-4 mr-2" />
                        Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem class="cursor-pointer">
                        <Icon name="lucide:settings" class="w-4 h-4 mr-2" />
                        Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                        class="cursor-pointer text-red-500 focus:text-red-500 dark:text-red-400 dark:focus:text-red-400" 
                        @click="logout"
                    >
                        <Icon name="lucide:log-out" class="w-4 h-4 mr-2" />
                        Logout
                    </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                </div>
            </div>

            <!-- Mobile menu button -->
            <button
                class="md:hidden p-2 rounded-md hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground transition-colors"
                :aria-expanded="mobileMenuOpen"
                aria-label="Toggle mobile menu"
                @click="mobileMenuOpen = !mobileMenuOpen"
            >
                <Icon 
                :name="mobileMenuOpen ? 'lucide:x' : 'lucide:menu'" 
                class="w-5 h-5" 
                />
            </button>
            </div>

            <!-- Mobile menu -->
            <Transition
            enter-active-class="transition-all duration-300 ease-out"
            leave-active-class="transition-all duration-200 ease-in"
            enter-from-class="opacity-0 -translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-2"
            >
            <div 
                v-if="mobileMenuOpen" 
                class="md:hidden absolute top-full left-0 right-0 glass border-b border-border/30 supports-[backdrop-filter]:bg-background/90"
            >
                <div class="layout-container py-4 px-4 sm:px-6 lg:px-8 mx-4 sm:mx-6 lg:mx-8">
                <!-- Mobile navigation items -->
                <nav class="space-y-2" role="navigation" aria-label="Mobile navigation">
                    <NuxtLink
                    v-for="item in navigationItems.filter(item => item.show)"
                    :key="item.to"
                    :to="item.to"
                    class="block px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
                    :class="{
                        'bg-accent text-accent-foreground': item.active,
                        'text-muted-foreground': !item.active
                    }"
                    >
                    {{ item.label }}
                    </NuxtLink>
                </nav>

                <!-- Mobile user section -->
                <div class="mt-4 pt-4 border-t border-border/30">
                    <div v-if="!isAuthenticated">
                    <NuxtLink to="/login" class="block">
                        <Button class="w-full btn-primary">
                        Login
                        </Button>
                    </NuxtLink>
                    </div>
                    <div v-else class="space-y-3">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-sm font-semibold">
                        {{ userState?.fullName?.[0] || '?' }}
                        </div>
                        <div class="min-w-0 flex-1">
                        <p class="font-medium text-sm font-bai-jamjuree truncate">
                            {{ userState?.fullName || 'User' }}
                        </p>
                        <p class="text-muted-foreground text-xs truncate">{{ userState?.role || 'Student' }}</p>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <Button variant="ghost" size="sm" class="flex-1">
                        <Icon name="lucide:user" class="w-4 h-4 mr-2" />
                        Profile
                        </Button>
                        <Button 
                        variant="ghost" 
                        size="sm" 
                        class="flex-1 text-red-500 hover:text-red-500 dark:text-red-400 dark:hover:text-red-400" 
                        @click="logout"
                        >
                        <Icon name="lucide:log-out" class="w-4 h-4 mr-2" />
                        Logout
                        </Button>
                    </div>
                    </div>
                </div>
                </div>
            </div>
            </Transition>
        </nav>
    </div>
</template>