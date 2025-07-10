<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const userState = useUserState()
const route = useRoute()
const dropdownOpen = ref(false)

const logout = () => {
    useCookie('access_token').value = null
    userState.value = null
    console.log("Access token has been reset by logout function")
    navigateTo('/', { replace: true })
}
</script>

<template>
    <div class="font-roboto-mono">
        <nav class="fixed top-0 w-full h-16 z-[5] bg-secondary/5 backdrop-blur-sm border-b border-gray-200/20">
            <div class="container mx-auto px-4 py-3 flex items-center justify-between">
                <NuxtLink to="/" class="text-2xl font-bold">
                    NetGrader
                </NuxtLink>
                <div class="flex items-center">
                    <NuxtLink to="/" class="ml-4 text-gray-600 hover:text-gray-800" :class="{ 'font-bold': route.path === '/' }">
                        Home
                    </NuxtLink>
                    <NuxtLink to="/courses" v-if="userState" class="ml-4 text-gray-600 hover:text-gray-800" :class="{ 'font-bold': route.path.startsWith('/courses') }">
                        Courses
                    </NuxtLink>
                    <NuxtLink to="/manage" v-if="userState && userState.role === 'INSTRUCTOR'" class="ml-4 text-gray-600 hover:text-gray-800" :class="{ 'font-bold': route.path.startsWith('/manage') }">
                        Manage
                    </NuxtLink>
                    <span v-if ="!userState" class="ml-4 text-gray-600">
                        <NuxtLink to="/login" class="ml-4 text-gray-600 hover:text-gray-800">
                            <Button class="">
                                Login
                            </Button>
                        </NuxtLink>
                    </span>
                    <DropdownMenu v-if="userState" v-model:open="dropdownOpen">
                        <DropdownMenuTrigger as-child>
                            <span class="ml-4 text-gray-600 cursor-pointer">
                                <span class="font-bai-jamjuree">{{ userState.first_name }} {{ userState.last_name }}</span>
                            </span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent class="w-48">
                            <DropdownMenuItem>
                                Profile
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem class="text-red-400 hover:text-red-500" @click="logout">
                                Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </nav>
    </div>
</template>