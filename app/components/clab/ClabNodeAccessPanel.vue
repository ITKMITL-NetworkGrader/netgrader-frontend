<script setup lang="ts">
import { reactive } from 'vue'
import {
  Terminal,
  KeyRound,
  Copy,
  Check,
  Loader2,
  CornerDownLeft,
  Trash2,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
} from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'vue-sonner'
import { useClab, type ClabServerConfig, type SSHProxyInfo } from '@/composables/useClab'

const props = defineProps<{
  /** ClabNode[] or ClabContainerInfo[] — both share name/state/kind/image/ipv4_address */
  nodes: any[]
  labName: string
  cfg: ClabServerConfig
}>()

const { execNodeCommand, getSSHProxy } = useClab()

// ─── Per-node terminal output entry ─────────────────────────────────────────

interface TermEntry {
  cmd: string
  stdout: string
  stderr: string
  exitCode: number
  ts: string
}

// ─── Per-node state ──────────────────────────────────────────────────────────

interface NodeState {
  // SSH proxy panel
  sshOpen: boolean
  sshLoading: boolean
  sshData: SSHProxyInfo | null
  sshError: string | null
  sshCopied: boolean
  // Terminal panel
  termOpen: boolean
  termHistory: TermEntry[]
  currentCmd: string
  cmdHistory: string[]
  cmdHistoryIdx: number
  isExecuting: boolean
}

const states = reactive<Record<string, NodeState>>({})

