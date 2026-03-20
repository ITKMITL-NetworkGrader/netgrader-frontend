<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import {
  Server,
  Play,
  Trash2,
  Loader2,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Network,
  Box,
  Link2,
  AlertCircle,
} from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ClabNodeAccessPanel from './ClabNodeAccessPanel.vue'
import { useClab, type ClabServerConfig } from '@/composables/useClab'
import { toast } from 'vue-sonner'

// ─── Composable ──────────────────────────────────────────────────────────────

const {
  isLoading,
  nodes: inspectedNodeList,
  testConnectivity,
  listPlaygroundLabs,
  deployPlaygroundLab,
  destroyPlaygroundLab,
  inspectPlaygroundLab,
} = useClab()

// ─── Server config ────────────────────────────────────────────────────────────

const form = reactive<ClabServerConfig>({
  serverIp: '',
  serverPort: 8080,
  username: 'admin',
  password: '',
})

const connectionTested = ref(false)
const connectionVersion = ref<string | null>(null)

async function handleTestConnectivity() {
  connectionTested.value = false
  connectionVersion.value = null
  const result = await testConnectivity({ ...form })
  if (result.success) {
    connectionTested.value = true
    connectionVersion.value = result.version ?? null
    toast.success('Connected to clab-api-server', {
      description: result.version ? `Version: ${result.version}` : undefined,
    })
    await refreshLabList()
  } else {
    toast.error('Connection failed', { description: result.error })
  }
}

// ─── Labs list ────────────────────────────────────────────────────────────────

interface LabInfo {
  labName: string
  owner?: string
  nodeCount: number
  nodes: any[]
}

const labs = ref<LabInfo[]>([])
const expandedLab = ref<string | null>(null)
const destroyingLab = ref<string | null>(null)
const labsLoading = ref(false)
const inspectedNodes = reactive<Record<string, any[]>>({})
const inspectingLab = ref<string | null>(null)

async function refreshLabList() {
  if (!connectionTested.value) return
  labsLoading.value = true
  try {
    const result = await listPlaygroundLabs({ ...form })
    labs.value = result as LabInfo[]
  } finally {
    labsLoading.value = false
  }
}

async function toggleExpand(labName: string) {
  if (expandedLab.value === labName) {
    expandedLab.value = null
    return
  }
  expandedLab.value = labName
  // Inspect to get fresh node data (normalized ClabNode[] with ipv4_address etc.)
  if (!inspectedNodes[labName]) {
    inspectingLab.value = labName
    const ok = await inspectPlaygroundLab({ ...form }, labName)
    if (ok) {
      // Capture the composable's nodes after inspect
      inspectedNodes[labName] = [...inspectedNodeList.value]
    }
    inspectingLab.value = null
  }
}

async function handleDestroyLab(labName: string) {
  destroyingLab.value = labName
  const ok = await destroyPlaygroundLab({ ...form }, labName)
  if (ok) {
    toast.success('Lab destroyed', { description: labName })
    labs.value = labs.value.filter(l => l.labName !== labName)
    if (expandedLab.value === labName) expandedLab.value = null
    delete inspectedNodes[labName]
  } else {
    toast.error('Destroy failed', { description: `Could not destroy ${labName}` })
  }
  destroyingLab.value = null
}

// ─── Topology builder ────────────────────────────────────────────────────────

interface NodeDef {
  _id: string
  name: string
  kind: string
  image: string
}

interface LinkDef {
  _id: string
  fromNode: string
  fromPort: string
  toNode: string
  toPort: string
}

const topologyName = ref('')
const topoNodes = ref<NodeDef[]>([])
const topoLinks = ref<LinkDef[]>([])
let _uid = 0
const uid = () => String(++_uid)

function addNode() {
  topoNodes.value.push({ _id: uid(), name: '', kind: 'linux', image: '' })
}

function removeNode(id: string) {
  topoNodes.value = topoNodes.value.filter(n => n._id !== id)
  // Remove links referencing this node
  const nodeName = topoNodes.value.find(n => n._id === id)?.name
  if (nodeName) {
    topoLinks.value = topoLinks.value.filter(
      l => l.fromNode !== nodeName && l.toNode !== nodeName
    )
  }
}

