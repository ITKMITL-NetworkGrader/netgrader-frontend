<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import yaml from 'js-yaml'
import { Codemirror } from 'vue-codemirror'
import { json as jsonLang } from '@codemirror/lang-json'
import { EditorView, keymap } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { searchKeymap } from '@codemirror/search'
import { tags } from '@lezer/highlight'
import { toast } from 'vue-sonner'
import { Plus, Trash2, AlertTriangle, Check } from 'lucide-vue-next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

// ─── Props ────────────────────────────────────────────────────────────────────

const props = defineProps<{
  yamlContent: string
  storageKey: string // used for localStorage key, e.g. "create" or a template ID
}>()

// ─── Runtime config ───────────────────────────────────────────────────────────

const config = useRuntimeConfig()
const backendURL = config.public.backendurl

// ─── CodeMirror setup ─────────────────────────────────────────────────────────

const lightTheme = EditorView.theme({
  '&': { backgroundColor: 'hsl(var(--muted) / 0.3)' },
  '.cm-scroller': { overflow: 'auto' },
  '.cm-content': {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    caretColor: 'hsl(var(--foreground))',
    padding: '16px 0',
  },
  '.cm-cursor': { borderLeftColor: 'hsl(var(--foreground))' },
  '.cm-selectionBackground, ::selection': { backgroundColor: 'hsl(var(--primary) / 0.2)' },
  '.cm-gutters': {
    backgroundColor: 'hsl(var(--muted) / 0.5)',
    color: 'hsl(var(--muted-foreground))',
    border: 'none',
    borderRight: '1px solid hsl(var(--border))',
  },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 12px 0 8px' },
  '.cm-activeLine': { backgroundColor: 'hsl(var(--muted) / 0.5)' },
  '.cm-activeLineGutter': { backgroundColor: 'hsl(var(--muted) / 0.7)' },
}, { dark: false })

const lightHighlightStyle = HighlightStyle.define([
  { tag: tags.comment, color: '#6b7280', fontStyle: 'italic' },
  { tag: tags.string, color: '#059669' },
  { tag: tags.number, color: '#d97706' },
  { tag: tags.bool, color: '#7c3aed' },
  { tag: tags.null, color: '#7c3aed' },
  { tag: tags.keyword, color: '#2563eb' },
  { tag: tags.propertyName, color: '#dc2626' },
  { tag: tags.definition(tags.propertyName), color: '#dc2626' },
  { tag: tags.punctuation, color: '#6b7280' },
])

const jsonExtensions = [
  jsonLang(),
  lightTheme,
  syntaxHighlighting(lightHighlightStyle),
  EditorView.lineWrapping,
  history(),
  keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
]

// ─── Constants ────────────────────────────────────────────────────────────────

const DEVICE_OS_OPTIONS = [
  { value: 'cisco_ios', label: 'Cisco IOS' },
  { value: 'linux', label: 'Linux' },
]

const CONNECTION_OPTIONS = [
  { value: 'ssh', label: 'SSH' },
  { value: 'telnet', label: 'Telnet' },
]

const ROLE_OPTIONS = [
  { value: 'direct', label: 'Direct' },
  { value: 'via_console', label: 'Console Server' },
]

// Platform options depend on device OS and connection method.
// For SSH, the platform IS the OS identifier (linux / cisco_ios).
// For Telnet, generic platform names are used; device_os tells netgrader the actual OS.
const getPlatformOptions = (device_os: string, connection_method: string) => {
  if (connection_method === 'ssh') {
    if (device_os === 'linux') return [{ value: 'linux', label: 'linux' }]
    return [{ value: 'cisco_ios', label: 'cisco_ios' }]
  }
  // Telnet
  if (device_os === 'linux') {
    return [
      { value: 'generic_termserver_telnet', label: 'generic_termserver_telnet (recommended)' },
      { value: 'generic_telnet', label: 'generic_telnet' },
    ]
  }
  // Telnet, cisco_ios
  return [
    { value: 'generic_termserver_telnet', label: 'generic_termserver_telnet (recommended)' },
    { value: 'cisco_ios_telnet', label: 'cisco_ios_telnet' },
    { value: 'generic_telnet', label: 'generic_telnet' },
  ]
}

