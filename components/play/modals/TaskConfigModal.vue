<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-3xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Configure Grading Task - {{ node?.name }}</DialogTitle>
        <DialogDescription>
          Set up automated grading tasks for this device
        </DialogDescription>
      </DialogHeader>
      
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <Label>Task Type</Label>
            <Select v-model="taskConfig.type">
              <SelectTrigger>
                <SelectValue placeholder="Select task type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ping">Ping Test</SelectItem>
                <SelectItem value="traceroute">Traceroute</SelectItem>
                <SelectItem value="ssh">SSH Connectivity</SelectItem>
                <SelectItem value="telnet">Telnet Connectivity</SelectItem>
                <SelectItem value="show-command">Show Command</SelectItem>
                <SelectItem value="config-verify">Config Verification</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
          <Label>Source Interface</Label>
          <Select v-model="taskConfig.sourceInterface">
            <SelectTrigger>
              <SelectValue placeholder="Select source interface" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem 
                v-for="interfaceItem in node?.interfaces"
                :key="interfaceItem.id"
                :value="interfaceItem.id"
              >
                {{ interfaceItem.name }} ({{ interfaceItem.ipAddress || 'No IP' }})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        </div>

        <div>
          <Label>Destination Device</Label>
          <Select v-model="taskConfig.destinationDevice">
            <SelectTrigger>
              <SelectValue placeholder="Select destination device" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem 
                v-for="device in availableDevices"
                :key="device.id"
                :value="device.id"
              >
                {{ device.name }} ({{ device.deviceType }})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Destination IP Addresses</Label>
          <div class="space-y-2">
            <div
              v-for="(ip, index) in taskConfig.destinationIPs"
              :key="index"
              class="flex gap-2"
            >
              <Input
                v-model="taskConfig.destinationIPs[index]"
                placeholder="192.168.1.1"
                class="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                @click="removeIP(index)"
                :disabled="taskConfig.destinationIPs.length === 1"
              >
                Remove
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              @click="addIP"
            >
              Add IP Address
            </Button>
          </div>
        </div>

        <!-- Cisco Device Credentials -->
        <div v-if="taskConfig.type === 'ssh' || taskConfig.type === 'telnet' || taskConfig.type === 'show-command' || taskConfig.type === 'config-verify'">
          <Label>Device Credentials</Label>
          <div class="grid grid-cols-3 gap-2">
            <div>
              <Label class="text-xs">Username</Label>
              <Input v-model="taskConfig.username" placeholder="admin" />
            </div>
            <div>
              <Label class="text-xs">Password</Label>
              <Input v-model="taskConfig.password" type="password" />
            </div>
            <div>
              <Label class="text-xs">Enable Password</Label>
              <Input v-model="taskConfig.enablePassword" type="password" />
            </div>
          </div>
        </div>

        <!-- Commands for Cisco devices -->
        <div v-if="taskConfig.type === 'show-command' || taskConfig.type === 'config-verify'">
          <Label>Commands to Execute</Label>
          <div class="space-y-2">
            <div
              v-for="(command, index) in taskConfig.commands"
              :key="index"
              class="flex gap-2"
            >
              <Input
                v-model="taskConfig.commands[index]"
                placeholder="show ip route"
                class="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                @click="removeCommand(index)"
                :disabled="taskConfig.commands.length === 1"
              >
                Remove
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              @click="addCommand"
            >
              Add Command
            </Button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <Label>Expected Result</Label>
            <Select v-model="taskConfig.expectedResult">
              <SelectTrigger>
                <SelectValue placeholder="Select expected result" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failure">Failure</SelectItem>
                <SelectItem value="timeout">Timeout</SelectItem>
                <SelectItem value="contains">Output Contains</SelectItem>
                <SelectItem value="not-contains">Output Not Contains</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Timeout (seconds)</Label>
            <Input
              v-model.number="taskConfig.timeout"
              type="number"
              min="1"
              max="300"
              placeholder="30"
            />
          </div>
        </div>

        <div v-if="taskConfig.expectedResult === 'contains' || taskConfig.expectedResult === 'not-contains'">
          <Label>Expected Output Text</Label>
          <Textarea
            v-model="taskConfig.expectedOutput"
            placeholder="Enter the text that should be present/absent in the command output"
            rows="3"
          />
        </div>

        <div>
          <Label>Points</Label>
          <Input
            v-model.number="taskConfig.points"
            type="number"
            min="0"
            max="100"
            placeholder="10"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="$emit('update:open', false)">
          Cancel
        </Button>
        <Button @click="saveTask">
          Save Task
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { PlayNode, TaskConfig } from '@/types/play'

interface Props {
  open: boolean
  node: PlayNode | null
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'save', config: TaskConfig): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const taskConfig = ref<TaskConfig>({
  id: '',
  type: '',
  destinationDevice: '',
  destinationIPs: [''],
  commands: [''],
  username: '',
  password: '',
  enablePassword: '',
  expectedResult: 'success',
  points: 10,
  timeout: 30
})

// Mock available devices - replace with actual data from canvas
const availableDevices = ref([
  { id: '1', name: 'Router-1', deviceType: 'cisco-router' },
  { id: '2', name: 'Switch-1', deviceType: 'cisco-switch' },
  { id: '3', name: 'PC-1', deviceType: 'pc' }
])

const addIP = () => {
  taskConfig.value.destinationIPs.push('')
}

const removeIP = (index: number) => {
  taskConfig.value.destinationIPs.splice(index, 1)
}

const addCommand = () => {
  if (!taskConfig.value.commands) {
    taskConfig.value.commands = []
  }
  taskConfig.value.commands.push('')
}

const removeCommand = (index: number) => {
  if (taskConfig.value.commands) {
    taskConfig.value.commands.splice(index, 1)
  }
}

const saveTask = () => {
  const newTask: TaskConfig = {
    ...taskConfig.value,
    id: `task-${Date.now()}`
  }
  
  emit('save', newTask)
  emit('update:open', false)
}

// Reset form when modal opens
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    taskConfig.value = {
      id: '',
      type: '',
      destinationDevice: '',
      destinationIPs: [''],
      commands: [''],
      username: '',
      password: '',
      enablePassword: '',
      expectedResult: 'success',
      points: 10,
      timeout: 30
    }
  }
})
</script>