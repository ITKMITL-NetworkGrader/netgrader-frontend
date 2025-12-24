<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import {
  CheckCircle,
  Users,
  Shield,
  BarChart,
  Maximize2,
  Minimize2,
  X
} from 'lucide-vue-next'

// Import Vue-Bits components
import FaultyTerminal from '@/components/bits/FaultyTerminal/FaultyTerminal.vue'
import AsciiText from '@/components/bits/AsciiText/AsciiText.vue'

// Terminal state
const prompt = 'Router(config)# '
const currentCommand = ref('')
const isCursorVisible = ref(true)
const isTerminalOpen = ref(true)
const isAutoTyping = ref(true)
const isFullscreen = ref(false)
const isFocused = ref(false)
const userInput = ref('')
const terminalHistory = ref<Array<{ type: 'command' | 'output' | 'prompt', text: string }>>([])
const terminalInputRef = ref<HTMLInputElement | null>(null)
const fullscreenInputRef = ref<HTMLInputElement | null>(null)
const terminalBodyRef = ref<HTMLElement | null>(null)

// Animation control
let animationAbortController: AbortController | null = null

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

// Simulated command responses
const commandResponses: Record<string, string> = {
  'help': `Available commands:
  show running-config - Display current configuration
  show ip route      - Display routing table
  show ip int br     - Display interface status
  configure terminal - Enter configuration mode
  exit               - Exit current mode
  help               - Show this help message`,
  'show running-config': `Building configuration...

Current configuration : 1234 bytes
!
hostname Router
!
interface GigabitEthernet0/0
 ip address 192.168.1.1 255.255.255.0
 duplex auto
 speed auto
!
interface GigabitEthernet0/1
 ip address 10.30.6.2 255.255.255.0
 duplex auto
 speed auto
!
ip route 0.0.0.0 0.0.0.0 10.30.6.1
!
end`,
  'show ip route': `Codes: C - connected, S - static, R - RIP, M - mobile, B - BGP
       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area

Gateway of last resort is 10.30.6.1 to network 0.0.0.0

S*   0.0.0.0/0 [1/0] via 10.30.6.1
C    10.30.6.0/24 is directly connected, GigabitEthernet0/1
C    192.168.1.0/24 is directly connected, GigabitEthernet0/0`,
  'show ip int br': `Interface            IP-Address      OK? Method Status                Protocol
GigabitEthernet0/0   192.168.1.1     YES manual up                    up
GigabitEthernet0/1   10.30.6.2       YES manual up                    up
Loopback0            1.1.1.1         YES manual up                    up`,
  'exit': 'Goodbye!',
  'configure terminal': 'Enter configuration commands, one per line. End with CNTL/Z.'
}

const sleep = (ms: number, signal?: AbortSignal) => {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timeout)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })
}

const typeCommand = async (cmd: string, signal: AbortSignal) => {
  for (let i = 0; i < cmd.length; i++) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    currentCommand.value += cmd.charAt(i)
    await sleep(50 + Math.random() * 30, signal)
  }
}

const deleteCommand = async (signal: AbortSignal) => {
  const len = currentCommand.value.length
  for (let i = 0; i < len; i++) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    currentCommand.value = currentCommand.value.slice(0, -1)
    await sleep(30, signal)
  }
}

const runTerminalLoop = async () => {
  animationAbortController = new AbortController()
  const signal = animationAbortController.signal

  try {
    while (isAutoTyping.value && !signal.aborted) {
      const randomCmd = ciscoCommands[Math.floor(Math.random() * ciscoCommands.length)]
      await typeCommand(randomCmd, signal)
      await sleep(15000, signal)
      await deleteCommand(signal)
      await sleep(500, signal)
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      // Animation was cancelled, this is expected
    } else {
      throw e
    }
  }
}

const stopAutoTyping = () => {
  if (animationAbortController) {
    animationAbortController.abort()
    animationAbortController = null
  }
  isAutoTyping.value = false
  currentCommand.value = ''
}