// Derive connection method from an existing platform string (used when parsing JSON)
const getConnectionMethod = (platform: string): string => {
  const telnetPlatforms = ['generic_telnet', 'generic_termserver_telnet', 'cisco_ios_telnet']
  return telnetPlatforms.includes(platform) ? 'telnet' : 'ssh'
}

// ─── Form builder state ───────────────────────────────────────────────────────

type PayloadMode = 'form' | 'raw'

type FormDevice = {
  id: string
  ip_address: string
  port: string           // empty = use default port; stored as string for <Input> binding
  device_os: string      // 'cisco_ios' | 'linux'
  connection_method: string // 'ssh' | 'telnet' — UI concept that drives platform options
  platform: string       // netmiko connection driver name
  username: string
  password: string
  role: string
}

const payloadMode = ref<PayloadMode>('form')
const defaultDeviceName = 'device1'
const formDevices = ref<FormDevice[]>([
  {
    id: defaultDeviceName,
    ip_address: 'gns3.it.kmitl.ac.th',
    port: '',
    device_os: 'cisco_ios',
    connection_method: 'ssh',
    platform: 'cisco_ios',
    username: '',
    password: '',
    role: 'direct',
  }
])

const formExecutionDevice = ref(defaultDeviceName)
const formPoints = ref(10)
const formTaskParams = ref<Record<string, string>>({})

// Parameters extracted from the YAML template
const yamlParameters = computed<Array<{ name: string; datatype?: string; description?: string; required?: boolean }>>(() => {
  try {
    const parsed = yaml.load(props.yamlContent) as any
    return Array.isArray(parsed?.parameters) ? parsed.parameters : []
  } catch {
    return []
  }
})

// Keep formTaskParams in sync when YAML parameters change (add new keys, remove stale ones)
watch(yamlParameters, (params) => {
  const next: Record<string, string> = {}
  for (const p of params) {
    next[p.name] = formTaskParams.value[p.name] ?? ''
  }
  formTaskParams.value = next
}, { immediate: true })

// ─── Payload helpers ──────────────────────────────────────────────────────────

const getPreviewTaskName = (): string => {
  try {
    const parsed = yaml.load(props.yamlContent) as Record<string, any> | null
    if (parsed?.task_name && typeof parsed.task_name === 'string') {
      return parsed.task_name
    }
  } catch { /* fall through */ }
  return 'preview_template'
}

const buildPayloadFromForm = () => ({
  job_id: `template_preview_${props.storageKey}`,
  student_id: 'preview_student',
  lab_id: 'preview_lab',
  part: {
    part_id: 'part1',
    title: 'Template Preview',
    network_tasks: [
      {
        task_id: 'preview_task_1',
        name: 'Template Preview Task',
        template_name: getPreviewTaskName(),
        execution_device: formExecutionDevice.value,
        parameters: { ...formTaskParams.value },
        test_cases: [],
        points: formPoints.value,
      }
    ],
    groups: [],
  },
  devices: formDevices.value.map(d => {
    const isTelnet = d.connection_method === 'telnet'
    const device: Record<string, any> = {
      id: d.id,
      ip_address: d.ip_address,
      platform: d.platform,
      role: d.role,
    }
    // Include port only when explicitly set
    if (d.port.trim()) device.port = parseInt(d.port.trim(), 10)
    // device_os is needed for telnet so netgrader knows the actual OS behind a generic platform
    if (isTelnet) device.device_os = d.device_os
    // Credentials are optional for telnet; omit entirely if username is empty
    if (!isTelnet || d.username.trim()) {
      device.credentials = { username: d.username, password: d.password }
    }
    return device
  }),
  ip_mappings: {},
})

// ─── Mode switching ───────────────────────────────────────────────────────────

const switchToRaw = () => {
  testPayloadJson.value = JSON.stringify(buildPayloadFromForm(), null, 2)
  payloadMode.value = 'raw'
}

const switchToForm = () => {
  syncJsonToForm(testPayloadJson.value)
  payloadMode.value = 'form'
}

