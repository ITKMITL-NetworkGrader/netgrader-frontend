<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'vue-sonner'
import { LoaderCircle } from 'lucide-vue-next'

// Type definitions
interface LoginResponse {
  success: boolean
  message: string
  user: {
    u_id: string
    fullName: string
    lastLogin: string
    role: "STUDENT" | "INSTRUCTOR" | "ADMIN"
  }
}

const config = useRuntimeConfig()
const backendURL = config.public.backendurl
const { $anime } = useNuxtApp()

onMounted(() => {
  // Card entrance animation
  $anime({
    targets: '#card',
    translateY: [-50, 0],
    opacity: [0, 1],
    duration: 1000,
    easing: 'easeOutExpo'
  })

  // Animated background blur elements
  $anime({
    targets: '.bg-blob-1',
    translateX: [-100, 100],
    translateY: [-50, 50],
    scale: [0.8, 1.2],
    duration: 3000, // was 2000
    easing: 'easeInOutSine',
    loop: true,
    direction: 'alternate'
  })

  $anime({
    targets: '.bg-blob-2',
    translateX: [50, -50],
    translateY: [30, -30],
    scale: [1.1, 0.9],
    duration: 2250, // was 1500
    easing: 'easeInOutSine',
    loop: true,
    direction: 'alternate',
    delay: 1000
  })

  $anime({
    targets: '.bg-blob-3',
    translateX: [-30, 80],
    translateY: [-20, 40],
    scale: [0.9, 1.3],
    duration: 3750, // was 2500
    easing: 'easeInOutSine',
    loop: true,
    direction: 'alternate',
    delay: 2000
  })
})

// Form data
const username = ref('')
const password = ref('')
const isLoading = ref(false)
const showPassword = ref(false)

// Form validation
const usernameError = ref('')
const passwordError = ref('')

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

const validateUsername = (username: string) => {
  const usernameRegex = /^[a-zA-Z0-9._-]+$/
  return usernameRegex.test(username)
}

