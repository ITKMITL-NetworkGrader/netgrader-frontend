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
import { Plus, Trash2, AlertTriangle, Check, ChevronDown } from 'lucide-vue-next'
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

// ─── Dry Run mode ─────────────────────────────────────────────────────────────

type TestMode = 'live' | 'dry-run' | 'parser'
const testMode = ref<TestMode>('live')
const expandedDevices = ref<Set<number>>(new Set([0]))
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

// ─── Dry Run: parse_output actions extracted from YAML ────────────────────────

type ParseAction = {
  stepName: string
  parser: string          // 'regex' | 'textfsm' | 'jinja'
  pattern: string | null
  template: string | null
}

const dryRunActions = computed<ParseAction[]>(() => {
  try {
    const parsed = yaml.load(props.yamlContent) as any
    // 'commands' is the canonical key; also check 'steps' for forward-compat
    const cmds: any[] = Array.isArray(parsed?.commands)
      ? parsed.commands
      : Array.isArray(parsed?.steps) ? parsed.steps : []
    return cmds
      .filter((s: any) => s?.action === 'parse_output')
      .map((s: any) => ({
        stepName: s.name ?? 'Unnamed Step',
        parser: ((s.parameters?.parser as string) || 'regex').toLowerCase(),
        pattern: s.parameters?.pattern ?? null,
        template: s.parameters?.template ?? null,
      }))
  } catch { return [] }
})

type DryRunActionState = {
  inputText: string
  result: Record<string, any> | null
  isLoading: boolean
  error: string | null
}

const dryRunStates = ref<DryRunActionState[]>([])

// Keep state array in sync with dryRunActions; preserve inputText/result across YAML edits
watch(dryRunActions, (actions) => {
  const prev = dryRunStates.value
  dryRunStates.value = actions.map((_, i) => ({
    inputText: prev[i]?.inputText ?? '',
    result:    prev[i]?.result    ?? null,
    isLoading: false,
    error:     prev[i]?.error     ?? null,
  }))
}, { immediate: true })

const dryRunDebounceTimers: (ReturnType<typeof setTimeout> | null)[] = []

const parseDryRun = async (actionIdx: number) => {
  const action = dryRunActions.value[actionIdx]
  const state  = dryRunStates.value[actionIdx]
  if (!action || !state) return

  state.isLoading = true
  state.error  = null
  state.result = null

  try {
    const resp = await $fetch<{ success: boolean; message?: string; data?: any }>(
      `${backendURL}/v0/task-templates/parse-dry-run`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: {
          input:    state.inputText,
          parser:   action.parser,
          pattern:  action.pattern  ?? undefined,
          template: action.template ?? undefined,
        },
      }
    )
    if (!resp.success || !resp.data) {
      state.error = resp.message || 'Parse failed'
      return
    }
    const parsed = resp.data
    if (!parsed.success) {
      state.error = parsed.error || 'Parser returned an error'
    } else {
      state.result = parsed.result
    }
  } catch (err: any) {
    state.error = err?.data?.message || err?.message || 'Request failed'
  } finally {
    state.isLoading = false
  }
}

const scheduleDryRunParse = (actionIdx: number) => {
  const t = dryRunDebounceTimers[actionIdx]
  if (t) clearTimeout(t)
  dryRunDebounceTimers[actionIdx] = setTimeout(() => parseDryRun(actionIdx), 500)
}

// ─── Dry Run: NTC-templates (use_textfsm: true steps) ─────────────────────────

type NtcAction = {
  stepName: string
  command: string
}

const ntcDryRunActions = computed<NtcAction[]>(() => {
  try {
    const parsed = yaml.load(props.yamlContent) as any
    const cmds: any[] = Array.isArray(parsed?.commands)
      ? parsed.commands
      : Array.isArray(parsed?.steps) ? parsed.steps : []
    return cmds
      .filter((s: any) => s?.parameters?.use_textfsm === true && s?.parameters?.command)
      .map((s: any) => ({
        stepName: s.name ?? 'Unnamed Step',
        command: s.parameters.command as string,
      }))
  } catch { return [] }
})

type NtcDryRunState = {
  inputText: string
  platform: 'cisco_ios' | 'linux'
  result: any | null
  isLoading: boolean
  error: string | null
}

const ntcDryRunStates = ref<NtcDryRunState[]>([])

