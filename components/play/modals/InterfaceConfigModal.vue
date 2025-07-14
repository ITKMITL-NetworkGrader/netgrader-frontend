<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>
          {{ interface ? 'Edit' : 'Add' }} Interface
        </DialogTitle>
        <DialogDescription>
          Configure network interface settings
        </DialogDescription>
      </DialogHeader>
      
      <div class="space-y-4">
        <div>
          <Label>Interface Name</Label>
          <Select v-model="interfaceConfig.name">
            <SelectTrigger>
              <SelectValue placeholder="Select interface" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem 
                v-for="name in getAvailableInterfaces()"
                :key="name"
                :value="name"
              >
                {{ name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Interface Type</Label>
          <Select v-model="interfaceConfig.type">
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem 
                v-for="type in getInterfaceTypes()"
                :key="type.value"
                :value="type.value"
              >
                {{ type.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <Label>IP Address</Label>
            <Input
              v-model="interfaceConfig.ipAddress"
              placeholder="192.168.1.1"
            />
          </div>
          <div>
            <Label>Subnet Mask</Label>
            <Input
              v-model="interfaceConfig.subnetMask"
              placeholder="255.255.255.0"
            />
          </div>
        </div>

        <div>
          <Label>Status</Label>
          <Select v-model="interfaceConfig.status">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="up">Up</SelectItem>
              <SelectItem value="down">Down</SelectItem>
              <SelectItem value="admin-down">Admin Down</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div v-if="deviceType === 'cisco-switch'">
          <Label>VLAN</Label>
          <Input
            v-model.number="interfaceConfig.vlan"
            type="number"
            placeholder="1"
            min="1"
            max="4094"
          />
        </div>

        <div v-if="interfaceConfig.type === 'ethernet' || interfaceConfig.type === 'fastethernet' || interfaceConfig.type === 'gigabit'">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <Label>Speed</Label>
              <Select v-model="interfaceConfig.speed">
                <SelectTrigger>
                  <SelectValue placeholder="Auto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="10">10 Mbps</SelectItem>
                  <SelectItem value="100">100 Mbps</SelectItem>
                  <SelectItem value="1000">1000 Mbps</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Duplex</Label>
              <Select v-model="interfaceConfig.duplex">
                <SelectTrigger>
                  <SelectValue placeholder="Auto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                  <SelectItem value="half">Half</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div>
          <Label>Description</Label>
          <Input
            v-model="interfaceConfig.description"
            placeholder="Interface description"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="$emit('update:open', false)">
          Cancel
        </Button>
        <Button @click="saveInterface">
          {{ interface ? 'Update' : 'Add' }} Interface
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
import type { NetworkInterface } from '@/types/play'

interface Props {
  open: boolean
  deviceType?: string
  interface?: NetworkInterface | null
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'save', interfaceItem: NetworkInterface): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const interfaceConfig = ref<NetworkInterface>({
  id: '',
  name: '',
  type: 'ethernet',
  status: 'up',
  duplex: 'auto',
  speed: 'auto'
})

const getAvailableInterfaces = () => {
  const interfaces = {
    'pc': [
      'Ethernet0', 'Ethernet1', 'Wi-Fi'
    ],
    'cisco-switch': [
      'FastEthernet0/1', 'FastEthernet0/2', 'FastEthernet0/3', 'FastEthernet0/4',
      'FastEthernet0/5', 'FastEthernet0/6', 'FastEthernet0/7', 'FastEthernet0/8',
      'GigabitEthernet0/1', 'GigabitEthernet0/2', 'VLAN1'
    ],
    'cisco-router': [
      'FastEthernet0/0', 'FastEthernet0/1', 'GigabitEthernet0/0', 'GigabitEthernet0/1',
      'Serial0/0/0', 'Serial0/0/1', 'Serial0/1/0', 'Serial0/1/1'
    ]
  }
  return interfaces[props.deviceType as keyof typeof interfaces] || []
}

const getInterfaceTypes = () => {
  const types = {
    'pc': [
      { value: 'ethernet', label: 'Ethernet' }
    ],
    'cisco-switch': [
      { value: 'fastethernet', label: 'Fast Ethernet' },
      { value: 'gigabit', label: 'Gigabit Ethernet' },
      { value: 'ethernet', label: 'Ethernet' }
    ],
    'cisco-router': [
      { value: 'fastethernet', label: 'Fast Ethernet' },
      { value: 'gigabit', label: 'Gigabit Ethernet' },
      { value: 'serial', label: 'Serial' },
      { value: 'ethernet', label: 'Ethernet' }
    ]
  }
  return types[props.deviceType as keyof typeof types] || [
    { value: 'ethernet', label: 'Ethernet' }
  ]
}

const saveInterface = () => {
  const newInterface: NetworkInterface = {
    ...interfaceConfig.value,
    id: props.interface?.id || `int-${Date.now()}`
  }
  
  emit('save', newInterface)
  emit('update:open', false)
}

// Reset form when modal opens
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    if (props.interface) {
      interfaceConfig.value = { ...props.interface }
    } else {
      interfaceConfig.value = {
        id: '',
        name: '',
        type: 'ethernet',
        status: 'up',
        duplex: 'auto',
        speed: 'auto'
      }
    }
  }
})
</script>