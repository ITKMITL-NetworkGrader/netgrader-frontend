<script setup lang="ts">
import { ref, watch } from 'vue'
import { AlertTriangle, AlertCircle, Home, ChevronRight, Wand2 } from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'

const config = useRuntimeConfig()
const backendURL = config.public.backendurl

type PlaygroundParser = 'regex' | 'jinja' | 'textfsm' | 'ntc-templates'

const playgroundParser = ref<PlaygroundParser>('regex')
const playgroundInput = ref('')
const playgroundTemplate = ref('')
const playgroundPlatform = ref<'cisco_ios' | 'linux'>('cisco_ios')
const playgroundCommand = ref('')
const playgroundResult = ref<any | null>(null)
const playgroundIsLoading = ref(false)
const playgroundError = ref<string | null>(null)

// Flex-grow values for split pane. 3-panel: [input, template, result], 2-panel NTC: [input, result]
const playgroundFlexValues = ref<number[]>([33, 34, 33])
const playgroundContainerRef = ref<HTMLDivElement | null>(null)

let _pgDragging = false
let _pgDividerIdx = 0
let _pgDragStartX = 0
let _pgDragStartFlex: number[] = []

const pgStartDrag = (dividerIdx: number, event: PointerEvent) => {
  _pgDragging = true
  _pgDividerIdx = dividerIdx
  _pgDragStartX = event.clientX
  _pgDragStartFlex = [...playgroundFlexValues.value]
  document.addEventListener('pointermove', _pgOnDrag)
  document.addEventListener('pointerup', _pgStopDrag)
}

const _pgOnDrag = (event: PointerEvent) => {
  if (!_pgDragging || !playgroundContainerRef.value) return
  const containerWidth = playgroundContainerRef.value.getBoundingClientRect().width
  const totalFlex = _pgDragStartFlex.reduce((a, b) => a + b, 0)
  const deltaFlex = ((event.clientX - _pgDragStartX) / containerWidth) * totalFlex
  const newValues = [..._pgDragStartFlex]
  const idx = _pgDividerIdx
  newValues[idx] = Math.max(10, (_pgDragStartFlex[idx] ?? 33) + deltaFlex)
  newValues[idx + 1] = Math.max(10, (_pgDragStartFlex[idx + 1] ?? 33) - deltaFlex)
  playgroundFlexValues.value = newValues
}

const _pgStopDrag = () => {
  _pgDragging = false
  document.removeEventListener('pointermove', _pgOnDrag)
  document.removeEventListener('pointerup', _pgStopDrag)
}

watch(playgroundParser, (p) => {
  playgroundFlexValues.value = p === 'ntc-templates' ? [50, 50] : [33, 34, 33]
  playgroundResult.value = null
  playgroundError.value = null
})

let _pgDebounceTimer: ReturnType<typeof setTimeout> | null = null

const parsePlayground = async () => {
  playgroundIsLoading.value = true
  playgroundError.value = null
  playgroundResult.value = null
  try {
    const isNtc = playgroundParser.value === 'ntc-templates'
    const body: Record<string, any> = {
      input: playgroundInput.value,
      parser: isNtc ? 'textfsm' : playgroundParser.value,
    }
    if (!isNtc) {
      if (playgroundParser.value === 'regex') body.pattern = playgroundTemplate.value
      else body.template = playgroundTemplate.value
    } else {
      body.platform = playgroundPlatform.value
      body.command = playgroundCommand.value
    }
    const resp = await $fetch<{ success: boolean; message?: string; data?: any }>(
      `${backendURL}/v0/task-templates/parse-dry-run`,
      { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body }
    )
    if (!resp.success || !resp.data) {
      playgroundError.value = resp.message || 'Parse failed'
      return
    }
    if (!resp.data.success) {
      playgroundError.value = resp.data.error || 'Parser returned an error'
    } else {
      playgroundResult.value = resp.data.result
    }
  } catch (err: any) {
    playgroundError.value = err?.data?.message || err?.message || 'Request failed'
  } finally {
    playgroundIsLoading.value = false
  }
}