function addLink() {
  topoLinks.value.push({ _id: uid(), fromNode: '', fromPort: 'eth1', toNode: '', toPort: 'eth1' })
}

function removeLink(id: string) {
  topoLinks.value = topoLinks.value.filter(l => l._id !== id)
}

const nodeNames = computed(() => topoNodes.value.map(n => n.name).filter(Boolean))

const deployError = ref<string | null>(null)
const isDeploying = ref(false)

function buildTopology() {
  const nodesDef: Record<string, any> = {}
  for (const node of topoNodes.value) {
    if (!node.name) continue
    nodesDef[node.name] = {
      kind: node.kind || 'linux',
      ...(node.image ? { image: node.image } : {}),
    }
  }

  const linksDef = topoLinks.value
    .filter(l => l.fromNode && l.toNode)
    .map(l => ({
      endpoints: [`${l.fromNode}:${l.fromPort}`, `${l.toNode}:${l.toPort}`] as [string, string],
    }))

  return {
    name: topologyName.value,
    topology: {
      nodes: nodesDef,
      ...(linksDef.length > 0 ? { links: linksDef } : {}),
    },
  }
}

function validateTopology(): string | null {
  if (!topologyName.value.trim()) return 'Topology name is required'
  if (topoNodes.value.length === 0) return 'At least one node is required'
  for (const node of topoNodes.value) {
    if (!node.name.trim()) return 'All nodes must have a name'
    if (!node.kind.trim()) return 'All nodes must have a kind'
  }
  const names = topoNodes.value.map(n => n.name)
  if (new Set(names).size !== names.length) return 'Node names must be unique'
  return null
}

