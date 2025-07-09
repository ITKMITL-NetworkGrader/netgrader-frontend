<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'vue-sonner'
import 'vue-sonner/style.css'
import { LoaderCircle } from 'lucide-vue-next'

// Type definitions
interface LoginResponse {
  success: boolean
  message: string
  isFirstTimeLogin: boolean
  token: string
  user: {
    id: string
    u_id: string
    fullName: string
    role: string
    lastLogin: string
  }
}

const config = useRuntimeConfig()
const backendURL = config.public.backend1url
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

// Form validation
const usernameError = ref('')
const passwordError = ref('')

const validateUsername = (username: string) => {
  const usernameRegex = /^[a-zA-Z0-9._-]+$/
  return usernameRegex.test(username)
}

const handleLogin = async () => {
  // Reset errors
  usernameError.value = ''
  passwordError.value = ''

  // Validate
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
  if (password.value.length < 6) {
    passwordError.value = 'Password must be at least 6 characters'
    return
  }

  isLoading.value = true
  try {
    const data = await $fetch<LoginResponse>(backendURL + '/v0/auth/login', {
      method: 'POST',
      body: {
        username: username.value,
        password: password.value
      }
    })

    // Store token in client-side storage
    const token = useCookie('auth-token', {
      default: () => '',
      httpOnly: true,
      secure: !import.meta.dev,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 // 1 day
    })
    token.value = data.token
    // Success - navigate to dashboard
    toast.success('Login Success', {
      description: 'Welcome back, ' + data.user.fullName.split(' ')[0] + '! Redirecting now...',
    })

    await navigateTo('/dashboard')
  } catch (error: unknown) {
    console.error('Login failed:', error)

    const apiError = error as { statusCode?: number }
    if (apiError.statusCode === 401) {
      usernameError.value = 'Invalid username or password'
      toast.error('Login Failure', {
        description: 'Invalid username or password. Please try again.',
      })
    } else if (apiError.statusCode === 500) {
      toast.error('Login Failure', {
        description: 'Server error occurred. Please try again later.',
      })
    } else if (apiError.statusCode === 503) {
      toast.error('Login Failure', {
        description: 'Service temporarily unavailable. Please try again later.',
      })
    } else {
      toast.error('Login Failure', {
        description: 'Login failed. Please check your connection and try again.',
      })
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
    <Card id="card" class="relative w-full max-w-md bg-card backdrop-blur-lg border shadow-2xl">
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
id="password" v-model="password" type="password" autocomplete="current-password" :class="[
                'pl-4 pr-12 py-3 h-12 bg-background/50 backdrop-blur-sm rounded-xl border-2',
                passwordError
                  ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                  : 'border-border focus:border-ring focus:ring-ring/20'
              ]" placeholder="Enter your password" :aria-invalid="!!passwordError" />
              <div class="absolute inset-y-0 right-0 flex items-center pr-3">
                <svg class="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
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