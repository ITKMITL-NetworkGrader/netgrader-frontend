<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  Activity,
  CheckCircle,
  Layers,
  Users,
  Shield,
  BarChart
} from 'lucide-vue-next'

const prompt = 'Router(config)# '
const currentCommand = ref('')
const isCursorVisible = ref(true)
const isTerminalOpen = ref(true)

const ciscoCommands = [
  'int g0/0',
  'do sh ip route',
  'do sh run',
  'ip ssh version 2',
  'crypto key generate rsa modulus 2048',
  'line vty 0 15',
  'do sh ip int br',
  'ip route 0.0.0.0 0.0.0.0 10.30.6.1'
]

const typeCommand = async (cmd: string) => {
  for (let i = 0; i < cmd.length; i++) {
    currentCommand.value += cmd.charAt(i)
    await new Promise(r => setTimeout(r, 50 + Math.random() * 30)) // Random typing speed
  }
}

const deleteCommand = async () => {
  const len = currentCommand.value.length
  for (let i = 0; i < len; i++) {
    currentCommand.value = currentCommand.value.slice(0, -1)
    await new Promise(r => setTimeout(r, 30))
  }
}

const runTerminalLoop = async () => {
  while (true) {
    // Pick random command
    const randomCmd = ciscoCommands[Math.floor(Math.random() * ciscoCommands.length)]

    // Type it
    await typeCommand(randomCmd)

    // Wait 15 seconds
    await new Promise(r => setTimeout(r, 15000))

    // Delete it
    await deleteCommand()

    // Short pause before next
    await new Promise(r => setTimeout(r, 500))
  }
}

onMounted(() => {
  runTerminalLoop()

  setInterval(() => {
    isCursorVisible.value = !isCursorVisible.value
  }, 500)
})

const closeTerminal = () => {
  isTerminalOpen.value = false
}

const features = [
  {
    title: 'Automated Grading',
    description: 'Instant feedback on configuration tasks with detailed error reporting.',
    icon: CheckCircle
  },
  {
    title: 'Classroom Management',
    description: 'Track student progress, assign labs, and manage course materials effortlessly.',
    icon: Users
  },
  {
    title: 'Secure Environment',
    description: 'Sandboxed execution ensures safety while allowing full administrative access.',
    icon: Shield
  },
  {
    title: 'Performance Metrics',
    description: 'Analyze latency, throughput, and device resource usage in real-time.',
    icon: BarChart
  }
]
</script>

