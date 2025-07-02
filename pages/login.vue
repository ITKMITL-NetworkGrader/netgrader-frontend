<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'

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
    duration: 8000,
    easing: 'easeInOutSine',
    loop: true,
    direction: 'alternate'
  })

  $anime({
    targets: '.bg-blob-2',
    translateX: [50, -50],
    translateY: [30, -30],
    scale: [1.1, 0.9],
    duration: 6000,
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
    duration: 10000,
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

  // Simulate login
  isLoading.value = true
  try {
    // Add your login logic here
    await new Promise(resolve => setTimeout(resolve, 2000))
    // Navigate to dashboard or home page
    navigateTo('/')
  } catch (error) {
    console.error('Login failed:', error)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-gray-50 flex items-center justify-center p-4">
    <NavigationBar />
    <!-- Background decorative elements -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <!-- Original background blobs -->
      <div class="absolute -top-1/2 -right-1/2 w-96 h-96 bg-gradient-to-br from-cyan-200/30 to-gray-200/30 rounded-full blur-3xl" />
      <div class="absolute -bottom-1/2 -left-1/2 w-96 h-96 bg-gradient-to-tr from-cyan-300/20 to-cyan-100/30 rounded-full blur-3xl" />
      
      <!-- Animated background blobs -->
      <div class="bg-blob-1 absolute top-1/4 left-1/4 w-80 h-80 bg-gradient-to-br from-cyan-300/25 via-cyan-200/15 to-transparent rounded-full blur-3xl" />
      <div class="bg-blob-2 absolute top-3/4 right-1/3 w-64 h-64 bg-gradient-to-tl from-cyan-400/20 via-cyan-100/25 to-transparent rounded-full blur-2xl" />
      <div class="bg-blob-3 absolute bottom-1/3 left-1/2 w-72 h-72 bg-gradient-to-r from-cyan-200/30 via-cyan-300/20 to-cyan-100/15 rounded-full blur-3xl" />
    </div>

    <!-- Login Card -->
    <div id="card" class="relative w-full max-w-md">
      <!-- Card -->
      <div class="bg-slate-100 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8 space-y-6">
        <!-- Header -->
        <div class="text-center space-y-2">
          <div class="w-16 h-16 bg-gradient-to-br from-cyan-500 to-black rounded-2xl mx-auto flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 class="text-3xl text-bold">Welcome, NetLearner!</h1>
          <p class="text-gray-600">Sign in to access NetGrader</p>
        </div>

        <!-- Form -->
        <form class="space-y-5" @submit.prevent="handleLogin">
          <!-- Username Field -->
          <div class="space-y-1">
            <label for="username" class="block text-sm font-medium text-black">Username</label>
            <div class="relative">
              <input
                id="username"
                v-model="username"
                type="text"
                autocomplete="username"
                :class="[
                  'w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 bg-white/50 backdrop-blur-sm',
                  usernameError
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                    : 'border-gray-200 focus:border-cyan-500 focus:ring-cyan-200',
                  'focus:outline-none focus:ring-4 focus:ring-opacity-20'
                ]"
                placeholder="Enter your IT username"
              >
              <div class="absolute inset-y-0 right-0 flex items-center pr-3">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 12c1.656 0 3-1.344 3-3s-1.344-3-3-3-3 1.344-3 3 1.344 3 3 3zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            </div>
            <p v-if="usernameError" class="text-sm text-red-600 mt-1">{{ usernameError }}</p>
          </div>

          <!-- Password Field -->
          <div class="space-y-1">
            <label for="password" class="block text-sm font-medium text-black">Password</label>
            <div class="relative">
              <input
                id="password"
                v-model="password"
                type="password"
                autocomplete="current-password"
                :class="[
                  'w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 bg-white/50 backdrop-blur-sm',
                  passwordError 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                    : 'border-gray-200 focus:border-cyan-500 focus:ring-cyan-200',
                  'focus:outline-none focus:ring-4 focus:ring-opacity-20'
                ]"
                placeholder="Enter your password"
              >
              <div class="absolute inset-y-0 right-0 flex items-center pr-3">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
            <p v-if="passwordError" class="text-sm text-red-600 mt-1">{{ passwordError }}</p>
          </div>

          <!-- Remember Me & Forgot Password -->
          <div class="flex items-center justify-end">
            <NuxtLink to="https://identity.it.kmitl.ac.th/auth/password/reset/request" class="text-sm text-cyan-600 hover:text-cyan-500 transition-colors">
              Forgot password?
            </NuxtLink>
          </div>

          <!-- Login Button -->
          <Button
            type="submit"
            :disabled="isLoading"
            class="w-full bg-gradient-to-r from-cyan-500 to-black hover:from-cyan-600 hover:to-gray-800 text-white py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <span v-if="!isLoading" class="flex items-center justify-center">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Sign In
            </span>
            <span v-else class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Signing In...
            </span>
          </Button>
        </form>

        <!-- Divider -->
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-200" />
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-4 bg-slate-100 text-gray-500">Or continue with</span>
          </div>
        </div>

        <!-- Social Login -->
        <div class="flex flex-col space-y-4">
          <Button class="flex items-center justify-center px-4 py-3 border-2 border-gray-200 rounded-xl text-sm hover:cursor-pointer font-medium text-black bg-white hover:bg-gray-50 transition-colors">
            <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </Button>
        </div>
      </div>

      <!-- Footer -->
      <!-- <div class="text-center mt-8">
        <p class="text-xs text-gray-500">
          By signing in, you agree to our
          <a href="#" class="text-cyan-600 hover:text-cyan-500">Terms of Service</a>
          and
          <a href="#" class="text-cyan-600 hover:text-cyan-500">Privacy Policy</a>
        </p>
      </div> -->
    </div>
  </div>
</template>