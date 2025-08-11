<template>
  <div class="h-full flex flex-col">
    <!-- Part Header -->
    <div class="border-b border-border bg-card p-6 shrink-0">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <div class="flex items-center space-x-3 mb-2">
            <Badge variant="secondary" class="text-xs">
              Part {{ partNumber }}
            </Badge>
            <Badge v-if="totalPoints > 0" variant="outline" class="text-xs">
              {{ totalPoints }} points
            </Badge>
            <Badge :variant="statusBadgeVariant" class="text-xs">
              <Icon :name="statusIcon" class="w-3 h-3 mr-1" />
              {{ statusText }}
            </Badge>
          </div>
          
          <h2 class="text-xl font-bold mb-2">{{ title }}</h2>
          
          <p v-if="description" class="text-muted-foreground">
            {{ description }}
          </p>
        </div>

        <!-- Progress Indicator -->
        <div class="text-right">
          <div class="text-2xl font-bold text-primary">
            {{ progressPercentage }}%
          </div>
          <div class="text-sm text-muted-foreground">
            Complete
          </div>
        </div>
      </div>
    </div>

    <!-- Content Area -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Main Content -->
      <div class="flex-1 overflow-y-auto">
        <div class="p-6">
          <!-- Rich Markdown Content -->
          <div class="prose prose-slate dark:prose-invert max-w-none">
            <div class="rendered-markdown" v-html="renderedContent"/>
          </div>

          <!-- Interactive Elements -->
          <div v-if="interactiveElements.length > 0" class="mt-8 space-y-6">
            <Separator />
            <h3 class="text-lg font-semibold flex items-center">
              <Icon name="lucide:zap" class="w-5 h-5 mr-2" />
              Interactive Elements
            </h3>
            
            <div class="grid gap-4">
              <Card v-for="element in interactiveElements" :key="element.id">
                <CardContent class="p-4">
                  <!-- Placeholder for different interactive element types -->
                  <div class="text-center text-muted-foreground py-8">
                    <Icon name="lucide:puzzle" class="w-8 h-8 mx-auto mb-2" />
                    <p class="text-sm">Interactive element: {{ element.type }}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <!-- Task Information (if available) -->
          <div v-if="taskInfo && taskInfo.length > 0" class="mt-8 space-y-6">
            <Separator />
            <h3 class="text-lg font-semibold flex items-center">
              <Icon name="lucide:clipboard-check" class="w-5 h-5 mr-2" />
              What Will Be Tested
            </h3>
            
            <div class="grid gap-3">
              <Card v-for="task in taskInfo" :key="task.name" class="border-l-4 border-l-primary">
                <CardContent class="p-4">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <h4 class="font-medium mb-1">{{ task.name }}</h4>
                      <p class="text-sm text-muted-foreground mb-3">
                        {{ task.description || 'Automated testing task' }}
                      </p>
                      
                      <!-- Task Details -->
                      <div class="flex flex-wrap gap-2 text-xs">
                        <Badge variant="secondary">
                          <Icon name="lucide:play" class="w-3 h-3 mr-1" />
                          {{ getTemplateDisplayName(task.template) }}
                        </Badge>
                        <Badge variant="outline">
                          {{ task.testCases }} test case{{ task.testCases !== 1 ? 's' : '' }}
                        </Badge>
                      </div>
                    </div>
                    
                    <Badge variant="outline" class="shrink-0">
                      {{ task.points }} pts
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <!-- Side Panel (Device Info) -->
      <div class="w-80 border-l border-border bg-muted/25 shrink-0">
        <DeviceInfoPanel
          :devices="assignedDevices"
          :ip-mappings="ipMappings"
          :student-info="studentInfo"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import DeviceInfoPanel from './DeviceInfoPanel.vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