watch(ntcDryRunActions, (actions) => {
  const prev = ntcDryRunStates.value
  ntcDryRunStates.value = actions.map((_, i) => ({
    inputText: prev[i]?.inputText ?? '',
    platform:  prev[i]?.platform  ?? 'cisco_ios',
    result:    prev[i]?.result    ?? null,
    isLoading: false,
    error:     prev[i]?.error     ?? null,
  }))
}, { immediate: true })

const ntcDebounceTimers: (ReturnType<typeof setTimeout> | null)[] = []

const parseNtcDryRun = async (idx: number) => {
  const action = ntcDryRunActions.value[idx]
  const state  = ntcDryRunStates.value[idx]
  if (!action || !state) return

  state.isLoading = true
  state.error  = null
  state.result = null

  try {
    const resp = await $fetch<{ success: boolean; message?: string; data?: any }>(
      `${backendURL}/v0/task-templates/parse-dry-run`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: {
          input:    state.inputText,
          parser:   'textfsm',
          platform: state.platform,
          command:  action.command,
        },
      }
    )
    if (!resp.success || !resp.data) {
      state.error = resp.message || 'Parse failed'
      return
    }
    if (!resp.data.success) {
      state.error = resp.data.error || 'Parser returned an error'
    } else {
      state.result = resp.data.result
    }
  } catch (err: any) {
    state.error = err?.data?.message || err?.message || 'Request failed'
  } finally {
    state.isLoading = false
  }
}

const scheduleNtcDryRunParse = (idx: number) => {
  const t = ntcDebounceTimers[idx]
  if (t) clearTimeout(t)
  ntcDebounceTimers[idx] = setTimeout(() => parseNtcDryRun(idx), 500)
}

// ─── Dry Run: Validation testing ──────────────────────────────────────────────

type ValidationRule = {
  field: string
  condition: string
  value: any
  description?: string
}

const dryRunValidationRules = computed<ValidationRule[]>(() => {
  try {
    const parsed = yaml.load(props.yamlContent) as any
    if (!Array.isArray(parsed?.validation)) return []
    return parsed.validation.map((r: any) => ({
      field:       r.field       ?? '',
      condition:   r.condition   ?? 'equals',
      value:       r.value       ?? null,
      description: r.description ?? undefined,
    }))
  } catch { return [] }
})

const validationVarsText    = ref('{}')
const validationResults     = ref<any[] | null>(null)
const validationIsLoading   = ref(false)
const validationError       = ref<string | null>(null)
const validationAllPassed   = ref<boolean | null>(null)
const validationParamsValues = ref<Record<string, string>>({})

// Keep validationParamsValues in sync with YAML parameters (add new, preserve existing)
watch(yamlParameters, (params) => {
  const next: Record<string, string> = {}
  for (const p of params) {
    next[p.name] = validationParamsValues.value[p.name] ?? ''
  }
  validationParamsValues.value = next
}, { immediate: true })

// Coerce a string input to the most appropriate JS type for Jinja rendering
function parseParamValue(val: string): any {
  if (val === 'true')  return true
  if (val === 'false') return false
  if (val !== '' && !isNaN(Number(val))) return Number(val)
  return val
}

// Auto-scaffold the variables JSON from register: field names in the YAML
const dryRunRegisterNames = computed<string[]>(() => {
  try {
    const parsed = yaml.load(props.yamlContent) as any
    const cmds: any[] = Array.isArray(parsed?.commands)
      ? parsed.commands
      : Array.isArray(parsed?.steps) ? parsed.steps : []
    return cmds.filter((s: any) => s?.register).map((s: any) => s.register as string)
  } catch { return [] }
})

watch(dryRunRegisterNames, (names) => {
  try {
    const existing = JSON.parse(validationVarsText.value)
    let changed = false
    for (const name of names) {
      if (!(name in existing)) { existing[name] = null; changed = true }
    }
    if (changed) validationVarsText.value = JSON.stringify(existing, null, 2)
  } catch {
    const tmpl: Record<string, null> = {}
    for (const name of names) tmpl[name] = null
    validationVarsText.value = JSON.stringify(tmpl, null, 2)
  }
}, { immediate: true })