function getState(name: string): NodeState {
  if (!states[name]) {
    states[name] = {
      sshOpen: false,
      sshLoading: false,
      sshData: null,
      sshError: null,
      sshCopied: false,
      termOpen: false,
      termHistory: [],
      currentCmd: '',
      cmdHistory: [],
      cmdHistoryIdx: -1,
      isExecuting: false,
    }
  }
  return states[name]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract the short topology node name from the full container name.
 * clab-api-server uses short names (from the topology) for exec/ssh API calls.
 * e.g. "clab-mylab-srl1" with labName "mylab" → "srl1"
 */
function shortName(fullName: string): string {
  const prefix = `clab-${props.labName}-`
  return fullName.startsWith(prefix) ? fullName.slice(prefix.length) : fullName
}

function formatIp(addr?: string): string {
  return addr ? addr.split('/')[0] : ''
}

// ─── SSH Proxy ───────────────────────────────────────────────────────────────

async function toggleSsh(nodeName: string) {
  const s = getState(nodeName)
  // If we already have data, just toggle the panel
  if (s.sshData) {
    s.sshOpen = !s.sshOpen
    return
  }
  s.sshOpen = true
  s.sshLoading = true
  s.sshError = null

  const result = await getSSHProxy(props.cfg, props.labName, shortName(nodeName))
  s.sshLoading = false

  if (result.success && result.data) {
    s.sshData = result.data
  } else {
    s.sshError = result.error || 'SSH proxy request failed'
  }
}

async function copySshCmd(nodeName: string) {
  const s = getState(nodeName)
  if (!s.sshData?.command) return
  await navigator.clipboard.writeText(s.sshData.command)
  s.sshCopied = true
  toast.success('SSH command copied', { duration: 2000 })
  setTimeout(() => { s.sshCopied = false }, 2000)
}

// ─── Terminal ─────────────────────────────────────────────────────────────────

function toggleTerminal(nodeName: string) {
  const s = getState(nodeName)
  s.termOpen = !s.termOpen
}

async function runCommand(nodeName: string) {
  const s = getState(nodeName)
  const cmd = s.currentCmd.trim()
  if (!cmd || s.isExecuting) return

  s.isExecuting = true
  s.cmdHistory.unshift(cmd)
  s.cmdHistoryIdx = -1
  s.currentCmd = ''

  const ts = new Date().toLocaleTimeString()
  const result = await execNodeCommand(props.cfg, props.labName, shortName(nodeName), cmd)

  s.termHistory.push({
    cmd,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? (result.success ? '' : (result.error ?? '')),
    exitCode: result.exitCode ?? -1,
    ts,
  })
  s.isExecuting = false

  // Scroll output to bottom
  await nextTick()
  const el = document.getElementById(`term-out-${nodeName}`)
  if (el) el.scrollTop = el.scrollHeight
}

function onKeydown(e: KeyboardEvent, nodeName: string) {
  const s = getState(nodeName)
  if (e.key === 'Enter') {
    runCommand(nodeName)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (s.cmdHistoryIdx < s.cmdHistory.length - 1) {
      s.cmdHistoryIdx++
      s.currentCmd = s.cmdHistory[s.cmdHistoryIdx]
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (s.cmdHistoryIdx > 0) {
      s.cmdHistoryIdx--
      s.currentCmd = s.cmdHistory[s.cmdHistoryIdx]
    } else {
      s.cmdHistoryIdx = -1
      s.currentCmd = ''
    }
  }
}

function clearTerminal(nodeName: string) {
  getState(nodeName).termHistory = []
}
</script>

<template>
  <div class="space-y-2">
    <!-- Empty state -->
    <div
      v-if="nodes.length === 0"
      class="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground"
    >
      No nodes found.
    </div>

    <!-- Node rows -->
    <div
      v-for="node in nodes"
      :key="node.name"
      class="rounded-md border overflow-hidden"
    >
      <!-- ── Node header row ── -->
      <div class="flex items-center gap-2 px-3 py-2.5 bg-background">
        <!-- Status dot -->
        <span
          class="h-2 w-2 rounded-full flex-shrink-0"
          :class="node.state === 'running' ? 'bg-green-500' : 'bg-muted-foreground'"
        />

        <!-- Name + kind -->
        <span class="font-mono text-sm font-medium flex-1 min-w-0 truncate">{{ node.name }}</span>

        <Badge variant="outline" class="text-xs font-mono hidden sm:flex flex-shrink-0">
          {{ node.kind || '—' }}
        </Badge>

        <!-- IP address -->
        <div class="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
          <Wifi v-if="node.ipv4_address" class="h-3 w-3" />
          <WifiOff v-else class="h-3 w-3" />
          <span v-if="node.ipv4_address" class="font-mono">{{ formatIp(node.ipv4_address) }}</span>
          <span v-else class="hidden sm:inline">No IP</span>
        </div>

        <!-- SSH button -->
        <Button
          variant="outline"
          size="sm"
          class="h-7 gap-1.5 text-xs flex-shrink-0"
          :class="getState(node.name).sshOpen ? 'bg-accent' : ''"
          @click="toggleSsh(node.name)"
        >
          <KeyRound class="h-3 w-3" />
          <span class="hidden sm:inline">SSH</span>
          <ChevronUp v-if="getState(node.name).sshOpen" class="h-3 w-3" />
          <ChevronDown v-else class="h-3 w-3" />
        </Button>

        <!-- Terminal button -->
        <Button
          variant="outline"
          size="sm"
          class="h-7 gap-1.5 text-xs flex-shrink-0"
          :class="getState(node.name).termOpen ? 'bg-accent' : ''"
          @click="toggleTerminal(node.name)"
        >
          <Terminal class="h-3 w-3" />
          <span class="hidden sm:inline">Exec</span>
          <ChevronUp v-if="getState(node.name).termOpen" class="h-3 w-3" />
          <ChevronDown v-else class="h-3 w-3" />
        </Button>
      </div>

      <!-- ── SSH Proxy panel ── -->
      <div
        v-if="getState(node.name).sshOpen"
        class="border-t px-3 py-3 bg-muted/20 space-y-2.5"
      >
        <!-- Loading -->
        <div
          v-if="getState(node.name).sshLoading"
          class="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Loader2 class="h-3.5 w-3.5 animate-spin" />
          Requesting SSH proxy…
        </div>

        <!-- Error -->
        <div
          v-else-if="getState(node.name).sshError"
          class="text-sm text-destructive"
        >
          {{ getState(node.name).sshError }}
        </div>

        <!-- Data -->
        <template v-else-if="getState(node.name).sshData">
          <div class="flex items-center justify-between text-xs text-muted-foreground">
            <div class="flex items-center gap-1">
              <KeyRound class="h-3 w-3" />
              SSH Proxy Access
            </div>
            <span v-if="getState(node.name).sshData?.expiration">
              Expires {{ new Date(getState(node.name).sshData!.expiration).toLocaleTimeString() }}
            </span>
          </div>

          <!-- Info grid -->
          <div class="grid grid-cols-3 gap-2 text-xs">
            <div class="bg-muted rounded px-2 py-1.5">
              <div class="text-muted-foreground mb-0.5">Host</div>
              <div class="font-mono font-medium truncate">{{ getState(node.name).sshData?.host }}</div>
            </div>
            <div class="bg-muted rounded px-2 py-1.5">
              <div class="text-muted-foreground mb-0.5">Port</div>
              <div class="font-mono font-medium">{{ getState(node.name).sshData?.port }}</div>
            </div>
            <div class="bg-muted rounded px-2 py-1.5">
              <div class="text-muted-foreground mb-0.5">Username</div>
              <div class="font-mono font-medium truncate">{{ getState(node.name).sshData?.username }}</div>
            </div>
          </div>

          <!-- SSH command -->
          <div class="flex items-center gap-2 bg-zinc-900 rounded px-2.5 py-2">
            <code class="text-xs font-mono text-green-400 flex-1 truncate">
              {{ getState(node.name).sshData?.command }}
            </code>
            <Button
              variant="ghost"
              size="icon"
              class="h-6 w-6 flex-shrink-0 text-zinc-400 hover:text-white"
              @click="copySshCmd(node.name)"
            >
              <Check v-if="getState(node.name).sshCopied" class="h-3 w-3 text-green-400" />
              <Copy v-else class="h-3 w-3" />
            </Button>
          </div>
        </template>
      </div>

      <!-- ── Terminal / Exec panel ── -->
      <div
        v-if="getState(node.name).termOpen"
        class="border-t"
      >
        <!-- Output area -->
        <div
          :id="`term-out-${node.name}`"
          class="bg-zinc-950 font-mono text-xs h-64 overflow-y-auto p-3 space-y-3"
        >
          <!-- Placeholder -->
          <div
            v-if="getState(node.name).termHistory.length === 0"
            class="text-zinc-500 italic"
          >
            # Type a command below and press Enter
          </div>

          <!-- History entries -->
          <div
            v-for="(entry, i) in getState(node.name).termHistory"
            :key="i"
            class="space-y-1"
          >
            <!-- Command line -->
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-zinc-500 text-[10px]">{{ entry.ts }}</span>
              <span class="text-green-400">$</span>
              <span class="text-white flex-1">{{ entry.cmd }}</span>
              <span
                class="text-[10px] px-1.5 py-0.5 rounded font-sans"
                :class="entry.exitCode === 0 ? 'bg-green-950 text-green-400' : 'bg-red-950 text-red-400'"
              >
                {{ entry.exitCode === 0 ? 'ok' : `exit ${entry.exitCode}` }}
              </span>
            </div>
            <!-- stdout -->
            <pre
              v-if="entry.stdout"
              class="text-zinc-200 whitespace-pre-wrap pl-8 leading-relaxed"
            >{{ entry.stdout.trim() }}</pre>
            <!-- stderr -->
            <pre
              v-if="entry.stderr"
              class="text-red-400 whitespace-pre-wrap pl-8 leading-relaxed"
            >{{ entry.stderr.trim() }}</pre>
          </div>
        </div>

        <!-- Input bar -->
        <div class="flex items-center gap-2 bg-zinc-900 px-3 py-2 border-t border-zinc-800">
          <span class="text-green-400 font-mono text-xs flex-shrink-0">
            {{ shortName(node.name) }} $
          </span>
          <input
            v-model="getState(node.name).currentCmd"
            class="flex-1 bg-transparent font-mono text-xs text-white outline-none placeholder:text-zinc-600"
            placeholder="ip addr show"
            :disabled="getState(node.name).isExecuting"
            @keydown="onKeydown($event, node.name)"
          />
          <div class="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              class="h-6 w-6 text-zinc-500 hover:text-red-400"
              title="Clear"
              @click="clearTerminal(node.name)"
            >
              <Trash2 class="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="h-6 w-6 text-zinc-400 hover:text-white"
              :disabled="!getState(node.name).currentCmd.trim() || getState(node.name).isExecuting"
              @click="runCommand(node.name)"
            >
              <Loader2 v-if="getState(node.name).isExecuting" class="h-3 w-3 animate-spin" />
              <CornerDownLeft v-else class="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