const schedulePlaygroundParse = () => {
  if (_pgDebounceTimer) clearTimeout(_pgDebounceTimer)
  _pgDebounceTimer = setTimeout(parsePlayground, 500)
}
</script>

<template>
  <div>
    <!-- Navigation Breadcrumb -->
    <div class="border-b bg-background p-4 sticky top-16 z-40 shadow-sm">
      <div class="flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <NuxtLink to="/" class="flex items-center hover:text-primary transition-colors">
                <Home class="h-4 w-4" />
              </NuxtLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight class="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <NuxtLink to="/manage" class="hover:text-primary transition-colors">
                Manage
              </NuxtLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight class="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage class="font-medium">Parser Playground</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>

    <div class="p-4 pb-8 max-w-screen-2xl mx-auto">
      <div class="mb-6">
        <h1 class="text-4xl font-bold flex items-center gap-3">
          <Wand2 class="h-8 w-8 text-primary" />
          Parser Playground
        </h1>
        <p class="text-muted-foreground mt-2 text-lg">Test and develop your parsing rules interactively before adding them to your task templates.</p>
      </div>

      <Card class="border-border/50">
        <CardContent class="p-4 space-y-4">
          <!-- Controls row -->
          <div class="flex items-center gap-3 flex-wrap">
            <!-- Parser selector -->
            <div class="flex items-center gap-2">
              <label class="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Parser</label>
              <Select :model-value="playgroundParser" @update:model-value="(v: any) => { playgroundParser = v; }">
                <SelectTrigger class="h-9 w-48 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regex">Regex</SelectItem>
                  <SelectItem value="jinja">Jinja</SelectItem>
                  <SelectItem value="textfsm">TextFSM</SelectItem>
                  <SelectItem value="ntc-templates">NTC-Templates</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <!-- NTC-Templates: platform toggle + command -->
            <template v-if="playgroundParser === 'ntc-templates'">
              <div class="flex items-center gap-2">
                <label class="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Platform</label>
                <div class="flex rounded-md border overflow-hidden text-sm h-9">
                  <button
                    :class="playgroundPlatform === 'cisco_ios'
                      ? 'bg-primary text-primary-foreground px-4'
                      : 'bg-background text-foreground hover:bg-muted px-4'"
                    @click="playgroundPlatform = 'cisco_ios'; schedulePlaygroundParse()"
                  >cisco_ios</button>
                  <button
                    :class="playgroundPlatform === 'linux'
                      ? 'bg-primary text-primary-foreground px-4 border-l'
                      : 'bg-background text-foreground hover:bg-muted px-4 border-l'"
                    @click="playgroundPlatform = 'linux'; schedulePlaygroundParse()"
                  >linux</button>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <label class="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Command</label>
                <Input
                  v-model="playgroundCommand"
                  placeholder="show ip dhcp binding"
                  class="h-9 font-mono w-64"
                  @input="schedulePlaygroundParse()"
                />
              </div>
            </template>

            <Button class="ml-auto" :disabled="playgroundIsLoading" @click="parsePlayground">
              {{ playgroundIsLoading ? 'Parsing…' : 'Run Parser' }}
            </Button>
          </div>

          <!-- Resizable split pane -->
          <div
            ref="playgroundContainerRef"
            class="flex rounded-md border overflow-hidden select-none bg-background shadow-sm"
            style="height: calc(100vh - 300px); min-height: 500px;"
          >
            <!-- Input panel -->
            <div
              :style="{ flex: `${playgroundFlexValues[0]} 1 0%` }"
              class="flex flex-col min-w-0 overflow-hidden"
            >
              <div class="px-4 py-2 bg-muted/40 border-b text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between shrink-0">
                <span>Input Data</span>
                <span class="text-[10px] font-normal lowercase tracking-normal bg-background px-1.5 py-0.5 rounded border">Raw device output</span>
              </div>
              <textarea
                v-model="playgroundInput"
                @input="schedulePlaygroundParse()"
                class="flex-1 w-full p-4 font-mono text-sm resize-none focus:outline-none focus:ring-inset focus:ring-2 focus:ring-primary/20"
                placeholder="Paste your raw device output here…"
                spellcheck="false"
              />
            </div>

            <!-- Divider 1 -->
            <div
              class="w-1.5 bg-border/60 hover:bg-primary/50 cursor-col-resize shrink-0 transition-colors z-10"
              @pointerdown.prevent="pgStartDrag(0, $event)"
            />

            <!-- Template / Pattern panel (hidden for ntc-templates) -->
            <template v-if="playgroundParser !== 'ntc-templates'">
              <div
                :style="{ flex: `${playgroundFlexValues[1]} 1 0%` }"
                class="flex flex-col min-w-0 overflow-hidden"
              >
                <div class="px-4 py-2 bg-muted/40 border-b border-l border-t-0 border-r-0 text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between shrink-0">
                  <span>{{ playgroundParser === 'regex' ? 'Pattern' : 'Template' }}</span>
                  <span class="text-[10px] font-normal tracking-normal bg-background px-1.5 py-0.5 rounded border">{{ playgroundParser }}</span>
                </div>
                <textarea
                  v-model="playgroundTemplate"
                  @input="schedulePlaygroundParse()"
                  class="flex-1 w-full p-4 font-mono text-sm resize-none border-l bg-muted/5 focus:outline-none focus:ring-inset focus:ring-2 focus:ring-primary/20 focus:bg-background transition-colors"
                  :placeholder="playgroundParser === 'regex'
                    ? 'Enter regex pattern (e.g. ^Interface (?<intf>\\S+))...'
                    : playgroundParser === 'jinja'
                      ? 'Enter Jinja2 template...'
                      : 'Value Interface (\\S+)\n\nStart\n  ^Interface ${Interface} -> Record'"
                  spellcheck="false"
                />
              </div>

              <!-- Divider 2 -->
              <div
                class="w-1.5 bg-border/60 hover:bg-primary/50 cursor-col-resize shrink-0 transition-colors z-10"
                @pointerdown.prevent="pgStartDrag(1, $event)"
              />
            </template>

            <!-- Result panel -->
            <div
              :style="{ flex: `${playgroundFlexValues[playgroundParser !== 'ntc-templates' ? 2 : 1]} 1 0%` }"
              class="flex flex-col min-w-0 overflow-hidden"
            >
              <div class="px-4 py-2 bg-muted/40 border-b border-l border-t-0 border-r-0 text-xs font-bold text-muted-foreground uppercase tracking-wider shrink-0 w-full">
                Result
              </div>
              <div class="flex-1 overflow-auto border-l bg-muted/5">
                <div v-if="playgroundIsLoading" class="h-full w-full bg-muted/30 animate-pulse" />
                <div v-else-if="playgroundError" class="p-4">
                  <Alert variant="destructive">
                    <AlertTriangle class="h-4 w-4" />
                    <AlertTitle>Parser Error</AlertTitle>
                    <AlertDescription class="font-mono text-xs break-all mt-2">{{ playgroundError }}</AlertDescription>
                  </Alert>
                </div>
                <pre
                  v-else-if="playgroundResult !== null"
                  class="p-4 text-sm font-mono text-foreground whitespace-pre-wrap break-words"
                >{{ JSON.stringify(playgroundResult, null, 2) }}</pre>
                <div v-else class="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-background/50">
                  <Wand2 class="h-12 w-12 mb-4 opacity-20" />
                  <p class="font-medium text-lg text-foreground/70">Ready to Parse</p>
                  <p class="text-sm mt-2 max-w-sm">Provide input along with your template rules, then preview the parsed JSON payload here.</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