// One-click: fill variables JSON from the current Dry Run parse results above
const populateVarsFromParseResults = () => {
  try {
    const parsed = yaml.load(props.yamlContent) as any
    const cmds: any[] = Array.isArray(parsed?.commands)
      ? parsed.commands
      : Array.isArray(parsed?.steps) ? parsed.steps : []
    const vars: Record<string, any> = {}
    let parseIdx = 0
    let ntcIdx = 0
    for (const s of cmds) {
      if (s?.action === 'parse_output' && s?.register) {
        vars[s.register] = dryRunStates.value[parseIdx]?.result ?? null
        parseIdx++
      } else if (s?.parameters?.use_textfsm === true && s?.register) {
        vars[s.register] = ntcDryRunStates.value[ntcIdx]?.result ?? null
        ntcIdx++
      } else if (s?.register) {
        vars[s.register] = null
      }
    }
    validationVarsText.value = JSON.stringify(vars, null, 2)
  } catch { /* keep current */ }
}

const runValidationDryRun = async () => {
  if (!dryRunValidationRules.value.length) return
  validationIsLoading.value = true
  validationError.value     = null
  validationResults.value   = null
  validationAllPassed.value = null

  let variables: Record<string, any>
  try {
    variables = JSON.parse(validationVarsText.value)
  } catch {
    validationError.value = 'Variables JSON is invalid — please fix the syntax.'
    validationIsLoading.value = false
    return
  }

  // Coerce string inputs to typed values before sending to backend
  const parameters: Record<string, any> = {}
  for (const [k, v] of Object.entries(validationParamsValues.value)) {
    parameters[k] = parseParamValue(v)
  }

  try {
    const resp = await $fetch<{ success: boolean; message?: string; data?: any }>(
      `${backendURL}/v0/task-templates/validate-dry-run`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: { variables, rules: dryRunValidationRules.value, parameters },
      }
    )
    if (!resp.success || !resp.data) {
      validationError.value = resp.message || 'Validation failed'
      return
    }
    if (!resp.data.success) {
      validationError.value = resp.data.error || 'Validation returned an error'
    } else {
      validationResults.value   = resp.data.results
      validationAllPassed.value = resp.data.all_passed
    }
  } catch (err: any) {
    validationError.value = err?.data?.message || err?.message || 'Request failed'
  } finally {
    validationIsLoading.value = false
  }
}

// ─── Unified ordered list for rendering (preserves YAML step sequence) ────────

type UnifiedDryRunItem =
  | { kind: 'parse'; stateIdx: number } & ParseAction
  | { kind: 'ntc';   stateIdx: number } & NtcAction

const unifiedDryRunItems = computed<UnifiedDryRunItem[]>(() => {
  try {
    const parsed = yaml.load(props.yamlContent) as any
    const cmds: any[] = Array.isArray(parsed?.commands)
      ? parsed.commands
      : Array.isArray(parsed?.steps) ? parsed.steps : []
    let parseIdx = 0
    let ntcIdx = 0
    const items: UnifiedDryRunItem[] = []
    for (const s of cmds) {
      if (s?.action === 'parse_output') {
        items.push({
          kind: 'parse',
          stateIdx: parseIdx++,
          stepName: s.name ?? 'Unnamed Step',
          parser: ((s.parameters?.parser as string) || 'regex').toLowerCase(),
          pattern: s.parameters?.pattern ?? null,
          template: s.parameters?.template ?? null,
        })
      } else if (s?.parameters?.use_textfsm === true && s?.parameters?.command) {
        items.push({
          kind: 'ntc',
          stateIdx: ntcIdx++,
          stepName: s.name ?? 'Unnamed Step',
          command: s.parameters.command as string,
        })
      }
    }
    return items
  } catch { return [] }
})

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

const toggleDevice = (idx: number) => {
  if (expandedDevices.value.has(idx)) {
    expandedDevices.value.delete(idx)
  } else {
    expandedDevices.value.add(idx)
  }
  // Trigger reactivity since Set mutations aren't tracked automatically
  expandedDevices.value = new Set(expandedDevices.value)
}

const addDevice = () => {
  const n = formDevices.value.length + 1
  const newIdx = formDevices.value.length
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
  // Auto-open the newly added device
  expandedDevices.value = new Set([...expandedDevices.value, newIdx])
}

