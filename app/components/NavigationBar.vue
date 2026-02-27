<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from 'vue-sonner'
import NavbarTimer from '@/components/NavbarTimer.vue'

const userState = useUserState()
const { canAccessManagePage } = useRoleGuard()
const route = useRoute()
const dropdownOpen = ref(false)
const mobileMenuOpen = ref(false)
const chatSlideoverOpen = ref(false)
const config = useRuntimeConfig()
const backendUrl = config.public.backendurl

// Profile fallback image
const PROFILE_FALLBACK = '/profile_fallback.jpg'

// Timer state from composable
const { timerState } = useNavbarTimer()
const { emitTimerExpired, emitDeadlineExtended } = useNavbarTimerEvents()

// Track if component is mounted to avoid hydration issues
const isMounted = ref(false)

onMounted(() => {
    isMounted.value = true
})

// Dark mode functionality

const logout = async () => {
    try {
        // Clear fill-in-blank localStorage data on logout
        if (typeof window !== 'undefined') {
            const keysToRemove: string[] = []
            for (let i = 0; i < window.localStorage.length; i++) {
                const key = window.localStorage.key(i)
                if (key && key.startsWith('fillin:')) {
                    keysToRemove.push(key)
                }
            }
            keysToRemove.forEach(key => {
                try { window.localStorage.removeItem(key) } catch { /* no-op */ }
            })
            // Also clear session marker so next login starts fresh
            try { window.sessionStorage.removeItem('fillin:session:active') } catch { /* no-op */ }
            console.log('[Logout] Cleared fill-in-blank localStorage data')
        }

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
        show: isAuthenticated.value && canAccessManagePage.value,
        active: route.path.startsWith('/manage')
    },
    {
        label: 'Task Generator',
        to: '/task-generator',
        show: isAuthenticated.value && canAccessManagePage.value,
        active: route.path.startsWith('/task-generator')
    }
])

// Close mobile menu when route changes
watch(() => route.path, () => {
    mobileMenuOpen.value = false
})
</script>

<template>
    <div class="font-roboto-mono">
        <!-- Enhanced navigation -->
        <nav class="w-full h-16 bg-background border-b border-border relative">
            <div class="navbar-grid h-full px-4 sm:px-6 lg:px-8 mx-8 sm:mx-10 lg:mx-12">
            <!-- Logo with improved styling (Left) -->
            <div class="flex items-center justify-start">
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
            </div>

            <!-- Center Timer Section -->
            <div class="hidden md:flex items-center justify-center">
                <NavbarTimer
                    v-if="timerState.isActive"
                    :available-from="timerState.availableFrom"
                    :due-date="timerState.dueDate"
                    :available-until="timerState.availableUntil"
                    :lab-id="timerState.labId"
                    :created-at="timerState.createdAt"
                    :poll-interval-ms="timerState.pollIntervalMs"
                    @timer-expired="emitTimerExpired"
                    @deadline-extended="emitDeadlineExtended"
                />
            </div>

            <!-- Desktop Navigation (Right) -->
            <div class="hidden md:flex items-center justify-end gap-1">
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
                <!-- AI Chat button -->
                <button
                    v-if="isAuthenticated"
                    @click="chatSlideoverOpen = true"
                    class="p-2 rounded-md hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground transition-colors flex items-center gap-2"
                    title="AI Assistant"
                >
                    <span class="text-lg">💬</span>
                    <span class="hidden lg:inline text-sm">Chat Assistant</span>
                </button>

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
                    class="btn-primary hover:cursor-pointer"
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
                        <img
                          v-if="userState?.profilePicture"
                          :src="userState.profilePicture"
                          :alt="userState?.fullName || 'Profile'"
                          class="w-8 h-8 rounded-full object-cover"
                          @error="(e: Event) => (e.target as HTMLImageElement).src = PROFILE_FALLBACK"
                        />
                        <img
                          v-else
                          :src="PROFILE_FALLBACK"
                          alt="Profile"
                          class="w-8 h-8 rounded-full object-cover"
                        />
                        <span class="font-bai-jamjuree hidden lg:inline">
                        {{ userState?.fullName || 'User' }}
                        </span>
                        <Icon name="lucide:chevron-down" class="w-4 h-4 transition-transform" :class="{ 'rotate-180': dropdownOpen }" />
                    </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent class="w-56" align="end">
                    <div class="px-3 py-2 text-sm">
                        <p class="font-medium">{{ userState?.fullName || 'User' }}</p>
                        <p class="text-muted-foreground text-xs">{{ userState?.u_id }} · {{ userState?.role || 'Student' }}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem class="cursor-pointer" @click="navigateTo('/profile')">
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
                class="md:hidden absolute top-full left-0 right-0 bg-background border-b border-border"
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
                        <img
                          v-if="userState?.profilePicture"
                          :src="userState.profilePicture"
                          :alt="userState?.fullName || 'Profile'"
                          class="w-8 h-8 rounded-full object-cover"
                          @error="(e: Event) => (e.target as HTMLImageElement).src = PROFILE_FALLBACK"
                        />
                        <img
                          v-else
                          :src="PROFILE_FALLBACK"
                          alt="Profile"
                          class="w-8 h-8 rounded-full object-cover"
                        />
                        <div class="min-w-0 flex-1">
                        <p class="font-medium text-sm font-bai-jamjuree truncate">
                            {{ userState?.fullName || 'User' }}
                        </p>
                        <p class="text-muted-foreground text-xs truncate">{{ userState?.role || 'Student' }}</p>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <!-- AI Chat button -->
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          class="flex-1" 
                          @click="chatSlideoverOpen = true; mobileMenuOpen = false"
                        >
                          <span class="text-base mr-2">🤖</span>
                          Chat Assistant
                        </Button>
                        <NuxtLink to="/profile" class="flex-1">
                          <Button variant="ghost" size="sm" class="w-full">
                          <Icon name="lucide:user" class="w-4 h-4 mr-2" />
                          Profile
                          </Button>
                        </NuxtLink>
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

        <!-- AI Chat Slideover -->
        <ChatSlideover v-model:open="chatSlideoverOpen" />
    </div>
</template>

<style scoped>
.navbar-grid {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 1rem;
}

@media (max-width: 768px) {
    .navbar-grid {
        display: flex;
        justify-content: space-between;
    }
}
</style>