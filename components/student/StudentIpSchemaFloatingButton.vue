<template>
  <div v-if="schema.exists" class="fixed bottom-6 right-6 z-50">
    <!-- Collapsed Button -->
    <Button
      v-if="!isExpanded"
      @click="toggleExpanded"
      size="lg"
      class="rounded-full shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
    >
      <Network class="w-5 h-5 mr-2" />
      My IP Schema

      <!-- Version Badge -->
      <Badge v-if="schema.version > 1" variant="secondary" class="ml-2 bg-white/20">
        v{{ schema.version }}
      </Badge>

      <ChevronUp class="w-4 h-4 ml-2" />
    </Button>

    <!-- Expanded Card -->
    <Card v-else class="w-[700px] max-h-[600px] shadow-2xl border-2 border-primary overflow-hidden">
      <CardHeader class="pb-3 border-b bg-gradient-to-r from-primary/5 to-primary/10">
        <div class="flex items-center justify-between">
          <div>
            <CardTitle class="text-lg flex items-center gap-2">
              <Network class="w-5 h-5 text-primary" />
              My IP Schema
              <Badge variant="outline" class="font-mono">v{{ schema.version }}</Badge>
              <Badge v-if="schema.version > 1" variant="default" class="bg-green-600">
                Updated
              </Badge>
            </CardTitle>
            <p class="text-xs text-muted-foreground mt-1">
              Last updated: {{ formatDate(schema.updatedAt) }}
            </p>
          </div>

          <div class="flex items-center gap-2">
            <!-- Edit Button (always available - no locking) -->
            <Button
              v-if="schema.canEdit"
              variant="outline"
              size="sm"
              @click="editSchema"
            >
              <Edit class="w-4 h-4 mr-1" />
              Edit
            </Button>

            <Button variant="ghost" size="sm" @click="toggleExpanded">
              <X class="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent class="p-4 overflow-y-auto max-h-[500px]">
        <!-- VLAN Schema -->
        <div class="space-y-4">
          <div v-for="vlan in schema.schema.vlans" :key="vlan.vlanIndex" class="border rounded-lg overflow-hidden">
            <div class="bg-primary/5 px-3 py-2 font-medium flex items-center justify-between">
              <span class="flex items-center gap-2">
                <Hash class="w-4 h-4" />
                VLAN {{ vlan.vlanIndex + 1 }}
              </span>
              <div class="flex items-center gap-2">
                <Badge variant="outline" class="text-xs">Subnet {{ vlan.subnetIndex }}</Badge>
                <Badge
                  :variant="vlan.source === 'calculated' ? 'secondary' : 'default'"
                  class="text-xs"
                  :class="{
                    'bg-primary/10 text-primary border-primary/30': vlan.source === 'calculated',
                    'bg-green-100 text-green-700 border-green-300': vlan.source === 'student_updated'
                  }"
                >
                  {{ vlan.source === 'calculated' ? 'Calculated' : 'Updated' }}
                </Badge>
              </div>
            </div>

            <Table>
              <TableBody>
                <TableRow>
                  <TableCell class="font-medium w-[200px]">Network Address</TableCell>
                  <TableCell class="font-mono text-primary font-semibold">
                    {{ vlan.networkAddress }}/{{ vlan.subnetMask }}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell class="font-medium">First Usable IP</TableCell>
                  <TableCell class="font-mono text-primary font-semibold">{{ vlan.firstUsableIp }}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell class="font-medium">Last Usable IP</TableCell>
                  <TableCell class="font-mono text-primary font-semibold">{{ vlan.lastUsableIp }}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell class="font-medium">Broadcast Address</TableCell>
                  <TableCell class="font-mono text-primary font-semibold">{{ vlan.broadcastAddress }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <!-- Device IP Assignments (if any) -->
          <div v-if="schema.schema.devices && schema.schema.devices.length > 0" class="mt-6">
            <h4 class="font-semibold mb-3 flex items-center gap-2">
              <Server class="w-4 h-4" />
              Device IP Assignments
            </h4>

            <div v-for="device in schema.schema.devices" :key="device.deviceId" class="border rounded-lg p-3 space-y-2 bg-accent/30">
              <div class="font-medium text-sm flex items-center gap-2">
                <Monitor class="w-4 h-4 text-primary" />
                {{ device.deviceId }}
              </div>

              <div v-for="iface in device.interfaces" :key="iface.variableName" class="flex items-center justify-between text-sm border-t pt-2">
                <span class="text-muted-foreground font-mono text-xs">{{ iface.variableName }}</span>
                <div class="flex items-center gap-2">
                  <span class="font-mono text-primary font-semibold">{{ iface.ipAddress }}</span>
                  <Badge
                    variant="outline"
                    class="text-xs"
                    :class="{
                      'bg-primary/10 border-primary/30 text-primary': iface.source === 'calculated',
                      'bg-green-50 border-green-300 text-green-700': iface.source === 'dhcp',
                      'bg-secondary/20 border-secondary text-secondary-foreground': iface.source === 'manual_update'
                    }"
                  >
                    <span v-if="iface.source === 'dhcp'" class="flex items-center gap-1">
                      <Wifi class="w-3 h-3" />
                      DHCP
                    </span>
                    <span v-else-if="iface.source === 'calculated'" class="flex items-center gap-1">
                      <Calculator class="w-3 h-3" />
                      Calc
                    </span>
                    <span v-else class="flex items-center gap-1">
                      <Edit class="w-3 h-3" />
                      Manual
                    </span>
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Help Text -->
        <div class="mt-4 text-xs text-muted-foreground flex items-start gap-2 bg-accent/30 p-3 rounded border border-accent">
          <Info class="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
          <div>
            <p class="font-medium mb-1">About this schema:</p>
            <ul class="list-disc list-inside space-y-1">
              <li>This schema reflects your current IP configuration</li>
              <li>You can edit this schema anytime (no time limits)</li>
              <li>Grading uses these IPs when testing your devices</li>
              <li v-if="schema.version > 1">
                Version {{ schema.version }} - Updated {{ getTimeSince(schema.updatedAt) }}
              </li>
              <li v-else>
                Version 1 - Initial calculation
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Network,
  ChevronUp,
  X,
  Edit,
  Server,
  Monitor,
  Info,
  Hash,
  Wifi,
  Calculator
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import type { StudentIpSchema } from '@/types/wizard'

interface Props {
  schema: StudentIpSchema
}

const props = defineProps<Props>()
const router = useRouter()
const route = useRoute()
const isExpanded = ref(false)

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}

const editSchema = () => {
  // Navigate to IP Calculation part in update mode
  if (props.schema.calculationPartId) {
    router.push({
      path: route.path,
      query: {
        ...route.query,
        part: props.schema.calculationPartId,
        mode: 'update'
      }
    })
  }
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'Unknown'
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getTimeSince = (dateStr?: string) => {
  if (!dateStr) return 'recently'

  const date = new Date(dateStr)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`

  return formatDate(dateStr)
}
</script>

<style scoped>
/* Smooth transitions */
.transition-all {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Shadow animations */
.shadow-lg {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.shadow-xl {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.shadow-2xl {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}
</style>