async function handleDeploy() {
  deployError.value = null
  const err = validateTopology()
  if (err) {
    deployError.value = err
    return
  }

  isDeploying.value = true
  const topology = buildTopology()
  const ok = await deployPlaygroundLab({ ...form }, topology)
  isDeploying.value = false

  if (ok) {
    toast.success('Lab deployed', { description: topology.name })
    // Reset form
    topologyName.value = ''
    topoNodes.value = []
    topoLinks.value = []
    // Refresh labs list
    await refreshLabList()
  } else {
    toast.error('Deploy failed')
    deployError.value = 'Deploy failed — check server connection and topology.'
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Server Config Card -->
    <Card>
      <CardHeader class="pb-3">
        <CardTitle class="flex items-center gap-2 text-base">
          <Server class="h-4 w-4" />
          clab-api-server Connection
        </CardTitle>
        <CardDescription>Enter the ContainerLab API server credentials to connect.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div class="col-span-2 sm:col-span-1 space-y-1.5">
            <Label for="clab-ip">Server IP</Label>
            <Input id="clab-ip" v-model="form.serverIp" placeholder="192.168.1.100" />
          </div>
          <div class="space-y-1.5">
            <Label for="clab-port">Port</Label>
            <Input id="clab-port" v-model.number="form.serverPort" type="number" placeholder="8080" />
          </div>
          <div class="space-y-1.5">
            <Label for="clab-user">Username</Label>
            <Input id="clab-user" v-model="form.username" placeholder="admin" />
          </div>
          <div class="space-y-1.5">
            <Label for="clab-pass">Password</Label>
            <Input id="clab-pass" v-model="form.password" type="password" placeholder="••••••••" />
          </div>
        </div>

        <div class="flex items-center gap-3">
          <Button variant="outline" size="sm" :disabled="isLoading" @click="handleTestConnectivity">
            <Loader2 v-if="isLoading" class="h-3.5 w-3.5 animate-spin mr-1.5" />
            Test Connectivity
          </Button>
          <span v-if="connectionTested" class="flex items-center gap-1 text-sm text-green-600">
            <CheckCircle2 class="h-3.5 w-3.5" />
            Connected{{ connectionVersion ? ` — v${connectionVersion}` : '' }}
          </span>
        </div>
      </CardContent>
    </Card>

    <!-- Main content — only show after connection tested -->
    <template v-if="connectionTested">
      <Tabs default-value="labs">
        <TabsList class="w-full">
          <TabsTrigger value="labs" class="flex-1 flex items-center gap-1.5">
            <Network class="h-3.5 w-3.5" />
            Running Labs
          </TabsTrigger>
          <TabsTrigger value="deploy" class="flex-1 flex items-center gap-1.5">
            <Play class="h-3.5 w-3.5" />
            Deploy New Lab
          </TabsTrigger>
        </TabsList>

        <!-- ─── Labs list tab ─────────────────────────────────────────── -->
        <TabsContent value="labs" class="mt-4 space-y-3">
          <!-- Header row -->
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground">
              {{ labs.length }} lab{{ labs.length !== 1 ? 's' : '' }} running
            </span>
            <Button
              variant="ghost"
              size="sm"
              class="h-7 gap-1.5 text-xs"
              :disabled="labsLoading"
              @click="refreshLabList"
            >
              <RefreshCw class="h-3 w-3" :class="labsLoading ? 'animate-spin' : ''" />
              Refresh
            </Button>
          </div>

          <!-- Empty state -->
          <div
            v-if="labs.length === 0 && !labsLoading"
            class="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground"
          >
            No labs are currently running on this server.
          </div>

          <!-- Loading state -->
          <div v-else-if="labsLoading" class="flex items-center justify-center py-8">
            <Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
          </div>

          <!-- Lab cards -->
          <div v-else class="space-y-2">
            <Card v-for="lab in labs" :key="lab.labName" class="overflow-hidden">
              <!-- Lab header row -->
              <div
                class="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/40 transition-colors"
                @click="toggleExpand(lab.labName)"
              >
                <button class="flex-shrink-0 text-muted-foreground">
                  <Loader2
                    v-if="inspectingLab === lab.labName"
                    class="h-3.5 w-3.5 animate-spin"
                  />
                  <ChevronDown
                    v-else-if="expandedLab === lab.labName"
                    class="h-3.5 w-3.5"
                  />
                  <ChevronRight v-else class="h-3.5 w-3.5" />
                </button>

                <div class="flex-1 min-w-0">
                  <span class="font-mono text-sm font-medium">{{ lab.labName }}</span>
                  <span v-if="lab.owner" class="text-xs text-muted-foreground ml-2">
                    owner: {{ lab.owner }}
                  </span>
                </div>

                <Badge variant="secondary" class="text-xs flex-shrink-0">
                  {{ lab.nodeCount }} node{{ lab.nodeCount !== 1 ? 's' : '' }}
                </Badge>

                <Button
                  variant="ghost"
                  size="sm"
                  class="h-7 w-7 p-0 text-destructive hover:text-destructive flex-shrink-0"
                  :disabled="destroyingLab === lab.labName"
                  @click.stop="handleDestroyLab(lab.labName)"
                >
                  <Loader2 v-if="destroyingLab === lab.labName" class="h-3.5 w-3.5 animate-spin" />
                  <Trash2 v-else class="h-3.5 w-3.5" />
                </Button>
              </div>

              <!-- Expanded: node access panel -->
              <div v-if="expandedLab === lab.labName" class="px-4 pb-4 border-t bg-muted/20">
                <div class="pt-3">
                  <ClabNodeAccessPanel
                    :nodes="inspectedNodes[lab.labName] ?? lab.nodes"
                    :lab-name="lab.labName"
                    :cfg="form"
                  />
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <!-- ─── Deploy tab ─────────────────────────────────────────────── -->
        <TabsContent value="deploy" class="mt-4">
          <Card>
            <CardHeader class="pb-3">
              <CardTitle class="flex items-center gap-2 text-base">
                <Box class="h-4 w-4" />
                Topology Builder
              </CardTitle>
              <CardDescription>
                Define nodes and links, then deploy the topology to the clab-api-server.
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-5">

              <!-- Topology name -->
              <div class="space-y-1.5">
                <Label for="topo-name">Topology Name</Label>
                <Input
                  id="topo-name"
                  v-model="topologyName"
                  placeholder="my-lab"
                  class="font-mono"
                />
              </div>

              <Separator />

              <!-- Nodes -->
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <Label class="flex items-center gap-1.5">
                    <Box class="h-3.5 w-3.5" /> Nodes
                  </Label>
                  <Button variant="outline" size="sm" class="h-7 gap-1" @click="addNode">
                    <Plus class="h-3 w-3" /> Add Node
                  </Button>
                </div>

                <div v-if="topoNodes.length === 0" class="text-xs text-muted-foreground italic">
                  No nodes defined. Click "Add Node" to start.
                </div>

                <div v-else class="space-y-2">
                  <div
                    v-for="node in topoNodes"
                    :key="node._id"
                    class="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end"
                  >
                    <div class="space-y-1">
                      <Label class="text-xs text-muted-foreground">Name</Label>
                      <Input v-model="node.name" placeholder="router1" class="h-8 font-mono text-sm" />
                    </div>
                    <div class="space-y-1">
                      <Label class="text-xs text-muted-foreground">Kind</Label>
                      <Input v-model="node.kind" placeholder="linux" class="h-8 font-mono text-sm" />
                    </div>
                    <div class="space-y-1">
                      <Label class="text-xs text-muted-foreground">Image (optional)</Label>
                      <Input v-model="node.image" placeholder="ghcr.io/..." class="h-8 font-mono text-sm" />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8 text-muted-foreground hover:text-destructive mt-5"
                      @click="removeNode(node._id)"
                    >
                      <X class="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <!-- Links -->
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <Label class="flex items-center gap-1.5">
                    <Link2 class="h-3.5 w-3.5" /> Links
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    class="h-7 gap-1"
                    :disabled="nodeNames.length < 2"
                    @click="addLink"
                  >
                    <Plus class="h-3 w-3" /> Add Link
                  </Button>
                </div>

                <div v-if="topoLinks.length === 0" class="text-xs text-muted-foreground italic">
                  No links defined.
                  {{ nodeNames.length < 2 ? 'Add at least 2 nodes first.' : 'Click "Add Link" to connect nodes.' }}
                </div>

                <div v-else class="space-y-2">
                  <div
                    v-for="link in topoLinks"
                    :key="link._id"
                    class="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-end"
                  >
                    <!-- From endpoint -->
                    <div class="grid grid-cols-2 gap-1">
                      <div class="space-y-1">
                        <Label class="text-xs text-muted-foreground">From node</Label>
                        <select
                          v-model="link.fromNode"
                          class="h-8 w-full rounded-md border border-input bg-background px-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">— node —</option>
                          <option v-for="n in nodeNames" :key="n" :value="n">{{ n }}</option>
                        </select>
                      </div>
                      <div class="space-y-1">
                        <Label class="text-xs text-muted-foreground">Port</Label>
                        <Input v-model="link.fromPort" placeholder="eth1" class="h-8 font-mono text-sm" />
                      </div>
                    </div>

                    <span class="text-muted-foreground text-sm mb-0.5">→</span>

                    <!-- To endpoint -->
                    <div class="grid grid-cols-2 gap-1">
                      <div class="space-y-1">
                        <Label class="text-xs text-muted-foreground">To node</Label>
                        <select
                          v-model="link.toNode"
                          class="h-8 w-full rounded-md border border-input bg-background px-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">— node —</option>
                          <option v-for="n in nodeNames" :key="n" :value="n">{{ n }}</option>
                        </select>
                      </div>
                      <div class="space-y-1">
                        <Label class="text-xs text-muted-foreground">Port</Label>
                        <Input v-model="link.toPort" placeholder="eth1" class="h-8 font-mono text-sm" />
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8 text-muted-foreground hover:text-destructive mt-5"
                      @click="removeLink(link._id)"
                    >
                      <X class="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <!-- Deploy error -->
              <Alert v-if="deployError" variant="destructive">
                <AlertCircle class="h-4 w-4" />
                <AlertDescription>{{ deployError }}</AlertDescription>
              </Alert>

              <!-- Deploy button -->
              <Button
                class="w-full gap-2"
                :disabled="isLoading || isDeploying"
                @click="handleDeploy"
              >
                <Loader2 v-if="isDeploying" class="h-4 w-4 animate-spin" />
                <Play v-else class="h-4 w-4" />
                Deploy Topology
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </template>

    <!-- Prompt to test connection first -->
    <div
      v-else
      class="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground"
    >
      Test connectivity above to start managing labs.
    </div>
  </div>
</template>