const syncJsonToForm = (jsonStr: string) => {
  try {
    const parsed = JSON.parse(jsonStr)
    if (Array.isArray(parsed?.devices) && parsed.devices.length > 0) {
      formDevices.value = parsed.devices.map((d: any) => {
        const platform = d.platform ?? 'cisco_ios'
        const connection_method = getConnectionMethod(platform)
        const device_os = d.device_os ?? (platform === 'linux' ? 'linux' : 'cisco_ios')
        return {
          id: d.id ?? defaultDeviceName,
          ip_address: d.ip_address ?? '',
          port: d.port != null ? String(d.port) : '',
          device_os,
          connection_method,
          platform,
          username: d.credentials?.username ?? '',
          password: d.credentials?.password ?? '',
          role: d.role ?? 'direct',
        }
      })
    }
    const task = parsed?.part?.network_tasks?.[0]
    if (task) {
      formExecutionDevice.value = task.execution_device ?? formDevices.value[0]?.id ?? defaultDeviceName
      formPoints.value = task.points ?? 10
      if (task.parameters && typeof task.parameters === 'object') {
        formTaskParams.value = { ...task.parameters }
      }
    }
  } catch { /* keep current form values on parse error */ }
}

// ─── Device management ────────────────────────────────────────────────────────

const addDevice = () => {
  const n = formDevices.value.length + 1
  formDevices.value.push({
    id: `device${n}`,
    ip_address: '',
    port: '',
    device_os: 'cisco_ios',
    connection_method: 'ssh',
    platform: 'cisco_ios',
    username: 'admin',
    password: 'cisco',
    role: 'direct',
  })
}

const removeDevice = (index: number) => {
  const removedId = formDevices.value[index]?.id
  formDevices.value.splice(index, 1)
  if (removedId && formExecutionDevice.value === removedId && formDevices.value.length > 0) {
    formExecutionDevice.value = formDevices.value[0]!.id
  }
}

// When device_os changes, reset platform to the first valid option for the new OS
const onDeviceOsChange = (device: FormDevice, newOs: string) => {
  device.device_os = newOs
  const opts = getPlatformOptions(newOs, device.connection_method)
  if (!opts.find(o => o.value === device.platform)) {
    device.platform = opts[0]?.value ?? ''
  }
}

// When connection method changes, reset platform to the first valid option for the new method
const onConnectionMethodChange = (device: FormDevice, newMethod: string) => {
  device.connection_method = newMethod
  const opts = getPlatformOptions(device.device_os, newMethod)
  if (!opts.find(o => o.value === device.platform)) {
    device.platform = opts[0]?.value ?? ''
  }
}

// ─── Test runner state ────────────────────────────────────────────────────────

const isTesting = ref(false)
const testError = ref<string | null>(null)
const testResult = ref<any | null>(null)
const testPayloadJson = ref('')

const testValidationErrors = computed<string[]>(() => {
  const errors = testResult.value?.validation?.errors
  return Array.isArray(errors) ? errors : []
})

const testTaskResults = computed<any[]>(() => {
  const results = testResult.value?.grading_result?.test_results
  return Array.isArray(results) ? results : []
})

const passedTaskCount = computed(() => testTaskResults.value.filter((t: any) => t?.status === 'passed').length)

const extractErrorMessage = (error: any): string => {
  if (typeof error?.data?.message === 'string' && error.data.message.trim()) return error.data.message
  if (typeof error?.data?.detail === 'string' && error.data.detail.trim()) return error.data.detail
  if (typeof error?.message === 'string' && error.message.trim()) return error.message
  return 'Template test failed'
}

// ─── Run test ─────────────────────────────────────────────────────────────────