const handleTerminalClick = () => {
  stopAutoTyping()
  isFocused.value = true
  nextTick(() => {
    terminalInputRef.value?.focus()
  })
}

const handleTerminalBlur = () => {
  isFocused.value = false
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    executeCommand()
  } else if (e.key === 'Escape' && isFullscreen.value) {
    toggleFullscreen()
  }
}

const executeCommand = () => {
  const cmd = userInput.value.trim()
  if (!cmd) return

  // Add command to history
  terminalHistory.value.push({ type: 'command', text: `${prompt}${cmd}` })

  // Check for matching response
  const lowerCmd = cmd.toLowerCase()
  let response = ''
  
  for (const [key, value] of Object.entries(commandResponses)) {
    if (lowerCmd === key || lowerCmd.startsWith(key.split(' ')[0])) {
      response = value
      break
    }
  }

  if (!response && cmd) {
    response = `% Unknown command or incomplete command: "${cmd}"\nType "help" for available commands.`
  }

  if (response) {
    terminalHistory.value.push({ type: 'output', text: response })
  }

  // Clear input
  userInput.value = ''

  // Scroll to bottom
  nextTick(() => {
    if (terminalBodyRef.value) {
      terminalBodyRef.value.scrollTop = terminalBodyRef.value.scrollHeight
    }
  })
}

const resetTerminal = () => {
  // Reset all terminal state
  terminalHistory.value = []
  userInput.value = ''
  currentCommand.value = ''
  isAutoTyping.value = true
  isFocused.value = false
  isFullscreen.value = false
  
  // Restart the auto-typing animation
  runTerminalLoop()
}

const closeTerminal = () => {
  stopAutoTyping()
  isTerminalOpen.value = false
  
  // After close animation, reset and reopen
  setTimeout(() => {
    resetTerminal()
    isTerminalOpen.value = true
  }, 500)
}

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
  if (isFullscreen.value) {
    stopAutoTyping()
    isFocused.value = true
    // Focus the fullscreen input after DOM update
    nextTick(() => {
      setTimeout(() => {
        fullscreenInputRef.value?.focus()
      }, 100)
    })
  }
}

// Global escape key handler
const handleGlobalKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isFullscreen.value) {
    toggleFullscreen()
  }
}

onMounted(() => {
  runTerminalLoop()

  setInterval(() => {
    isCursorVisible.value = !isCursorVisible.value
  }, 500)

  document.addEventListener('keydown', handleGlobalKeyDown)
})

onUnmounted(() => {
  stopAutoTyping()
  document.removeEventListener('keydown', handleGlobalKeyDown)
})

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

// Computed terminal classes for fullscreen mode
const terminalContainerClasses = computed(() => {
  if (isFullscreen.value) {
    return 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8'
  }
  return 'relative'
})

const terminalWindowClasses = computed(() => {
  const base = 'bg-[#1e1e1e] rounded-xl overflow-hidden shadow-2xl shadow-gray-900/30 border border-gray-800 transition-all duration-500'
  if (isFullscreen.value) {
    return `${base} w-full h-full max-w-6xl max-h-[90vh]`
  }
  return `${base} w-full float-animation transform rotate-y-[-5deg] rotate-x-[5deg] hover:rotate-0 transition-transform duration-700 ease-out`
})
</script>