const userState = useUserState()
const query = useRoute()
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const handleLogin = async () => {
  usernameError.value = ''
  passwordError.value = ''

  if (!username.value) {
    usernameError.value = 'Username is required'
    return
  }
  if (!validateUsername(username.value)) {
    usernameError.value = 'Please enter a valid username'
    return
  }
  if (!password.value) {
    passwordError.value = 'Password is required'
    return
  }

  isLoading.value = true

  try {
    const response = await $fetch<LoginResponse>(`${backendURL}/v0/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: {
        username: username.value,
        password: password.value
      }
    })
    if (response.success) {
      userState.value = {
        u_id: response.user.u_id,
        fullName: response.user.fullName,
        lastLogin: response.user.lastLogin,
        role: response.user.role
      }
      
      toast.success(`Welcome back, ${response.user.fullName}!`, {
        description: 'Redirecting you now...',
      })

      if (query.query.next) {
        await navigateTo(query.query.next as string, { replace: true })
      } else {
        await navigateTo('/courses', { replace: true })
      }

    } else {
      toast.error(response.message)
    }
  } catch (error) {
    console.error('Login error:', error)
    if (error instanceof Error) {
      if (error.message.includes('Network Error')) {
        toast.error('Network error', {
          description: 'Check your internet connections and try again. If the problem persists, contact TA.'
        })
      } else if (error.message.includes('401')) {
        toast.error('Username or Password is invalid!', {
          description: 'Please check your credentials and try again.'
        })
      } else if (error.message.includes('404')) {
        toast.error('Server not found, please check your connection')
      } else if (error.message.includes('500')) {
        toast.error('Server error', {
          description: 'Please try again later. If the problem persists, contact TA.'
        })
      } else {
        toast.error('An unexpected error occurred')
      }
    } else {
      toast.error('An unexpected error occurred')
    }
  } finally {
    isLoading.value = false
  }
}





</script>

<template>
  <div class="bg-background flex items-center justify-center p-4">
    <!-- Background decorative elements -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <!-- Original background blobs -->
      <div class="absolute -top-1/2 -right-1/2 w-96 h-96 bg-muted/30 rounded-full blur-3xl" />
      <div class="absolute -bottom-1/2 -left-1/2 w-96 h-96 bg-muted/20 rounded-full blur-3xl" />

      <!-- Animated background blobs -->
      <div class="bg-blob-1 absolute top-1/4 left-1/4 w-80 h-80 bg-primary/25 rounded-full blur-3xl" />
      <div class="bg-blob-2 absolute top-3/4 right-1/3 w-64 h-64 bg-primary/20 rounded-full blur-2xl" />
      <div class="bg-blob-3 absolute bottom-1/3 left-1/2 w-72 h-72 bg-primary/30 rounded-full blur-3xl" />
    </div>

    <!-- Login Card -->
    <Card id="card" class="relative w-full min-w-md bg-card backdrop-blur-lg border shadow-2xl">
      <!-- Header -->
      <CardHeader class="text-center space-y-2">
        <div class="w-16 h-16 bg-primary rounded-2xl mx-auto flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <CardTitle class="text-3xl font-sans">Welcome, NetLearner!</CardTitle>
        <CardDescription>Sign in to access NetGrader</CardDescription>
      </CardHeader>

      <CardContent class="space-y-6">

        <!-- Form -->
        <form class="space-y-5" @submit.prevent="handleLogin">
          <!-- Username Field -->
          <div class="space-y-2">
            <Label for="username">Username</Label>
            <div class="relative">
              <Input
id="username" v-model="username" type="text" autocomplete="username" :class="[
                'pl-4 pr-12 py-3 h-12 bg-background/50 backdrop-blur-sm rounded-xl border-2',
                usernameError
                  ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                  : 'border-border focus:border-ring focus:ring-ring/20'
              ]" placeholder="Enter your IT username" :aria-invalid="!!usernameError" />
              <div class="absolute inset-y-0 right-0 flex items-center pr-3">
                <svg class="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 12c1.656 0 3-1.344 3-3s-1.344-3-3-3-3 1.344-3 3 1.344 3 3 3zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            </div>
            <p v-if="usernameError" class="text-sm text-destructive mt-1">{{ usernameError }}</p>
          </div>

          <!-- Password Field -->
          <div class="space-y-2">
            <Label for="password">Password</Label>
            <div class="relative">
              <Input
id="password" v-model="password" :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password" :class="[
                  'pl-4 pr-12 py-3 h-12 bg-background/50 backdrop-blur-sm rounded-xl border-2',
                  passwordError
                    ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                    : 'border-border focus:border-ring focus:ring-ring/20'
                ]" placeholder="Enter your password" :aria-invalid="!!passwordError" />
              <button
type="button"
                class="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                @click="togglePasswordVisibility">
                <!-- Eye Open Icon (when password is hidden) -->
                <svg v-if="!showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <!-- Eye Closed Icon (when password is visible) -->
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464m1.414 1.414l4.242 4.242m-4.242-4.242L8.464 8.464m7.07 7.07l1.414 1.414M15.536 15.536l1.414 1.414M5.636 5.636l1.414 1.414m11.314 11.314l1.414 1.414" />
                </svg>
              </button>
            </div>
            <p v-if="passwordError" class="text-sm text-destructive mt-1">{{ passwordError }}</p>
          </div>

          <!-- Remember Me & Forgot Password -->
          <div class="flex items-center justify-end">
            <NuxtLink
to="https://identity.it.kmitl.ac.th/auth/password/reset/request"
              class="text-sm text-primary hover:text-primary/80 transition-colors">
              Forgot password?
            </NuxtLink>
          </div>

          <!-- Login Button -->
          <Button
type="submit" :disabled="isLoading"
            class="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
            <span v-if="!isLoading" class="flex items-center justify-center">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Sign In
            </span>
            <span v-else class="flex items-center justify-center">
              <LoaderCircle class="animate-spin opacity-80 mr-2" />
              Signing In...
            </span>
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>