const runTemplateTest = async (validateOnly = false) => {
  let parsedPayload: any

  if (payloadMode.value === 'form') {
    parsedPayload = buildPayloadFromForm()
  } else {
    try {
      parsedPayload = JSON.parse(testPayloadJson.value)
    } catch (err: any) {
      toast.error('Invalid test payload JSON', { description: err?.message || 'Please provide valid JSON.' })
      return
    }
  }

  // Always inject the current template name into all network tasks
  const previewTaskName = getPreviewTaskName()
  if (Array.isArray(parsedPayload?.part?.network_tasks)) {
    parsedPayload.part.network_tasks = parsedPayload.part.network_tasks.map((task: any) => ({
      ...task,
      template_name: previewTaskName,
    }))
  }

  try {
    isTesting.value = true
    testError.value = null

    const response = await $fetch<{ success: boolean; message?: string; data?: any }>(
      `${backendURL}/v0/task-templates/test-run`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: {
          yamlContent: props.yamlContent,
          jobPayload: parsedPayload,
          validateOnly,
          taskNameOverride: previewTaskName,
        },
      }
    )

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Template test failed')
    }

    testResult.value = response.data

    if (!response.data.success) {
      const msg = testValidationErrors.value.length > 0
        ? testValidationErrors.value.join('; ')
        : (response.message || 'Template test failed')
      testError.value = msg
      toast.error(validateOnly ? 'Validation failed' : 'Template test failed', { description: msg })
      return
    }

    if (validateOnly) {
      toast.success('Template payload validated successfully')
    } else {
      const earned = response.data?.grading_result?.total_points_earned ?? 0
      const possible = response.data?.grading_result?.total_points_possible ?? 0
      toast.success('Template test execution completed', { description: `Score ${earned}/${possible}` })
    }
  } catch (error: any) {
    testError.value = extractErrorMessage(error)
    toast.error('Template test failed', { description: testError.value })
  } finally {
    isTesting.value = false
  }
}

// ─── Load sample ──────────────────────────────────────────────────────────────

const loadSamplePayload = () => {
  formDevices.value = [
    {
      id: defaultDeviceName,
      ip_address: '10.0.0.1',
      port: '',
      device_os: 'cisco_ios',
      connection_method: 'ssh',
      platform: 'cisco_ios',
      username: 'admin',
      password: 'cisco',
      role: 'direct',
    }
  ]
  formExecutionDevice.value = defaultDeviceName
  formPoints.value = 10
  formTaskParams.value = Object.fromEntries(yamlParameters.value.map(p => [p.name, '']))
  testPayloadJson.value = JSON.stringify(buildPayloadFromForm(), null, 2)
  testResult.value = null
  testError.value = null
}

// ─── localStorage persistence ─────────────────────────────────────────────────

const STORAGE_KEY = computed(() => `ng_tpl_payload_${props.storageKey}`)

const saveToStorage = () => {
  try {
    const data = payloadMode.value === 'raw'
      ? testPayloadJson.value
      : JSON.stringify(buildPayloadFromForm(), null, 2)
    localStorage.setItem(STORAGE_KEY.value, data)
  } catch { /* quota exceeded or private browsing */ }
}

const loadFromStorage = (): boolean => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY.value)
    if (!saved) return false
    testPayloadJson.value = saved
    syncJsonToForm(saved)
    return true
  } catch {
    return false
  }
}

// Debounced save on any form or JSON change
let saveTimer: ReturnType<typeof setTimeout> | null = null
const scheduleSave = () => {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(saveToStorage, 800)
}

watch([formDevices, formTaskParams, formExecutionDevice, formPoints], scheduleSave, { deep: true })
watch(testPayloadJson, scheduleSave)

onMounted(() => {
  if (!loadFromStorage()) {
    loadSamplePayload()
  }
})
</script>