<template>
  <div
    class="min-h-screen bg-gray-50 text-gray-900 overflow-x-hidden font-sans selection:bg-blue-100 selection:text-blue-900 flex flex-col">
    <!-- Background Atmosphere -->
    <div class="fixed inset-0 z-0 pointer-events-none">
      <div class="absolute inset-0 mesh-gradient opacity-60"></div>
      <div
        class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay">
      </div>
    </div>

    <!-- Main Content -->
    <div class="relative z-20 container mx-auto px-4 py-20 flex flex-col items-center flex-grow">

      <!-- Hero Section -->
      <div class="w-full max-w-7xl mb-32 flex flex-col lg:flex-row items-center gap-12 relative">

        <!-- Text Content -->
        <div
          class="relative z-10 flex flex-col justify-center transition-all duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)]"
          :class="[
            isTerminalOpen ? 'lg:w-1/2 text-center lg:text-left items-center lg:items-start' : 'w-full text-center items-center'
          ]">
          <div v-motion :initial="{ opacity: 0, y: 20 }"
            :enter="{ opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 20, delay: 100 } }"
            class="inline-block px-4 py-1.5 rounded-full bg-white/50 backdrop-blur-sm border border-white/60 text-sm font-medium text-primary mb-6 shadow-sm">
            The Future of Network Grading
          </div>

          <h1 v-motion :initial="{ opacity: 0, y: 30 }"
            :enter="{ opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 20, delay: 200 } }"
            class="font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-800 to-gray-600 transition-all duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)]"
            :class="[
              isTerminalOpen ? 'text-5xl md:text-6xl lg:text-7xl' : 'text-6xl md:text-7xl lg:text-8xl scale-110'
            ]">
            NetGrader
          </h1>

          <p v-motion :initial="{ opacity: 0, y: 30 }"
            :enter="{ opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 20, delay: 300 } }"
            class="text-xl md:text-2xl text-gray-600 font-light leading-relaxed mb-10 transition-all duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)]"
            :class="{ 'max-w-xl': isTerminalOpen, 'max-w-3xl': !isTerminalOpen }">
            Master networking with <span class="font-medium text-gray-900">interactive automated grading</span> and
            instant feedback.
          </p>

          <div v-motion :initial="{ opacity: 0, y: 30 }"
            :enter="{ opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 20, delay: 400 } }"
            class="flex flex-col sm:flex-row gap-4 transition-all duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)]">
            <NuxtLink to="/login">
              <button
                class="px-8 py-4 bg-gray-900 text-white rounded-md font-medium hover:bg-gray-800 hover:scale-105 transition-all duration-300 shadow-lg shadow-gray-900/20">
                Start Learning
              </button>
            </NuxtLink>
          </div>
        </div>

        <!-- Terminal Window (Floating Hero) -->
        <div v-motion :initial="{ opacity: 0, x: 50, scale: 0.9 }"
          :enter="{ opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 80, damping: 20, delay: 500 } }"
          class="relative perspective-1000 transition-all duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)]" :class="[
            isTerminalOpen ? 'lg:w-1/2 opacity-100 scale-100 translate-x-0' : 'w-0 opacity-0 scale-95 translate-x-10 pointer-events-none absolute right-0'
          ]">
          <div v-if="isTerminalOpen"
            class="float-animation relative z-10 bg-[#1e1e1e] rounded-xl overflow-hidden shadow-2xl shadow-gray-900/30 border border-gray-800 transform rotate-y-[-5deg] rotate-x-[5deg] hover:rotate-0 transition-transform duration-700 ease-out w-full">
            <!-- Terminal Header -->
            <div class="bg-[#2d2d2d] px-4 py-3 flex items-center gap-2 border-b border-[#3e3e3e]">
              <div class="flex gap-2 group">
                <!-- Close Button -->
                <button @click="closeTerminal"
                  class="w-3 h-3 rounded-full bg-[#ff5f56] hover:bg-[#ff5f56]/80 cursor-pointer flex items-center justify-center"
                  title="Close Terminal">
                  <span class="opacity-0 group-hover:opacity-100 text-[8px] text-black font-bold leading-none">×</span>
                </button>
                <div class="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                <div class="w-3 h-3 rounded-full bg-[#27c93f]"></div>
              </div>
              <div class="flex-1 text-center text-xs font-mono text-gray-400">admin — -zsh — 80x24</div>
            </div>

            <!-- Terminal Body -->
            <div class="p-6 font-mono text-left text-lg h-64 bg-[#1e1e1e]/95 backdrop-blur-sm">
              <div class="text-gray-400 mb-2">Last login: {{ new Date().toDateString() }} on ttys000</div>
              <div class="flex items-center text-green-400 flex-wrap">
                <span class="text-gray-400 mr-2">{{ prompt }}</span>
                <span class="text-gray-100">{{ currentCommand }}</span>
                <span class="inline-block w-2.5 h-5 bg-gray-400 ml-1 align-middle"
                  :class="{ 'opacity-0': !isCursorVisible }"></span>
              </div>
            </div>
          </div>

          <!-- Decorative Elements behind terminal -->
          <div v-if="isTerminalOpen"
            class="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div v-if="isTerminalOpen"
            class="absolute -bottom-10 -left-10 w-40 h-40 bg-green-500/20 rounded-full blur-3xl animate-pulse delay-700">
          </div>
        </div>

      </div>

      <!-- Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 w-full max-w-7xl px-4 mb-32">
        <div v-for="(feature, index) in features" :key="index" v-motion :initial="{ opacity: 0, y: 50 }"
          :visibleOnce="{ opacity: 1, y: 0, transition: { type: 'spring', stiffness: 50, damping: 20, delay: 600 + (index * 100) } }"
          class="modern-glass p-8 rounded-2xl group relative overflow-hidden">
          <div class="relative z-10">
            <div
              class="w-14 h-14 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
              <component :is="feature.icon" class="w-7 h-7 text-gray-700 group-hover:text-primary transition-colors" />
            </div>

            <h3 class="text-2xl font-bold mb-3 text-gray-900 group-hover:text-primary transition-colors duration-300">
              {{ feature.title }}
            </h3>

            <p class="text-gray-500 leading-relaxed group-hover:text-gray-600 transition-colors">
              {{ feature.description }}
            </p>
          </div>

          <!-- Hover Gradient -->
          <div
            class="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-blue-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          </div>
        </div>
      </div>

      <!-- CTA Section -->
      <div v-motion :initial="{ opacity: 0, scale: 0.9 }"
        :visibleOnce="{ opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 50, damping: 20, delay: 800 } }"
        class="mb-20 text-center">
        <h2 class="text-4xl md:text-5xl font-bold mb-8 text-gray-900">Ready to start grading?</h2>
        <NuxtLink to="/login">
          <button
            class="group relative px-10 py-5 bg-gray-900 text-white rounded-md overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300">
            <span class="relative z-10 text-xl font-medium flex items-center gap-2">
              Get Started Now <span class="group-hover:translate-x-1 transition-transform">→</span>
            </span>
          </button>
        </NuxtLink>
      </div>

    </div>

    <!-- Marquee Section -->
    <div v-motion :initial="{ opacity: 0 }" :enter="{ opacity: 1, transition: { duration: 1000, delay: 1000 } }"
      class="w-full overflow-hidden py-6 border-t border-gray-200 bg-transparent">
      <div class="whitespace-nowrap animate-marquee-right flex gap-8 items-center w-max pr-8">
        <span v-for="n in 30" :key="n"
          class="text-2xl font-mono font-bold tracking-widest flex items-center gap-8 text-gray-400">
          CONFIGURE <span class="text-blue-500">•</span> TEST <span class="text-green-500">•</span> GRADE <span
            class="text-gray-300">///</span>
        </span>
      </div>
    </div>

    <PageFooter />
  </div>
</template>

<style scoped>
.perspective-1000 {
  perspective: 1000px;
}

@keyframes marquee-right {
  0% {
    transform: translateX(-50%);
  }

  100% {
    transform: translateX(0);
  }
}

.animate-marquee-right {
  animation: marquee-right 100s linear infinite;
}
</style>