const removeDevice = (index: number) => {
  const removedId = formDevices.value[index]?.id
  formDevices.value.splice(index, 1)
  if (removedId && formExecutionDevice.value === removedId && formDevices.value.length > 0) {
    formExecutionDevice.value = formDevices.value[0]!.id
  }
  // Rebuild expanded set: drop removed index, shift indices above it down by 1
  const next = new Set<number>()
  for (const i of expandedDevices.value) {
    if (i < index) next.add(i)
    else if (i > index) next.add(i - 1)
  }
  expandedDevices.value = next
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
      ip_address: 'gns3.it.kmitl.ac.th',
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
          <CardDescription>{{
            testMode === 'live' ? 'Run a direct preview test without RabbitMQ' :
            'Test parse_output steps against raw device output — no device needed'
          }}</CardDescription>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <Tabs :model-value="testMode" class="w-auto">
            <TabsList class="grid grid-cols-2">
              <TabsTrigger value="live" @click="testMode = 'live'">Live Test</TabsTrigger>
              <TabsTrigger value="dry-run" @click="testMode = 'dry-run'">Dry Run</TabsTrigger>
            </TabsList>
          </Tabs>
          <template v-if="testMode === 'live'">
            <Button variant="outline" size="sm" @click="loadSamplePayload" :disabled="isTesting">
              Load Sample
            </Button>
            <Button variant="outline" size="sm" @click="runTemplateTest(true)" :disabled="isTesting">
              {{ isTesting ? 'Testing...' : 'Validate' }}
            </Button>
            <Button size="sm" @click="runTemplateTest(false)" :disabled="isTesting" class="bg-emerald-600 hover:bg-emerald-700">
              {{ isTesting ? 'Running...' : 'Run Test' }}
            </Button>
          </template>
        </div>
      </div>
    </CardHeader>

    <CardContent>

      <!-- ── Live Test ── -->
      <div v-if="testMode === 'live'" class="space-y-4">

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
            class="rounded-md border bg-muted/20 overflow-hidden"
          >
            <!-- Accordion trigger -->
            <button
              type="button"
              class="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/40 transition-colors"
              @click="toggleDevice(idx)"
            >
              <div class="flex items-center gap-2 min-w-0">
                <ChevronDown
                  class="h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200"
                  :class="{ '-rotate-90': !expandedDevices.has(idx) }"
                />
                <span class="text-xs font-medium">{{ device.id || `Device ${idx + 1}` }}</span>
                <span v-if="!expandedDevices.has(idx)" class="text-xs text-muted-foreground truncate font-mono">
                  {{ [device.ip_address, device.port].filter(Boolean).join(':') || '—' }}
                  · {{ device.platform }}
                </span>
              </div>
              <Button
                v-if="formDevices.length > 1"
                variant="ghost"
                size="icon"
                class="h-6 w-6 text-destructive hover:text-destructive shrink-0 ml-2"
                @click.stop="removeDevice(idx)"
              >
                <Trash2 class="h-3 w-3" />
              </Button>
            </button>

            <!-- Accordion body -->
            <div v-show="expandedDevices.has(idx)" class="p-3 border-t">
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
            </div> <!-- end accordion body -->
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

            <!-- Debug Info: Parameters Received -->
            <details
              v-if="task.debug_info?.parameters_received && Object.keys(task.debug_info.parameters_received).length"
              open
              class="rounded-md border bg-background overflow-hidden mt-3"
            >
              <summary class="px-3 py-2 cursor-pointer bg-muted/10 hover:bg-muted/30 transition-colors select-none outline-none text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Parameters Received
              </summary>
              <div class="p-3 border-t text-[13px] font-mono overflow-x-auto text-foreground">
                <pre class="m-0">{{ JSON.stringify(task.debug_info.parameters_received, null, 2) }}</pre>
              </div>
            </details>

            <!-- Debug Info: Commands Executed -->
            <details
              v-if="task.debug_info?.command_results?.length"
              open
              class="rounded-md border bg-background overflow-hidden mt-3"
            >
              <summary class="px-3 py-2 cursor-pointer bg-muted/10 hover:bg-muted/30 transition-colors select-none outline-none text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Commands Executed ({{ task.debug_info.command_results.length }})
              </summary>
              <div class="p-3 border-t space-y-2">
                <details
                  v-for="(cmd, i) in task.debug_info.command_results"
                  :key="cmd.name + i"
                  class="group rounded-md border bg-muted/5 overflow-hidden"
                >
                  <summary class="flex items-center justify-between p-2.5 cursor-pointer hover:bg-muted/20 transition-colors select-none outline-none">
                    <div class="flex items-center gap-2">
                      <Check v-if="cmd.success" class="h-4 w-4 text-emerald-600" />
                      <AlertTriangle v-else class="h-4 w-4 text-destructive" />
                      <span class="font-mono text-sm font-medium">{{ cmd.name }}</span>
                    </div>
                    <span class="text-[10px] text-muted-foreground font-mono uppercase bg-muted/50 px-1.5 py-0.5 rounded border">{{ cmd.action }}</span>
                  </summary>
                  <div class="p-3 border-t text-[13px] font-mono whitespace-pre-wrap overflow-x-auto text-muted-foreground">
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
            </details>

            <!-- Debug Info: Registered Variables -->
            <details
              v-if="task.debug_info?.registered_variables && Object.keys(task.debug_info.registered_variables).length"
              open
              class="rounded-md border bg-background overflow-hidden mt-3"
            >
              <summary class="px-3 py-2 cursor-pointer bg-muted/10 hover:bg-muted/30 transition-colors select-none outline-none text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Registered Variables
              </summary>
              <div class="p-3 border-t text-[13px] font-mono overflow-x-auto text-foreground">
                <pre class="m-0">{{ JSON.stringify(task.debug_info.registered_variables, null, 2) }}</pre>
              </div>
            </details>

            <!-- Debug Info: Validation Rules -->
            <details
              v-if="task.debug_info?.validation_details?.length"
              open
              class="rounded-md border bg-background overflow-hidden mt-3"
            >
              <summary class="px-3 py-2 cursor-pointer bg-muted/10 hover:bg-muted/30 transition-colors select-none outline-none text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Validation Rules ({{ task.debug_info.validation_details.length }})
              </summary>
              <div class="p-3 border-t space-y-2">
                <div v-for="(v, idx) in task.debug_info.validation_details" :key="v.field + idx" class="rounded-md border bg-muted/5 p-3 text-[13px] font-mono overflow-x-auto text-muted-foreground">
                  <div class="flex items-center gap-2 mb-2 flex-wrap text-[13px]">
                    <Check v-if="v.passed" class="h-4 w-4 text-emerald-600 shrink-0" />
                    <AlertTriangle v-else class="h-4 w-4 text-destructive shrink-0" />
                    <span class="font-medium text-foreground">{{ v.field }}</span>
                    <span class="text-xs text-muted-foreground px-1 py-0.5 bg-muted rounded">{{ v.condition }}</span>
                    <span class="font-bold text-foreground">{{ v.expected }}</span>
                  </div>
                  <div class="text-xs border-l-2 pl-3 py-0.5 border-border/50">
                    <span class="text-[10px] uppercase font-bold text-foreground/70 mr-1">Actual:</span>
                    <span :class="v.passed ? 'text-emerald-600' : 'text-destructive'">{{ typeof v.actual === 'object' ? JSON.stringify(v.actual) : String(v.actual) }}</span>
                  </div>
                  <div v-if="v.description" class="text-xs mt-2 text-muted-foreground italic">{{ v.description }}</div>
                </div>
              </div>
            </details>

            <!-- Debug Info: Custom Debug Points -->
            <details
              v-if="task.debug_info?.custom_debug_points && Object.keys(task.debug_info.custom_debug_points).length"
              open
              class="rounded-md border bg-background overflow-hidden mt-3"
            >
              <summary class="px-3 py-2 cursor-pointer bg-muted/10 hover:bg-muted/30 transition-colors select-none outline-none text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Custom Debug Points
              </summary>
              <div class="p-3 border-t text-[13px] font-mono overflow-x-auto text-foreground">
                <pre class="m-0">{{ JSON.stringify(task.debug_info.custom_debug_points, null, 2) }}</pre>
              </div>
            </details>

            <!-- Raw Output Fallback -->
            <div v-else-if="task.raw_output" class="mt-4">
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

      </div>
      <!-- ── end Live Test ── -->

      <!-- ── Dry Run ── -->
      <div v-else-if="testMode === 'dry-run'" class="space-y-4">

        <!-- Empty state: no dry-run steps in YAML -->
        <div
          v-if="unifiedDryRunItems.length === 0"
          class="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground"
        >
          <p class="font-medium">No testable steps found</p>
          <p class="mt-1">Add <code class="font-mono text-xs bg-muted px-1 py-0.5 rounded">action: parse_output</code> steps or steps with <code class="font-mono text-xs bg-muted px-1 py-0.5 rounded">use_textfsm: true</code> to use Dry Run.</p>
        </div>

        <!-- All dry-run items in YAML order -->
        <template v-for="(item, _i) in unifiedDryRunItems" :key="item.kind + item.stepName + _i">

          <!-- ── parse_output step ── -->
          <div v-if="item.kind === 'parse'" class="rounded-md border overflow-hidden">
            <div class="flex items-center justify-between gap-2 px-4 py-3 bg-muted/30 border-b">
              <div class="flex items-center gap-2 min-w-0">
                <span class="font-mono text-sm font-medium truncate">{{ item.stepName }}</span>
                <Badge variant="outline" class="text-xs shrink-0">{{ item.parser }}</Badge>
              </div>
              <Button size="sm" variant="outline" class="h-7 text-xs shrink-0"
                :disabled="dryRunStates[item.stateIdx]?.isLoading"
                @click="parseDryRun(item.stateIdx)"
              >
                {{ dryRunStates[item.stateIdx]?.isLoading ? 'Parsing...' : 'Parse' }}
              </Button>
            </div>
            <div class="px-4 py-2 bg-muted/10 border-b">
              <div class="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">
                {{ item.parser === 'textfsm' ? 'TextFSM Template' : item.parser === 'jinja' ? 'Jinja Template' : 'Regex Pattern' }}
              </div>
              <pre class="text-xs font-mono text-foreground whitespace-pre-wrap break-all">{{
                item.parser === 'textfsm' || item.parser === 'jinja'
                  ? (item.template || item.pattern || '—')
                  : (item.pattern || '—')
              }}</pre>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
              <div class="p-3 space-y-1.5">
                <label class="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Device Output (Input)</label>
                <textarea
                  :value="dryRunStates[item.stateIdx]?.inputText ?? ''"
                  @input="(e: Event) => {
                    if (dryRunStates[item.stateIdx]) {
                      dryRunStates[item.stateIdx]!.inputText = (e.target as HTMLTextAreaElement).value
                      scheduleDryRunParse(item.stateIdx)
                    }
                  }"
                  class="w-full min-h-[180px] rounded-md border border-input bg-background px-3 py-2 font-mono text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Paste raw device output here…"
                  spellcheck="false"
                />
              </div>
              <div class="p-3 space-y-1.5">
                <label class="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Parsed Result</label>
                <div v-if="dryRunStates[item.stateIdx]?.isLoading" class="min-h-[180px] rounded-md border bg-muted/20 animate-pulse" />
                <Alert v-else-if="dryRunStates[item.stateIdx]?.error" variant="destructive" class="min-h-[180px]">
                  <AlertTriangle class="h-4 w-4" />
                  <AlertTitle>Parse Error</AlertTitle>
                  <AlertDescription class="font-mono text-xs break-all">{{ dryRunStates[item.stateIdx]?.error }}</AlertDescription>
                </Alert>
                <div v-else-if="dryRunStates[item.stateIdx]?.result !== null" class="min-h-[180px] rounded-md border bg-muted/5 p-3 overflow-auto">
                  <pre class="text-xs font-mono text-foreground whitespace-pre-wrap">{{ JSON.stringify(dryRunStates[item.stateIdx]?.result, null, 2) }}</pre>
                </div>
                <div v-else class="min-h-[180px] rounded-md border border-dashed flex items-center justify-center text-xs text-muted-foreground">
                  Paste input and press Parse (or wait 500 ms after typing)
                </div>
              </div>
            </div>
          </div>

          <!-- ── use_textfsm: true step ── -->
          <div v-else class="rounded-md border overflow-hidden">
            <div class="flex items-center justify-between gap-2 px-4 py-3 bg-muted/30 border-b">
              <div class="flex items-center gap-2 min-w-0">
                <span class="font-mono text-sm font-medium truncate">{{ item.stepName }}</span>
                <Badge variant="outline" class="text-xs shrink-0">ntc-templates</Badge>
              </div>
              <Button size="sm" variant="outline" class="h-7 text-xs shrink-0"
                :disabled="ntcDryRunStates[item.stateIdx]?.isLoading"
                @click="parseNtcDryRun(item.stateIdx)"
              >
                {{ ntcDryRunStates[item.stateIdx]?.isLoading ? 'Parsing...' : 'Parse' }}
              </Button>
            </div>
            <div class="px-4 py-2 bg-muted/10 border-b flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div class="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">Command</div>
                <span class="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground">{{ item.command }}</span>
              </div>
              <div>
                <div class="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">Platform</div>
                <div class="flex rounded-md border overflow-hidden text-xs">
                  <button
                    :class="ntcDryRunStates[item.stateIdx]?.platform === 'cisco_ios'
                      ? 'bg-primary text-primary-foreground px-3 py-1'
                      : 'bg-background text-foreground hover:bg-muted px-3 py-1'"
                    @click="if (ntcDryRunStates[item.stateIdx]) { ntcDryRunStates[item.stateIdx]!.platform = 'cisco_ios'; scheduleNtcDryRunParse(item.stateIdx) }"
                  >cisco_ios</button>
                  <button
                    :class="ntcDryRunStates[item.stateIdx]?.platform === 'linux'
                      ? 'bg-primary text-primary-foreground px-3 py-1 border-l'
                      : 'bg-background text-foreground hover:bg-muted px-3 py-1 border-l'"
                    @click="if (ntcDryRunStates[item.stateIdx]) { ntcDryRunStates[item.stateIdx]!.platform = 'linux'; scheduleNtcDryRunParse(item.stateIdx) }"
                  >linux</button>
                </div>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
              <div class="p-3 space-y-1.5">
                <label class="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Device Output (Input)</label>
                <textarea
                  :value="ntcDryRunStates[item.stateIdx]?.inputText ?? ''"
                  @input="(e: Event) => {
                    if (ntcDryRunStates[item.stateIdx]) {
                      ntcDryRunStates[item.stateIdx]!.inputText = (e.target as HTMLTextAreaElement).value
                      scheduleNtcDryRunParse(item.stateIdx)
                    }
                  }"
                  class="w-full min-h-[180px] rounded-md border border-input bg-background px-3 py-2 font-mono text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Paste raw device output here…"
                  spellcheck="false"
                />
              </div>
              <div class="p-3 space-y-1.5">
                <label class="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Parsed Result</label>
                <div v-if="ntcDryRunStates[item.stateIdx]?.isLoading" class="min-h-[180px] rounded-md border bg-muted/20 animate-pulse" />
                <Alert v-else-if="ntcDryRunStates[item.stateIdx]?.error" variant="destructive" class="min-h-[180px]">
                  <AlertTriangle class="h-4 w-4" />
                  <AlertTitle>Parse Error</AlertTitle>
                  <AlertDescription class="font-mono text-xs break-all">{{ ntcDryRunStates[item.stateIdx]?.error }}</AlertDescription>
                </Alert>
                <div v-else-if="ntcDryRunStates[item.stateIdx]?.result !== null" class="min-h-[180px] rounded-md border bg-muted/5 p-3 overflow-auto">
                  <pre class="text-xs font-mono text-foreground whitespace-pre-wrap">{{ JSON.stringify(ntcDryRunStates[item.stateIdx]?.result, null, 2) }}</pre>
                </div>
                <div v-else class="min-h-[180px] rounded-md border border-dashed flex items-center justify-center text-xs text-muted-foreground">
                  Paste input and press Parse (or wait 500 ms after typing)
                </div>
              </div>
            </div>
          </div>

        </template>

        <!-- ── Validation Rules testing ── -->
        <div v-if="dryRunValidationRules.length > 0" class="rounded-md border overflow-hidden">

          <!-- Header -->
          <div class="flex items-center justify-between gap-2 px-4 py-3 bg-muted/30 border-b flex-wrap">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-semibold">Validation Rules</span>
              <Badge variant="outline" class="text-xs shrink-0">{{ dryRunValidationRules.length }} rules</Badge>
              <Badge v-if="validationAllPassed === true" class="text-xs bg-emerald-600 text-white hover:bg-emerald-600 shrink-0">All Passed</Badge>
              <Badge v-if="validationAllPassed === false" variant="destructive" class="text-xs shrink-0">
                {{ validationResults?.filter((r: any) => !r.passed).length }} Failed
              </Badge>
            </div>
            <div class="flex items-center gap-2">
              <Button size="sm" variant="ghost" class="h-7 text-xs shrink-0"
                :disabled="validationIsLoading"
                title="Fill variables from current parse results above"
                @click="populateVarsFromParseResults"
              >
                Use Parse Results
              </Button>
              <Button size="sm" variant="outline" class="h-7 text-xs shrink-0"
                :disabled="validationIsLoading"
                @click="runValidationDryRun"
              >
                {{ validationIsLoading ? 'Testing…' : 'Test Validation' }}
              </Button>
            </div>
          </div>

          <!-- Rules list + Variables JSON side by side -->
          <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">

            <!-- Left: rules list -->
            <div class="p-3 space-y-2">
              <label class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rules</label>
              <div
                v-for="(rule, i) in dryRunValidationRules"
                :key="rule.field + i"
                class="rounded-md border p-2.5 text-xs space-y-1.5"
                :class="validationResults?.[i]
                  ? (validationResults[i].passed ? 'border-emerald-300 bg-emerald-50/50' : 'border-destructive/40 bg-destructive/5')
                  : ''"
              >
                <div class="flex items-center gap-2 flex-wrap">
                  <Check         v-if="validationResults?.[i]?.passed"                         class="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <AlertTriangle v-else-if="validationResults?.[i] && !validationResults[i].passed" class="h-3.5 w-3.5 text-destructive shrink-0" />
                  <div v-else class="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                  <span class="font-mono font-semibold text-foreground">{{ rule.field }}</span>
                  <Badge variant="secondary" class="text-xs font-normal shrink-0">{{ rule.condition }}</Badge>
                  <span class="font-mono text-muted-foreground">{{ JSON.stringify(rule.value) }}</span>
                </div>
                <p v-if="rule.description" class="text-muted-foreground italic pl-5">{{ rule.description }}</p>
                <div v-if="validationResults?.[i]" class="pl-5 border-l-2 border-border">
                  <span class="text-[10px] uppercase font-bold text-foreground/60 mr-1">Actual:</span>
                  <span class="font-mono" :class="validationResults[i].passed ? 'text-emerald-600' : 'text-destructive'">
                    {{ JSON.stringify(validationResults[i].actual) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Right: parameters + variables JSON input -->
            <div class="p-3 space-y-3">

              <!-- Parameter inputs (only shown when YAML has parameters:) -->
              <div v-if="yamlParameters.length > 0" class="space-y-2">
                <label class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parameters</label>
                <div
                  v-for="param in yamlParameters"
                  :key="param.name"
                  class="flex items-center gap-2"
                >
                  <span class="font-mono text-xs text-foreground/80 shrink-0 w-28 truncate" :title="param.name">{{ param.name }}</span>
                  <Input
                    v-model="validationParamsValues[param.name]"
                    :placeholder="param.description ?? param.datatype ?? 'value'"
                    class="h-7 text-xs font-mono"
                    spellcheck="false"
                  />
                  <Badge v-if="param.required" variant="destructive" class="text-[10px] shrink-0 px-1 py-0">req</Badge>
                  <Badge v-else variant="secondary" class="text-[10px] shrink-0 px-1 py-0">opt</Badge>
                </div>
                <p class="text-xs text-muted-foreground">
                  Used to render <code class="font-mono bg-muted px-0.5 rounded text-[11px]">&#123;&#123; name &#125;&#125;</code> Jinja expressions inside validation rule values.
                </p>
              </div>

              <!-- Registered Variables JSON -->
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registered Variables (JSON)</label>
                <textarea
                  v-model="validationVarsText"
                  class="w-full min-h-[150px] rounded-md border border-input bg-background px-3 py-2 font-mono text-xs resize-y focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder='{ "parsed": { "match_count": 1, "first_match": "80" } }'
                  spellcheck="false"
                />
                <p class="text-xs text-muted-foreground">
                  Keys must match <code class="font-mono bg-muted px-0.5 rounded text-[11px]">register:</code> names from your YAML steps.
                  Use <strong>Use Parse Results</strong> to fill automatically from above.
                </p>
              </div>

              <Alert v-if="validationError" variant="destructive">
                <AlertTriangle class="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription class="font-mono text-xs break-all">{{ validationError }}</AlertDescription>
              </Alert>
            </div>

          </div>
        </div>

      </div>
      <!-- ── end Dry Run ── -->

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