<template>
  <Card class="border-border/50">
    <CardHeader class="pb-3">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <CardTitle class="text-lg">Template Test Runner</CardTitle>
          <CardDescription>Run a direct preview test without RabbitMQ</CardDescription>
        </div>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" @click="loadSamplePayload" :disabled="isTesting">
            Load Sample
          </Button>
          <Button variant="outline" size="sm" @click="runTemplateTest(true)" :disabled="isTesting">
            {{ isTesting ? 'Testing...' : 'Validate' }}
          </Button>
          <Button size="sm" @click="runTemplateTest(false)" :disabled="isTesting" class="bg-emerald-600 hover:bg-emerald-700">
            {{ isTesting ? 'Running...' : 'Run Test' }}
          </Button>
        </div>
      </div>
    </CardHeader>

    <CardContent class="space-y-4">
      <!-- Mode Toggle -->
      <Tabs :model-value="payloadMode" class="w-full">
        <TabsList class="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="form" @click="switchToForm">Form Builder</TabsTrigger>
          <TabsTrigger value="raw" @click="switchToRaw">Raw JSON</TabsTrigger>
        </TabsList>
      </Tabs>

      <!-- ── Form Builder ── -->
      <div v-if="payloadMode === 'form'" class="space-y-4">

        <!-- Devices section -->
        <div class="rounded-md border p-4 space-y-3">
          <div class="flex items-center justify-between">
            <Label class="text-sm font-semibold">Devices</Label>
            <Button variant="outline" size="sm" @click="addDevice" class="h-7 text-xs gap-1">
              <Plus class="h-3 w-3" />
              Add Device
            </Button>
          </div>

          <div
            v-for="(device, idx) in formDevices"
            :key="idx"
            class="rounded-md border bg-muted/20 p-3 space-y-3"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Device {{ idx + 1 }}</span>
              <Button
                v-if="formDevices.length > 1"
                variant="ghost"
                size="icon"
                class="h-6 w-6 text-destructive hover:text-destructive"
                @click="removeDevice(idx)"
              >
                <Trash2 class="h-3 w-3" />
              </Button>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <Label class="text-xs">Device ID</Label>
                <Input v-model="device.id" class="mt-1 h-8 text-sm font-mono" placeholder="device1" />
              </div>
              <div>
                <Label class="text-xs">IP Address</Label>
                <Input v-model="device.ip_address" class="mt-1 h-8 text-sm font-mono" placeholder="10.0.0.1" />
              </div>

              <div>
                <Label class="text-xs">Device OS</Label>
                <Select
                  :model-value="device.device_os"
                  @update:model-value="(v) => onDeviceOsChange(device, v as string)"
                >
                  <SelectTrigger class="mt-1 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="opt in DEVICE_OS_OPTIONS" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label class="text-xs">Connection</Label>
                <Select
                  :model-value="device.connection_method"
                  @update:model-value="(v) => onConnectionMethodChange(device, v as string)"
                >
                  <SelectTrigger class="mt-1 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="opt in CONNECTION_OPTIONS" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="col-span-2 grid grid-cols-2 gap-2">
                <div>
                  <Label class="text-xs">Platform</Label>
                  <Select v-model="device.platform">
                    <SelectTrigger class="mt-1 h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="opt in getPlatformOptions(device.device_os, device.connection_method)"
                        :key="opt.value"
                        :value="opt.value"
                      >
                        {{ opt.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label class="text-xs">Port <span class="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input v-model="device.port" class="mt-1 h-8 text-sm font-mono" placeholder="default" />
                </div>
              </div>

              <div>
                <Label class="text-xs">
                  Username
                  <span v-if="device.connection_method === 'telnet'" class="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input v-model="device.username" class="mt-1 h-8 text-sm" placeholder="admin" />
              </div>
              <div>
                <Label class="text-xs">
                  Password
                  <span v-if="device.connection_method === 'telnet'" class="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input v-model="device.password" type="password" class="mt-1 h-8 text-sm" placeholder="cisco" />
              </div>
            </div>
          </div>
        </div>

        <!-- Task configuration -->
        <div class="rounded-md border p-4 space-y-3">
          <Label class="text-sm font-semibold">Task Configuration</Label>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <Label class="text-xs">Execution Device</Label>
              <Select v-model="formExecutionDevice">
                <SelectTrigger class="mt-1 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="d in formDevices" :key="d.id" :value="d.id">
                    {{ d.id }} ({{ d.ip_address || '—' }})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label class="text-xs">Task Points</Label>
              <Input v-model.number="formPoints" type="number" min="0" class="mt-1 h-8 text-sm" />
            </div>
          </div>

          <!-- Dynamic parameters from YAML -->
          <div v-if="yamlParameters.length > 0" class="space-y-2">
            <Label class="text-xs text-muted-foreground">Template Parameters</Label>
            <div
              v-for="param in yamlParameters"
              :key="param.name"
              class="grid grid-cols-3 items-center gap-2"
            >
              <Label class="text-xs font-mono col-span-1 truncate" :title="param.name">
                {{ param.name }}
                <span v-if="param.required" class="text-destructive">*</span>
              </Label>
              <div class="col-span-2">
                <Input
                  v-model="formTaskParams[param.name]"
                  class="h-8 text-sm font-mono"
                  :placeholder="param.description || param.datatype || 'value'"
                />
              </div>
            </div>
          </div>
          <p v-else class="text-xs text-muted-foreground">
            No parameters defined in this template.
          </p>
        </div>
      </div>

      <!-- ── Raw JSON editor ── -->
      <div v-else class="json-editor border rounded-md overflow-hidden">
        <ClientOnly>
          <Codemirror
            v-model="testPayloadJson"
            :basic="false"
            :extensions="jsonExtensions"
            :style="{ height: '600px' }"
            placeholder="Paste test job payload JSON"
          />
          <template #fallback>
            <textarea
              v-model="testPayloadJson"
              class="w-full h-[260px] p-3 font-mono text-sm bg-muted/20 border-0 focus:outline-none resize-none"
              spellcheck="false"
              placeholder="Paste test job payload JSON"
            />
          </template>
        </ClientOnly>
      </div>

      <!-- ── Test Error ── -->
      <Alert v-if="testError" variant="destructive">
        <AlertTriangle class="h-4 w-4" />
        <AlertTitle>Test Error</AlertTitle>
        <AlertDescription>{{ testError }}</AlertDescription>
      </Alert>

      <!-- ── Test Results ── -->
      <div v-if="testResult" class="space-y-2">
        <!-- Summary stats -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div class="rounded-md border px-3 py-2">
            <div class="text-muted-foreground">Mode</div>
            <div class="font-medium capitalize">{{ testResult.mode?.replace('_', ' ') }}</div>
          </div>
          <div class="rounded-md border px-3 py-2">
            <div class="text-muted-foreground">Success</div>
            <div class="font-medium flex items-center gap-1">
              <Check v-if="testResult.success" class="h-3 w-3 text-emerald-600" />
              <AlertTriangle v-else class="h-3 w-3 text-destructive" />
              {{ testResult.success ? 'Yes' : 'No' }}
            </div>
          </div>
          <div class="rounded-md border px-3 py-2">
            <div class="text-muted-foreground">Template</div>
            <div class="font-medium font-mono text-xs truncate" :title="testResult.template_name">
              {{ testResult.template_name }}
            </div>
          </div>
          <div class="rounded-md border px-3 py-2">
            <div class="text-muted-foreground">Tasks Passed</div>
            <div class="font-medium">{{ passedTaskCount }}/{{ testTaskResults.length }}</div>
          </div>
        </div>

        <!-- Grading summary -->
        <div v-if="testResult.grading_result" class="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
          <div class="rounded-md border px-3 py-2">
            <div class="text-muted-foreground">Status</div>
            <div class="font-medium capitalize">{{ testResult.grading_result.status }}</div>
          </div>
          <div class="rounded-md border px-3 py-2">
            <div class="text-muted-foreground">Score</div>
            <div class="font-medium">
              {{ testResult.grading_result.total_points_earned }}/{{ testResult.grading_result.total_points_possible }}
            </div>
          </div>
          <div class="rounded-md border px-3 py-2">
            <div class="text-muted-foreground">Execution Time</div>
            <div class="font-medium">{{ Number(testResult.grading_result.total_execution_time || 0).toFixed(2) }}s</div>
          </div>
        </div>

        <!-- Per-task results -->
        <div v-if="testTaskResults.length > 0" class="rounded-md border bg-muted/5 p-4 text-sm space-y-4">
          <div class="font-semibold text-base">Task Results</div>
          <div
            v-for="task in testTaskResults"
            :key="task.test_name"
            class="space-y-3 border-b border-border/50 pb-4 last:border-b-0 last:pb-0"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="font-medium text-base">{{ task.test_name }}</div>
                <div class="text-xs text-muted-foreground mt-0.5">{{ task.message }}</div>
              </div>
              <Badge :variant="task.status === 'passed' ? 'default' : 'destructive'">{{ task.status }}</Badge>
            </div>

            <!-- Command Results (Debug Info) -->
            <div v-if="task.debug_info?.command_results?.length" class="space-y-2 mt-2">
              <div class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Commands Executed</div>
              <div class="space-y-2">
                <details
                  v-for="(cmd, i) in task.debug_info.command_results"
                  :key="cmd.name + i"
                  class="group rounded-md border bg-background overflow-hidden"
                >
                  <summary class="flex items-center justify-between p-2.5 cursor-pointer bg-muted/10 hover:bg-muted/30 transition-colors select-none outline-none">
                    <div class="flex items-center gap-2">
                      <Check v-if="cmd.success" class="h-4 w-4 text-emerald-600" />
                      <AlertTriangle v-else class="h-4 w-4 text-destructive" />
                      <span class="font-mono text-sm font-medium">{{ cmd.name }}</span>
                    </div>
                    <span class="text-[10px] text-muted-foreground font-mono uppercase bg-muted/50 px-1.5 py-0.5 rounded border">{{ cmd.action }}</span>
                  </summary>
                  <div class="p-3 border-t bg-muted/5 text-[13px] font-mono whitespace-pre-wrap overflow-x-auto text-muted-foreground">
                    <div v-if="cmd.stdout" class="mb-3 last:mb-0">
                      <div class="text-[10px] font-bold text-foreground/70 uppercase mb-1">STDOUT</div>
                      <div class="bg-background border rounded p-2 text-foreground break-all">{{ cmd.stdout }}</div>
                    </div>
                    <div v-if="cmd.stderr" class="mb-3 last:mb-0">
                      <div class="text-[10px] font-bold text-destructive uppercase mb-1">STDERR</div>
                      <div class="bg-destructive/10 border border-destructive/20 text-destructive rounded p-2 break-all">{{ cmd.stderr }}</div>
                    </div>
                    <div v-if="!cmd.stdout && !cmd.stderr && cmd.result !== undefined">
                      <div class="text-[10px] font-bold text-foreground/70 uppercase mb-1">RESULT</div>
                      <div class="bg-background border rounded p-2 text-foreground break-all">{{ typeof cmd.result === 'string' ? cmd.result : JSON.stringify(cmd.result, null, 2) }}</div>
                    </div>
                  </div>
                </details>
              </div>
            </div>

            <!-- Raw Output Fallback -->
            <div v-else-if="task.raw_output" class="mt-2">
              <details class="group rounded-md border bg-background overflow-hidden">
                <summary class="p-2.5 cursor-pointer bg-muted/10 hover:bg-muted/30 text-xs font-medium text-muted-foreground transition-colors select-none outline-none">
                  View Raw Output
                </summary>
                <div class="p-3 border-t bg-muted/5 text-[13px] font-mono whitespace-pre-wrap overflow-x-auto text-foreground">
                  {{ task.raw_output }}
                </div>
              </details>
            </div>
          </div>
        </div>

        <!-- Validation errors from backend -->
        <Alert v-if="testValidationErrors.length > 0" variant="destructive">
          <AlertTriangle class="h-4 w-4" />
          <AlertTitle>Validation Errors</AlertTitle>
          <AlertDescription>
            <ul class="text-sm space-y-1">
              <li v-for="ve in testValidationErrors" :key="ve">{{ ve }}</li>
            </ul>
          </AlertDescription>
        </Alert>

        <!-- Raw result viewer -->
        <details class="rounded-md border bg-muted/10 p-3">
          <summary class="cursor-pointer text-sm font-medium">Raw Result JSON</summary>
          <pre class="mt-2 text-xs overflow-auto">{{ JSON.stringify(testResult.grading_result, null, 2) }}</pre>
        </details>
      </div>
    </CardContent>
  </Card>
</template>

<style scoped>
.json-editor :deep(.cm-editor) {
  font-size: 14px;
}
.json-editor :deep(.cm-editor.cm-focused) {
  outline: none;
}
.json-editor :deep(.cm-gutters) {
  border-right: 1px solid rgba(0, 0, 0, 0.1);
}
</style>
