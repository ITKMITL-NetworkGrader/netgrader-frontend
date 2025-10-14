<template>
  <div class="space-y-6">
    <!-- Step Header -->
    <div class="border-b pb-4">
      <h2 class="text-xl font-semibold">Review & Create</h2>
      <p class="text-muted-foreground mt-1">
        Review your lab configuration before creating. Make sure everything looks correct.
      </p>
    </div>

    <!-- Lab Summary -->
    <div class="space-y-6">
      <!-- Basic Information -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center">
            <BookOpen class="w-5 h-5 mr-2 text-blue-600" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label class="text-sm font-medium text-muted-foreground">Lab Name</Label>
              <div class="p-3 bg-muted/30 rounded border">
                {{ wizardData.basicInfo.name || 'No name provided' }}
              </div>
            </div>
            <div class="space-y-2">
              <Label class="text-sm font-medium text-muted-foreground">Course</Label>
              <div class="p-3 bg-muted/30 rounded border">
                {{ courseContext.courseName }} ({{ courseContext.courseCode }})
              </div>
            </div>
          </div>
          
          <div v-if="wizardData.basicInfo.description" class="space-y-2">
            <Label class="text-sm font-medium text-muted-foreground">Description</Label>
            <div class="p-3 bg-muted/30 rounded border">
              {{ wizardData.basicInfo.description }}
            </div>
          </div>

          <div class="space-y-2">
            <Label class="text-sm font-medium text-muted-foreground">Student Instructions</Label>
            <div class="p-3 bg-muted/30 rounded border max-h-32 overflow-y-auto prose prose-sm">
              <div v-html="renderMarkdown(wizardData.basicInfo.instructions)"></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Network Configuration -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center">
            <Network class="w-5 h-5 mr-2 text-green-600" />
            Network Configuration
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <!-- Management Network -->
          <div class="space-y-2">
            <Label class="text-sm font-medium text-muted-foreground">Management Network</Label>
            <div class="p-3 bg-muted/30 rounded border font-mono">
              {{ wizardData.networkConfig.managementNetwork }}/{{ wizardData.networkConfig.managementSubnetMask }}
            </div>
          </div>

          <!-- Network Mode & Strategy -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label class="text-sm font-medium text-muted-foreground">VLAN Mode</Label>
              <div class="p-3 bg-muted/30 rounded border">
                {{ formatNetworkMode(wizardData.networkConfig.mode) }}
              </div>
            </div>
            <div class="space-y-2">
              <Label class="text-sm font-medium text-muted-foreground">Allocation Strategy</Label>
              <div class="p-3 bg-muted/30 rounded border">
                {{ formatAllocationStrategy(wizardData.networkConfig.allocationStrategy) }}
              </div>
            </div>
          </div>

          <!-- VLANs Configuration -->
          <div v-if="wizardData.networkConfig.vlans.length > 0" class="space-y-2">
            <Label class="text-sm font-medium text-muted-foreground">
              VLANs Configuration ({{ wizardData.networkConfig.vlans.length }} VLAN{{ wizardData.networkConfig.vlans.length !== 1 ? 's' : '' }})
            </Label>
            <div class="space-y-2">
              <div
                v-for="(vlan, index) in wizardData.networkConfig.vlans"
                :key="index"
                class="p-3 bg-muted/20 rounded border"
              >
                <div class="flex items-center justify-between mb-2">
                  <div class="font-medium">VLAN {{ index }}</div>
                  <Badge v-if="vlan.isStudentGenerated" variant="secondary" class="text-xs">
                    Student-Generated
                  </Badge>
                  <Badge v-else variant="outline" class="text-xs">
                    Fixed
                  </Badge>
                </div>
                <div class="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span class="text-muted-foreground">Network:</span>
                    <span class="ml-2 font-mono">{{ vlan.baseNetwork }}/{{ vlan.subnetMask }}</span>
                  </div>
                  <div v-if="vlan.vlanId !== undefined">
                    <span class="text-muted-foreground">VLAN ID:</span>
                    <span class="ml-2 font-mono">{{ vlan.vlanId }}</span>
                  </div>
                  <div v-if="vlan.calculationMultiplier !== undefined">
                    <span class="text-muted-foreground">Multiplier:</span>
                    <span class="ml-2 font-mono">{{ vlan.calculationMultiplier }}</span>
                  </div>
                  <div v-if="vlan.groupModifier !== undefined">
                    <span class="text-muted-foreground">Group Modifier:</span>
                    <span class="ml-2 font-mono">{{ vlan.groupModifier }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Exempt IP Ranges -->
          <div v-if="wizardData.networkConfig.exemptIpRanges && wizardData.networkConfig.exemptIpRanges.length > 0" class="space-y-2">
            <Label class="text-sm font-medium text-muted-foreground">
              Exempt IP Ranges ({{ wizardData.networkConfig.exemptIpRanges.length }})
            </Label>
            <div class="p-3 bg-muted/20 rounded border">
              <div class="flex flex-wrap gap-2">
                <Badge
                  v-for="(range, index) in wizardData.networkConfig.exemptIpRanges"
                  :key="index"
                  variant="outline"
                  class="font-mono text-xs"
                >
                  {{ range.original }}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Devices -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center">
            <Router class="w-5 h-5 mr-2 text-purple-600" />
            Devices ({{ wizardData.devices.length }})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div class="space-y-3">
            <div
              v-for="(device, index) in wizardData.devices"
              :key="index"
              class="p-3 bg-muted/20 rounded border"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="font-medium">{{ device.deviceId }}</div>
                <Badge variant="outline">{{ device.ipVariables.length }} IP variable{{ device.ipVariables.length !== 1 ? 's' : '' }}</Badge>
              </div>
              <div class="text-sm text-muted-foreground mb-3">
                Template: {{ getDeviceTemplateName(device.templateId) }}
              </div>

              <!-- IP Variables Table -->
              <div v-if="device.ipVariables.length > 0" class="mt-3 border rounded">
                <table class="w-full text-xs">
                  <thead class="bg-muted/30">
                    <tr>
                      <th class="text-left p-2 font-medium">Variable</th>
                      <th class="text-left p-2 font-medium">Interface</th>
                      <th class="text-left p-2 font-medium">Type</th>
                      <th class="text-left p-2 font-medium">IP/Config</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="ipVar in device.ipVariables"
                      :key="ipVar.name"
                      class="border-t"
                    >
                      <td class="p-2 font-mono">{{ ipVar.name }}</td>
                      <td class="p-2 font-mono text-muted-foreground">
                        {{ ipVar.interface || '-' }}
                      </td>
                      <td class="p-2">
                        <Badge variant="secondary" class="text-xs">
                          {{ formatInputType(ipVar.inputType) }}
                        </Badge>
                      </td>
                      <td class="p-2 font-mono">
                        {{ formatIPConfig(ipVar) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Connection Parameters -->
              <div v-if="device.connectionParams" class="mt-3 pt-3 border-t text-xs text-muted-foreground">
                <div class="flex items-center gap-4">
                  <span>SSH Port: <span class="font-mono">{{ device.connectionParams.sshPort }}</span></span>
                  <span>Username: <span class="font-mono">{{ device.connectionParams.username }}</span></span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Parts & Tasks -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center">
            <CheckSquare class="w-5 h-5 mr-2 text-orange-600" />
            Parts & Tasks ({{ wizardData.parts.length }} parts, {{ totalTasks }} tasks)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <div
              v-for="(part, partIndex) in wizardData.parts"
              :key="part.tempId"
              class="border rounded-lg p-4"
            >
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center space-x-2">
                  <Badge variant="outline">Part {{ partIndex + 1 }}</Badge>
                  <span class="font-medium">{{ part.title }}</span>
                  <Badge variant="secondary">{{ part.totalPoints }} pts</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  @click="togglePartDetails(partIndex)"
                >
                  <ChevronDown
                    :class="{ 'transform rotate-180': expandedParts.has(partIndex) }"
                    class="w-4 h-4 transition-transform"
                  />
                </Button>
              </div>

              <div class="text-sm text-muted-foreground mb-2">
                {{ part.tasks.length }} task{{ part.tasks.length !== 1 ? 's' : '' }}
                {{ part.prerequisites.length > 0 ? `• Prerequisites: ${part.prerequisites.join(', ')}` : '' }}
              </div>

              <Collapsible :open="expandedParts.has(partIndex)">
                <CollapsibleContent>
                  <div class="space-y-3 mt-3">
                    <!-- Part Instructions Preview -->
                    <div class="p-3 bg-muted/20 rounded">
                      <Label class="text-xs font-medium text-muted-foreground">Instructions Preview</Label>
                      <div class="mt-1 prose prose-sm max-h-24 overflow-y-auto">
                        <div v-html="renderMarkdown(part.instructions)"></div>
                      </div>
                    </div>

                    <!-- Tasks List -->
                    <div class="space-y-2">
                      <Label class="text-xs font-medium text-muted-foreground">Tasks</Label>
                      <div class="space-y-2">
                        <div
                          v-for="(task, taskIndex) in part.tasks"
                          :key="task.tempId"
                          class="p-2 bg-muted/10 rounded flex items-center justify-between"
                        >
                          <div class="flex items-center space-x-2">
                            <Badge variant="outline" class="text-xs">{{ taskIndex + 1 }}</Badge>
                            <span class="text-sm">{{ task.name }}</span>
                            <Badge variant="secondary" class="text-xs">{{ task.points }} pts</Badge>
                          </div>
                          <div class="text-xs text-muted-foreground">
                            {{ task.executionDevice }} • {{ task.testCases.length }} test{{ task.testCases.length !== 1 ? 's' : '' }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Schedule -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center">
            <Calendar class="w-5 h-5 mr-2 text-indigo-600" />
            Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="space-y-2">
              <Label class="text-sm font-medium text-muted-foreground">Available From</Label>
              <div class="p-3 bg-muted/30 rounded border">
                {{ wizardData.schedule.availableFrom 
                  ? formatDateTime(wizardData.schedule.availableFrom) 
                  : 'Immediately' }}
              </div>
            </div>
            <div class="space-y-2">
              <Label class="text-sm font-medium text-muted-foreground">Due Date</Label>
              <div class="p-3 bg-muted/30 rounded border">
                {{ wizardData.schedule.dueDate 
                  ? formatDateTime(wizardData.schedule.dueDate) 
                  : 'No deadline' }}
              </div>
            </div>
            <div class="space-y-2">
              <Label class="text-sm font-medium text-muted-foreground">Available Until</Label>
              <div class="p-3 bg-muted/30 rounded border">
                {{ wizardData.schedule.availableUntil 
                  ? formatDateTime(wizardData.schedule.availableUntil) 
                  : 'Always available' }}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Summary Statistics -->
      <Card class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
        <CardHeader>
          <CardTitle class="flex items-center">
            <BarChart3 class="w-5 h-5 mr-2 text-blue-600" />
            Lab Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="text-center">
              <div class="text-2xl font-bold text-blue-600">{{ wizardData.parts.length }}</div>
              <div class="text-sm text-muted-foreground">Parts</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-green-600">{{ totalTasks }}</div>
              <div class="text-sm text-muted-foreground">Tasks</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-orange-600">{{ totalPoints }}</div>
              <div class="text-sm text-muted-foreground">Total Points</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-purple-600">{{ wizardData.devices.length }}</div>
              <div class="text-sm text-muted-foreground">Devices</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Creation Confirmation -->
      <Card class="border-2 border-dashed border-primary/50">
        <CardHeader>
          <CardTitle class="flex items-center">
            <Rocket class="w-5 h-5 mr-2 text-primary" />
            Ready to Create
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <p class="text-muted-foreground">
            Please review all information above carefully. Once created, some lab settings cannot be easily modified 
            if students have already started working on the lab.
          </p>
          
          <div class="flex items-center space-x-2 p-3 bg-muted/30 rounded">
            <Info class="w-4 h-4 text-blue-600" />
            <span class="text-sm">
              The lab will be created with all parts and tasks. Students will be able to access it according to your schedule settings.
            </span>
          </div>

          <Button
            @click="handleCreateLab"
            size="lg"
            class="w-full"
            :disabled="isSubmitting"
          >
            <Loader2 v-if="isSubmitting" class="w-4 h-4 mr-2 animate-spin" />
            <Rocket v-else class="w-4 h-4 mr-2" />
            {{ isSubmitting ? 'Creating Lab...' : 'Create Lab' }}
          </Button>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { marked } from 'marked'
import {
  BookOpen,
  Network,
  Router,
  CheckSquare,
  Calendar,
  BarChart3,
  Rocket,
  ChevronDown,
  Info,
  Loader2
} from 'lucide-vue-next'

// UI Components
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'

// Types
import type { LabWizardData, CourseContext } from '@/types/wizard'

// Props
interface Props {
  wizardData: LabWizardData
  courseContext: CourseContext
  isSubmitting: boolean
}

// Emits
interface Emits {
  (e: 'createLab'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Local state
const expandedParts = ref(new Set<number>())

// Computed
const totalTasks = computed(() => {
  return props.wizardData.parts.reduce((sum, part) => sum + part.tasks.length, 0)
})

const totalPoints = computed(() => {
  return props.wizardData.parts.reduce((sum, part) => sum + part.totalPoints, 0)
})

// Methods
const renderMarkdown = (content: string): string => {
  if (!content) return '<p class="text-muted-foreground">No content provided</p>'

  try {
    return marked(content, {
      breaks: true,
      gfm: true
    })
  } catch (error) {
    return `<p class="text-destructive">Error rendering content: ${error}</p>`
  }
}

const formatDateTime = (date: Date): string => {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatNetworkMode = (mode: string): string => {
  const modeMap: Record<string, string> = {
    'fixed_vlan': 'Fixed VLAN',
    'lecturer_group': 'Lecturer Group-Based',
    'calculated_vlan': 'Calculated VLAN',
    '': 'Not Set'
  }
  return modeMap[mode] || mode
}

const formatAllocationStrategy = (strategy: string): string => {
  const strategyMap: Record<string, string> = {
    'student_id_based': 'Student ID Based',
    'group_based': 'Group Based'
  }
  return strategyMap[strategy] || strategy
}

const formatInputType = (inputType: string): string => {
  if (inputType === 'fullIP') return 'Full IP'
  if (inputType === 'studentManagement') return 'Management IP'
  if (inputType?.startsWith('studentVlan')) {
    const vlanNum = inputType.replace('studentVlan', '')
    return `VLAN ${vlanNum}`
  }
  return inputType || 'Unknown'
}

const formatIPConfig = (ipVar: any): string => {
  if (ipVar.inputType === 'fullIP') {
    return ipVar.fullIP || 'Not Set'
  }
  if (ipVar.inputType === 'studentManagement') {
    return 'Auto-generated (Management)'
  }
  if (ipVar.inputType?.startsWith('studentVlan')) {
    const vlanNum = ipVar.inputType.replace('studentVlan', '')
    const offset = ipVar.interfaceOffset !== undefined ? ` + Offset ${ipVar.interfaceOffset}` : ''
    return `Auto-generated (VLAN ${vlanNum}${offset})`
  }
  return 'Unknown Configuration'
}

const getDeviceTemplateName = (templateId: string): string => {
  // This would normally fetch from the templates data
  // For now, return a placeholder
  return templateId ? 'Device Template' : 'Unknown Template'
}

const togglePartDetails = (partIndex: number) => {
  if (expandedParts.value.has(partIndex)) {
    expandedParts.value.delete(partIndex)
  } else {
    expandedParts.value.add(partIndex)
  }
}

const handleCreateLab = () => {
  emit('createLab')
}
</script>

<style scoped>
/* Markdown preview styles */
:deep(.prose) {
  color: hsl(var(--foreground));
}

:deep(.prose h1) {
  color: hsl(var(--foreground));
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 0;
  margin-bottom: 0.75rem;
}

:deep(.prose h2) {
  color: hsl(var(--foreground));
  font-size: 1.125rem;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

:deep(.prose p) {
  margin-bottom: 0.75rem;
  line-height: 1.5;
}

:deep(.prose ul) {
  margin-bottom: 0.75rem;
  padding-left: 1.25rem;
}

:deep(.prose li) {
  margin-bottom: 0.25rem;
}

:deep(.prose code) {
  background-color: hsl(var(--muted));
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

/* Table styles */
table {
  border-collapse: collapse;
}

table th {
  background-color: hsl(var(--muted) / 0.3);
  border-bottom: 1px solid hsl(var(--border));
}

table td {
  border-bottom: 1px solid hsl(var(--border));
}

table tr:last-child td {
  border-bottom: none;
}

table tr:hover {
  background-color: hsl(var(--muted) / 0.1);
}
</style>