// Props
interface Props {
  title: string
  description?: string
  content: string
  partNumber: number
  totalPoints: number
  status?: 'not_started' | 'in_progress' | 'completed' | 'graded'
  progress?: number
  assignedDevices?: Array<{
    deviceId: string
    deviceName: string
    ipAddress: string
    status: 'online' | 'offline' | 'unknown'
  }>
  ipMappings?: Record<string, string>
  studentInfo?: {
    studentId: string
    groupNumber?: number
    assignedIPs?: Record<string, string>
  }
  taskInfo?: Array<{
    name: string
    description?: string
    template: string
    points: number
    testCases: number
  }>
  interactiveElements?: Array<{
    id: string
    type: 'quiz' | 'diagram' | 'simulation' | 'upload'
    config: Record<string, any>
  }>
}

const props = withDefaults(defineProps<Props>(), {
  description: '',
  status: 'not_started',
  progress: 0,
  assignedDevices: () => [],
  ipMappings: () => ({}),
  taskInfo: () => [],
  interactiveElements: () => []
})

// Computed
const renderedContent = computed(() => {
  // Process markdown and resolve IP variables
  let processedContent = props.content
  
  // Replace IP variables with actual values
  if (props.ipMappings) {
    Object.entries(props.ipMappings).forEach(([variable, ip]) => {
      const regex = new RegExp(`\\{\\{\\s*${variable}\\s*\\}\\}`, 'g')
      processedContent = processedContent.replace(regex, `<code class="ip-address">${ip}</code>`)
    })
  }
  
  // Render markdown
  const rawHtml = marked(processedContent)
  
  // Sanitize HTML
  return DOMPurify.sanitize(rawHtml)
})

const statusBadgeVariant = computed(() => {
  switch (props.status) {
    case 'completed':
    case 'graded':
      return 'default'
    case 'in_progress':
      return 'secondary'
    default:
      return 'outline'
  }
})

const statusIcon = computed(() => {
  switch (props.status) {
    case 'completed':
      return 'lucide:check-circle'
    case 'graded':
      return 'lucide:award'
    case 'in_progress':
      return 'lucide:play'
    default:
      return 'lucide:circle'
  }
})

const statusText = computed(() => {
  switch (props.status) {
    case 'completed':
      return 'Completed'
    case 'graded':
      return 'Graded'
    case 'in_progress':
      return 'In Progress'
    default:
      return 'Not Started'
  }
})

const progressPercentage = computed(() => {
  return Math.round(props.progress)
})

// Methods
const getTemplateDisplayName = (template: string): string => {
  return template.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}
</script>

<style>
/* Custom styles for rendered markdown */
.rendered-markdown {
  @apply leading-relaxed;
}

.rendered-markdown h1,
.rendered-markdown h2,
.rendered-markdown h3,
.rendered-markdown h4,
.rendered-markdown h5,
.rendered-markdown h6 {
  @apply font-semibold mt-6 mb-3;
}

.rendered-markdown h1 { @apply text-2xl; }
.rendered-markdown h2 { @apply text-xl; }
.rendered-markdown h3 { @apply text-lg; }

.rendered-markdown p {
  @apply mb-4;
}

.rendered-markdown ul,
.rendered-markdown ol {
  @apply mb-4 ml-6;
}

.rendered-markdown li {
  @apply mb-2;
}

.rendered-markdown code {
  @apply bg-muted px-1.5 py-0.5 rounded text-sm font-mono;
}

.rendered-markdown .ip-address {
  @apply bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 px-2 py-1 rounded font-mono font-semibold;
}

.rendered-markdown pre {
  @apply bg-muted p-4 rounded-lg overflow-x-auto mb-4;
}

.rendered-markdown pre code {
  @apply bg-transparent p-0 text-sm;
}

.rendered-markdown blockquote {
  @apply border-l-4 border-primary pl-4 italic text-muted-foreground;
}

.rendered-markdown table {
  @apply w-full border-collapse border border-border mb-4;
}

.rendered-markdown th,
.rendered-markdown td {
  @apply border border-border px-3 py-2 text-left;
}

.rendered-markdown th {
  @apply bg-muted font-semibold;
}

.rendered-markdown img {
  @apply max-w-full h-auto rounded-lg shadow-md;
}
</style>