<template>
  <div
    class="min-h-screen bg-gray-50 dark:bg-background text-gray-900 dark:text-foreground overflow-x-hidden font-sans selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-primary/30 dark:selection:text-primary-foreground flex flex-col">
    
    <!-- Hero Section with FaultyTerminal Background -->
    <section class="relative h-screen w-full flex items-center justify-center overflow-hidden">
      <!-- FaultyTerminal Background -->
      <div class="absolute inset-0 z-0">
        <FaultyTerminal
          :scale="1.5"
          :timeScale="0.8"
          :scanlineIntensity="0.3"
          :glitchAmount="0.4"
          :flickerAmount="0.4"
          :brightness="0.65"
          :curvature="0"
          tint="#67B0A8"
          :mouseReact="true"
          :mouseStrength="0.6"
          class="w-full h-full"
        />
      </div>

      <!-- Dark overlay for better text readability -->
      <div class="absolute inset-0 z-5 bg-gradient-to-b from-black/30 via-black/10 to-black/40 pointer-events-none"></div>

      <!-- Hero Content (pointer-events-none to allow FaultyTerminal interaction) -->
      <div class="relative z-10 container mx-auto px-4 flex flex-col items-center text-center pointer-events-none">
        <!-- AsciiText Title (keep pointer events for its own interaction) -->
        <div class="relative w-full max-w-4xl h-48 md:h-64 lg:h-80 mb-8 pointer-events-auto">
          <AsciiText
            text="NetGrader"
            :asciiFontSize="10"
            :textFontSize="180"
            textColor="#ffffff"
            :planeBaseHeight="8"
            :enableWaves="true"
            class="w-full h-full"
          />
        </div>

        <!-- Subtitle -->
        <p v-motion
          :initial="{ opacity: 0, y: 30 }"
          :enter="{ opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 20, delay: 500 } }"
          class="text-xl md:text-2xl text-white/90 font-light leading-relaxed mb-10 max-w-2xl drop-shadow-lg">
          Master networking with <span class="font-medium text-primary">interactive automated grading</span> and
          instant feedback.
        </p>

        <!-- CTA Buttons (re-enable pointer events) -->
        <div v-motion
          :initial="{ opacity: 0, y: 30 }"
          :enter="{ opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 20, delay: 700 } }"
          class="flex flex-col sm:flex-row gap-4 pointer-events-auto">
          <NuxtLink to="/login">
            <button
              class="cursor-pointer px-8 py-4 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 hover:scale-105 transition-all duration-300 shadow-lg shadow-primary/30">
              Start Learning
            </button>
          </NuxtLink>
        </div>
      </div>

      <!-- Scroll indicator (positioned at bottom of section) -->
      <div v-motion
        :initial="{ opacity: 0 }"
        :enter="{ opacity: 1, transition: { delay: 1200 } }"
        class="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce z-20 pointer-events-none">
        <svg class="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
        </svg>
      </div>
    </section>

    <!-- Platform Features Section with Interactive Terminal -->
    <section class="relative z-20 py-20 bg-background">
      <div class="container mx-auto px-4">
        
        <!-- Section Header -->
        <div class="text-center mb-16">
          <h2 v-motion
            :initial="{ opacity: 0, y: 20 }"
            :visibleOnce="{ opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 20 } }"
            class="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Platform Features
          </h2>
          <p v-motion
            :initial="{ opacity: 0, y: 20 }"
            :visibleOnce="{ opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 20, delay: 100 } }"
            class="text-lg text-muted-foreground max-w-2xl mx-auto">
            Experience a comprehensive learning environment designed for network professionals
          </p>
        </div>

        <!-- Terminal and Features Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start max-w-7xl mx-auto">
          
          <!-- Interactive Terminal -->
          <div v-motion
            :initial="{ opacity: 0, x: -50 }"
            :visibleOnce="{ opacity: 1, x: 0, transition: { type: 'spring', stiffness: 80, damping: 20 } }"
            class="relative">
            
            <!-- Normal mode terminal with transition -->
            <Transition name="terminal-fade" mode="out-in">
              <div v-if="isTerminalOpen && !isFullscreen" key="terminal" class="relative">
                <div :class="terminalWindowClasses">
                  
                  <!-- Terminal Header (macOS style) -->
                  <div class="bg-[#2d2d2d] px-4 py-3 flex items-center gap-2 border-b border-[#3e3e3e]">
                    <div class="flex gap-2 group">
                      <!-- Close Button -->
                      <button
                        @click.stop="closeTerminal"
                        class="w-3 h-3 rounded-full bg-[#ff5f56] hover:bg-[#ff5f56]/80 cursor-pointer flex items-center justify-center transition-colors"
                        title="Close Terminal">
                        <span class="opacity-0 group-hover:opacity-100 text-[8px] text-black font-bold leading-none">×</span>
                      </button>
                      <!-- Minimize Button -->
                      <button
                        class="w-3 h-3 rounded-full bg-[#ffbd2e] hover:bg-[#ffbd2e]/80 cursor-pointer flex items-center justify-center transition-colors"
                        title="Minimize">
                        <span class="opacity-0 group-hover:opacity-100 text-[8px] text-black font-bold leading-none">−</span>
                      </button>
                      <!-- Fullscreen Button -->
                      <button
                        @click.stop="toggleFullscreen"
                        class="w-3 h-3 rounded-full bg-[#27c93f] hover:bg-[#27c93f]/80 cursor-pointer flex items-center justify-center transition-colors"
                        title="Fullscreen">
                        <span class="opacity-0 group-hover:opacity-100 text-[6px] text-black font-bold leading-none">
                          <Maximize2 class="w-2 h-2" />
                        </span>
                      </button>
                    </div>
                    <div class="flex-1 text-center text-xs font-mono text-gray-400">
                      admin — -zsh — 80x24
                    </div>
                  </div>

                  <!-- Terminal Body -->
                  <div
                    ref="terminalBodyRef"
                    @click="handleTerminalClick"
                    class="p-6 font-mono text-left text-sm bg-[#1e1e1e]/95 backdrop-blur-sm overflow-y-auto cursor-text h-80 terminal-scrollbar">
                    
                    <!-- Last login message -->
                    <div class="text-gray-400 mb-2">Last login: {{ new Date().toDateString() }} on ttys000</div>
                    
                    <!-- Hint text -->
                    <div v-if="isAutoTyping" class="text-gray-500 text-xs mb-4 italic">
                      Click anywhere to take control of the terminal...
                    </div>

                    <!-- Command history -->
                    <div v-for="(entry, index) in terminalHistory" :key="index" class="mb-1">
                      <div v-if="entry.type === 'command'" class="text-green-400">
                        {{ entry.text }}
                      </div>
                      <pre v-else class="text-gray-300 whitespace-pre-wrap text-xs">{{ entry.text }}</pre>
                    </div>

                    <!-- Current input line (auto-typing mode) -->
                    <div v-if="isAutoTyping" class="flex items-center text-green-400 flex-wrap">
                      <span class="text-gray-400 mr-2">{{ prompt }}</span>
                      <span class="text-gray-100">{{ currentCommand }}</span>
                      <span
                        class="inline-block w-2.5 h-5 bg-gray-400 ml-1 align-middle transition-opacity"
                        :class="{ 'opacity-0': !isCursorVisible }"></span>
                    </div>

                    <!-- Current input line (user input mode) -->
                    <div v-else class="flex items-center text-green-400">
                      <span class="text-gray-400 mr-2">{{ prompt }}</span>
                      <input
                        ref="terminalInputRef"
                        v-model="userInput"
                        @keydown="handleKeyDown"
                        @blur="handleTerminalBlur"
                        type="text"
                        class="bg-transparent border-none outline-none text-gray-100 font-mono flex-1"
                        style="caret-color: #9ca3af; caret-shape: block;"
                        placeholder=""
                        autocomplete="off"
                        spellcheck="false"
                      />
                    </div>
                  </div>
                </div>
                
                <!-- Decorative Elements behind terminal -->
                <div class="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
                <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-secondary/20 rounded-full blur-3xl animate-pulse delay-700 pointer-events-none"></div>
              </div>
            </Transition>

            <!-- Placeholder when fullscreen -->
            <div v-if="isTerminalOpen && isFullscreen" class="h-80 flex items-center justify-center bg-muted/20 rounded-xl border border-dashed border-muted-foreground/30">
              <p class="text-muted-foreground text-sm">Terminal is in fullscreen mode</p>
            </div>
          </div>

          <!-- Fullscreen Terminal (Teleported to body) -->
          <Teleport to="body">
            <Transition name="fade">
              <div v-if="isTerminalOpen && isFullscreen" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-8">
                <div class="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-2xl border border-gray-700 w-full h-full max-w-6xl max-h-[90vh] flex flex-col">
                  
                  <!-- Terminal Header (macOS style) -->
                  <div class="bg-[#2d2d2d] px-4 py-3 flex items-center gap-2 border-b border-[#3e3e3e] shrink-0">
                    <div class="flex gap-2 group">
                      <!-- Close Button -->
                      <button
                        @click.stop="closeTerminal"
                        class="w-3.5 h-3.5 rounded-full bg-[#ff5f56] hover:bg-[#ff5f56]/80 cursor-pointer flex items-center justify-center transition-colors"
                        title="Close Terminal">
                        <span class="opacity-0 group-hover:opacity-100 text-[10px] text-black font-bold leading-none">×</span>
                      </button>
                      <!-- Minimize Button -->
                      <button
                        @click.stop="toggleFullscreen"
                        class="w-3.5 h-3.5 rounded-full bg-[#ffbd2e] hover:bg-[#ffbd2e]/80 cursor-pointer flex items-center justify-center transition-colors"
                        title="Exit Fullscreen">
                        <span class="opacity-0 group-hover:opacity-100 text-[10px] text-black font-bold leading-none">−</span>
                      </button>
                      <!-- Fullscreen Button (exit) -->
                      <button
                        @click.stop="toggleFullscreen"
                        class="w-3.5 h-3.5 rounded-full bg-[#27c93f] hover:bg-[#27c93f]/80 cursor-pointer flex items-center justify-center transition-colors"
                        title="Exit Fullscreen">
                        <span class="opacity-0 group-hover:opacity-100 text-[8px] text-black font-bold leading-none">
                          <Minimize2 class="w-2 h-2" />
                        </span>
                      </button>
                    </div>
                    <div class="flex-1 text-center text-sm font-mono text-gray-400">
                      admin — -zsh — Fullscreen
                    </div>
                    <!-- Exit fullscreen button -->
                    <button
                      @click="toggleFullscreen"
                      class="text-gray-400 hover:text-white transition-colors cursor-pointer p-1 hover:bg-white/10 rounded">
                      <X class="w-5 h-5" />
                    </button>
                  </div>

                  <!-- Terminal Body -->
                  <div
                    @click="handleTerminalClick"
                    class="p-6 font-mono text-left text-base bg-[#1e1e1e] overflow-y-auto cursor-text flex-1 terminal-scrollbar">
                    
                    <!-- Last login message -->
                    <div class="text-gray-400 mb-2">Last login: {{ new Date().toDateString() }} on ttys000</div>
                    
                    <!-- Hint text -->
                    <div v-if="isAutoTyping" class="text-gray-500 text-sm mb-4 italic">
                      Click anywhere to take control of the terminal...
                    </div>

                    <!-- Command history -->
                    <div v-for="(entry, index) in terminalHistory" :key="index" class="mb-1">
                      <div v-if="entry.type === 'command'" class="text-green-400">
                        {{ entry.text }}
                      </div>
                      <pre v-else class="text-gray-300 whitespace-pre-wrap text-sm">{{ entry.text }}</pre>
                    </div>

                    <!-- Current input line (auto-typing mode) -->
                    <div v-if="isAutoTyping" class="flex items-center text-green-400 flex-wrap">
                      <span class="text-gray-400 mr-2">{{ prompt }}</span>
                      <span class="text-gray-100">{{ currentCommand }}</span>
                      <span
                        class="inline-block w-3 h-6 bg-gray-400 ml-1 align-middle transition-opacity"
                        :class="{ 'opacity-0': !isCursorVisible }"></span>
                    </div>

                    <!-- Current input line (user input mode) -->
                    <div v-else class="flex items-center text-green-400">
                      <span class="text-gray-400 mr-2">{{ prompt }}</span>
                      <input
                        ref="fullscreenInputRef"
                        v-model="userInput"
                        @keydown="handleKeyDown"
                        type="text"
                        class="bg-transparent border-none outline-none text-gray-100 font-mono flex-1 text-base"
                        style="caret-color: #9ca3af; caret-shape: block;"
                        placeholder=""
                        autocomplete="off"
                        spellcheck="false"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Transition>
          </Teleport>

          <!-- Feature Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div
              v-for="(feature, index) in features"
              :key="index"
              v-motion
              :initial="{ opacity: 0, y: 50 }"
              :visibleOnce="{ opacity: 1, y: 0, transition: { type: 'spring', stiffness: 50, damping: 20, delay: 200 + (index * 100) } }"
              class="modern-glass p-6 rounded-2xl group relative overflow-hidden border border-border hover:border-primary/30 transition-all duration-300 cursor-pointer">
              <div class="relative z-10">
                <div
                  class="w-12 h-12 rounded-xl bg-card shadow-sm border border-border flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <component :is="feature.icon" class="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>

                <h3 class="text-xl font-bold mb-2 text-foreground group-hover:text-primary transition-colors duration-300">
                  {{ feature.title }}
                </h3>

                <p class="text-muted-foreground text-sm leading-relaxed group-hover:text-foreground/80 transition-colors">
                  {{ feature.description }}
                </p>
              </div>

              <!-- Hover Gradient -->
              <div
                class="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-20 bg-muted">
      <div class="container mx-auto px-4">
        <div v-motion
          :initial="{ opacity: 0, scale: 0.9 }"
          :visibleOnce="{ opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 50, damping: 20 } }"
          class="text-center">
          <h2 class="text-4xl md:text-5xl font-bold mb-8 text-foreground">Ready to start grading?</h2>
          <NuxtLink to="/login">
            <button
              class="cursor-pointer group relative px-10 py-5 bg-primary text-primary-foreground rounded-md overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300">
              <span class="relative z-10 text-xl font-medium flex items-center gap-2">
                Get Started Now <span class="group-hover:translate-x-1 transition-transform">→</span>
              </span>
            </button>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Marquee Section -->
    <div v-motion
      :initial="{ opacity: 0 }"
      :enter="{ opacity: 1, transition: { duration: 1000, delay: 1000 } }"
      class="w-full overflow-hidden py-6 border-t border-border bg-transparent">
      <div class="whitespace-nowrap animate-marquee-right flex gap-8 items-center w-max pr-8">
        <span
          v-for="n in 30"
          :key="n"
          class="text-2xl font-mono font-bold tracking-widest flex items-center gap-8 text-muted-foreground">
          CONFIGURE <span class="text-primary">•</span> TEST <span class="text-secondary">•</span> GRADE <span
            class="text-muted">///</span>
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

