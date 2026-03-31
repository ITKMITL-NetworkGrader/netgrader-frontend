/**
 * ContainerLab Composable
 *
 * Manages the full lifecycle of a ContainerLab student lab or instructor playground:
 * IDLE → PROVISIONING → RUNNING → DESTROYING → IDLE
 *
 * Used by:
 * - ClabStudentLabManager (student lab start/stop)
 * - ClabPlaygroundManager (instructor test deployments)
 */

export type ClabLifecycleState = 'idle' | 'provisioning' | 'running' | 'destroying' | 'error'

export interface SSHProxyInfo {
  host: string
  port: number
  username: string
  command: string
  expiration: string
  nodeName: string
}

export interface ClabNode {
  name: string
  kind: string
  image?: string
  state: 'running' | 'exited' | 'stopped' | string
  ipv4_address?: string
  ipv6_address?: string
  sshCommand?: string   // e.g. "ssh admin@10.0.0.1 -p 5001"
  sshPort?: number
  sshHost?: string
  sshUsername?: string
}

export function useClab() {
  const config = useRuntimeConfig()
  const apiBaseUrl = config.public.backendurl + '/v0'

  // ─── State ─────────────────────────────────────────────────────────────────

  const lifecycleState = ref<ClabLifecycleState>('idle')
  const nodes = ref<ClabNode[]>([])
  const labName = ref<string | null>(null)
  const error = ref<string | null>(null)
  const isLoading = ref(false)

  // ─── Computed ──────────────────────────────────────────────────────────────

  const isIdle = computed(() => lifecycleState.value === 'idle')
  const isProvisioning = computed(() => lifecycleState.value === 'provisioning')
  const isRunning = computed(() => lifecycleState.value === 'running')
  const isDestroying = computed(() => lifecycleState.value === 'destroying')
  const hasError = computed(() => lifecycleState.value === 'error')

  // ─── Student Lab Actions ───────────────────────────────────────────────────

  /**
   * Deploy a ContainerLab environment for a student.
   * Calls POST /student-lab/clab/setup.
   */
  async function deployStudentLab(labId: string, studentId: string): Promise<boolean> {
    lifecycleState.value = 'provisioning'
    error.value = null
    isLoading.value = true

    try {
      const response = await $fetch<{
        success: boolean
        labName?: string
        nodes?: any[]
        sshAccess?: any[]
        error?: string
      }>(`${apiBaseUrl}/student-lab/clab/setup`, {
        method: 'POST',
        credentials: 'include',
        body: { labId, studentId },
      })

      if (!response.success) {
        throw new Error(response.error || 'Lab setup failed')
      }

      labName.value = response.labName ?? null
      nodes.value = normalizeNodes(response.nodes ?? [], response.sshAccess ?? [])
      lifecycleState.value = 'running'
      return true
    } catch (err: any) {
      error.value = err?.data?.error || err?.message || 'Failed to deploy lab'
      lifecycleState.value = 'error'
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Refresh node status for an existing running lab.
   * Calls GET /student-lab/clab/access/:labName.
   */
  async function refreshLabAccess(name: string): Promise<void> {
    try {
      const response = await $fetch<{
        success: boolean
        nodes?: any[]
        sshAccess?: any[]
        error?: string
      }>(`${apiBaseUrl}/student-lab/clab/access/${encodeURIComponent(name)}`, {
        credentials: 'include',
      })

      if (response.success) {
        labName.value = name
        nodes.value = normalizeNodes(response.nodes ?? [], response.sshAccess ?? [])
        if (lifecycleState.value !== 'running') {
          lifecycleState.value = 'running'
        }
      }
    } catch {
      // Silently ignore refresh errors — node grid shows stale data
    }
  }

  /**
   * Destroy a student's deployed lab.
   * Calls DELETE /student-lab/clab/:labName.
   */
  async function destroyStudentLab(name: string): Promise<boolean> {
    lifecycleState.value = 'destroying'
    error.value = null
    isLoading.value = true

    try {
      const response = await $fetch<{ success: boolean; error?: string }>(
        `${apiBaseUrl}/student-lab/clab/${encodeURIComponent(name)}`,
        { method: 'DELETE', credentials: 'include' },
      )

      if (!response.success) {
        throw new Error(response.error || 'Failed to destroy lab')
      }

      nodes.value = []
      labName.value = null
      lifecycleState.value = 'idle'
      return true
    } catch (err: any) {
      error.value = err?.data?.error || err?.message || 'Failed to destroy lab'
      lifecycleState.value = 'error'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // ─── Playground Actions (instructor only) ──────────────────────────────────
  // Server credentials come from backend env vars — no cfg needed here.

  /**
   * Test connectivity to the clab-api-server (env-configured).
   * Calls GET /playground/clab/test-connectivity.
   */
  async function testConnectivity(): Promise<{ success: boolean; version?: string; error?: string }> {
    isLoading.value = true
    error.value = null
    try {
      const response = await $fetch<{ success: boolean; version?: string; error?: string }>(
        `${apiBaseUrl}/playground/clab/test-connectivity`,
        { method: 'GET', credentials: 'include' },
      )
      return response
    } catch (err: any) {
      const msg = err?.data?.error || err?.message || 'Connectivity test failed'
      error.value = msg
      return { success: false, error: msg }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Deploy a topology in the playground.
   * Calls POST /playground/clab/deploy-lab.
   */
  async function deployPlaygroundLab(topology: object): Promise<boolean> {
    lifecycleState.value = 'provisioning'
    error.value = null
    isLoading.value = true

    try {
      const response = await $fetch<{ success: boolean; labName?: string; nodes?: any[]; error?: string }>(
        `${apiBaseUrl}/playground/clab/deploy-lab`,
        { method: 'POST', credentials: 'include', body: { topology } },
      )

      if (!response.success) {
        throw new Error(response.error || 'Deploy failed')
      }

      labName.value = response.labName ?? null
      nodes.value = normalizeNodes(response.nodes ?? [], [])
      lifecycleState.value = 'running'
      return true
    } catch (err: any) {
      error.value = err?.data?.error || err?.message || 'Deploy failed'
      lifecycleState.value = 'error'
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Inspect a lab and update node list.
   * Calls GET /playground/clab/inspect-lab/:name.
   */
  async function inspectPlaygroundLab(name: string): Promise<boolean> {
    isLoading.value = true
    try {
      const response = await $fetch<{ success: boolean; nodes?: any[]; error?: string }>(
        `${apiBaseUrl}/playground/clab/inspect-lab/${encodeURIComponent(name)}`,
        { method: 'GET', credentials: 'include' },
      )

      if (response.success) {
        labName.value = name
        nodes.value = normalizeNodes(response.nodes ?? [], [])
        lifecycleState.value = 'running'
        return true
      }
      return false
    } catch {
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Destroy a lab on the clab-api-server.
   * Calls DELETE /playground/clab/labs/:name.
   */
  async function destroyPlaygroundLab(name: string): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      const response = await $fetch<{ success: boolean; error?: string }>(
        `${apiBaseUrl}/playground/clab/labs/${encodeURIComponent(name)}`,
        { method: 'DELETE', credentials: 'include' },
      )
      if (!response.success) {
        throw new Error(response.error || 'Destroy failed')
      }
      if (labName.value === name) {
        nodes.value = []
        labName.value = null
        lifecycleState.value = 'idle'
      }
      return true
    } catch (err: any) {
      error.value = err?.data?.error || err?.message || 'Destroy failed'
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * List all labs on the clab-api-server.
   * Calls GET /playground/clab/list-labs.
   */
  async function listPlaygroundLabs(): Promise<any[]> {
    isLoading.value = true
    try {
      const response = await $fetch<{ success: boolean; labs?: any[]; error?: string }>(
        `${apiBaseUrl}/playground/clab/list-labs`,
        { method: 'GET', credentials: 'include' },
      )
      return response.success ? (response.labs ?? []) : []
    } catch {
      return []
    } finally {
      isLoading.value = false
    }
  }

  // ─── Node access (instructor only) ─────────────────────────────────────────

  /**
   * Execute a command on a specific node via clab exec API.
   * Calls POST /playground/clab/exec-node.
   */
  async function execNodeCommand(
    labName: string,
    nodeName: string,
    command: string,
  ): Promise<{ success: boolean; stdout?: string; stderr?: string; exitCode?: number; error?: string }> {
    try {
      const response = await $fetch<{
        success: boolean
        data?: Record<string, Array<{ stdout: string; stderr: string; 'return-code': number }>>
        error?: string
      }>(`${apiBaseUrl}/playground/clab/exec-node`, {
        method: 'POST',
        credentials: 'include',
        body: { labName, nodeName: `clab-${labName}-${nodeName}`, command },
      })

      if (!response.success || !response.data) {
        return { success: false, error: response.error || 'Exec failed' }
      }

      // data is ExecResponse: Record<nodeName, ExecResult[]> — take first entry
      const results = Object.values(response.data).flat()
      const first = results[0]
      if (!first) return { success: true, stdout: '', stderr: '', exitCode: 0 }

      return {
        success: true,
        stdout: first.stdout ?? '',
        stderr: first.stderr ?? '',
        exitCode: first['return-code'] ?? 0,
      }
    } catch (err: any) {
      return { success: false, error: err?.data?.error || err?.message || 'Exec failed' }
    }
  }

  /**
   * Request SSH proxy access for a specific node.
   * Calls POST /playground/clab/get-ssh-proxy.
   */
  async function getSSHProxy(
    labName: string,
    nodeName: string,
    options?: { duration?: string; sshUsername?: string },
  ): Promise<{ success: boolean; data?: SSHProxyInfo; error?: string }> {
    try {
      const response = await $fetch<{
        success: boolean
        data?: SSHProxyInfo
        error?: string
      }>(`${apiBaseUrl}/playground/clab/get-ssh-proxy`, {
        method: 'POST',
        credentials: 'include',
        body: { labName, nodeName: `clab-${labName}-${nodeName}`, ...options },
      })
      return response
    } catch (err: any) {
      return { success: false, error: err?.data?.error || err?.message || 'SSH proxy request failed' }
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function reset() {
    lifecycleState.value = 'idle'
    nodes.value = []
    labName.value = null
    error.value = null
    isLoading.value = false
  }

  /**
   * Merge raw node objects and SSH access info into ClabNode[]
   */
  function normalizeNodes(rawNodes: any[], sshAccess: any[]): ClabNode[] {
    const sshMap: Record<string, any> = {}
    for (const s of sshAccess) {
      const key = s.nodeName ?? s.name
      if (key) sshMap[key] = s
    }

    return rawNodes.map((n): ClabNode => {
      const ssh = sshMap[n.name] ?? {}
      let sshCommand: string | undefined
      if (ssh.command) {
        sshCommand = ssh.command
      } else if (ssh.host && ssh.username) {
        const portPart = ssh.port && ssh.port !== 22 ? ` -p ${ssh.port}` : ''
        sshCommand = `ssh ${ssh.username}@${ssh.host}${portPart}`
      }

      return {
        name: n.name ?? '',
        kind: n.kind ?? '',
        image: n.image,
        state: n.state ?? n.status ?? 'unknown',
        ipv4_address: n.ipv4_address ?? n.ip ?? undefined,
        ipv6_address: n.ipv6_address ?? undefined,
        sshCommand,
        sshPort: ssh.port,
        sshHost: ssh.host,
        sshUsername: ssh.username,
      }
    })
  }

  return {
    // State
    lifecycleState: readonly(lifecycleState),
    nodes: readonly(nodes),
    labName: readonly(labName),
    error: readonly(error),
    isLoading: readonly(isLoading),
    // Computed helpers
    isIdle,
    isProvisioning,
    isRunning,
    isDestroying,
    hasError,
    // Student lab
    deployStudentLab,
    refreshLabAccess,
    destroyStudentLab,
    // Playground (instructor)
    testConnectivity,
    deployPlaygroundLab,
    destroyPlaygroundLab,
    inspectPlaygroundLab,
    listPlaygroundLabs,
    // Node access (instructor)
    execNodeCommand,
    getSSHProxy,
    // Utils
    reset,
  }
}