@keyframes float {
  0%, 100% {
    transform: translateY(0) rotateY(-5deg) rotateX(5deg);
  }
  50% {
    transform: translateY(-10px) rotateY(-5deg) rotateX(5deg);
  }
}

.float-animation {
  animation: float 6s ease-in-out infinite;
}

.float-animation:hover {
  animation: none;
}

/* Modern glass effect */
.modern-glass {
  background: oklch(0.98 0 0 / 0.6);
  backdrop-filter: blur(10px);
}

.dark .modern-glass {
  background: oklch(0.2 0 0 / 0.6);
}

/* Terminal input styling */
input::placeholder {
  color: transparent;
}

/* Smooth transitions for fullscreen */
.fixed {
  transition: opacity 0.3s ease-out;
}

/* Z-index for overlay */
.z-5 {
  z-index: 5;
}

/* Fade transition for fullscreen */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Custom scrollbar for terminal */
.terminal-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.terminal-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.terminal-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
}

.terminal-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

.terminal-scrollbar::-webkit-scrollbar-corner {
  background: transparent;
}

/* Firefox scrollbar */
.terminal-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

/* Terminal fade transition */
.terminal-fade-enter-active {
  transition: all 0.25s ease-out;
}

.terminal-fade-leave-active {
  transition: all 0.2s ease-in;
}

.terminal-fade-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}

.terminal-fade-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(-20px);
}
</style>
