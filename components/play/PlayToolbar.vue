<template>
  <div class="p-4 space-y-4">
    <div>
      <h3 class="font-medium mb-2">Network Devices</h3>
      <div class="space-y-2">
        <div
          v-for="deviceItem in deviceTypes"
          :key="deviceItem.type"
          :draggable="true"
          @dragstart="onDragStart($event, deviceItem.type)"
          class="flex items-center gap-2 p-2 border rounded cursor-move hover:bg-gray-50"
        >
          <component :is="deviceItem.icon" class="w-5 h-5" :class="deviceItem.iconColor" />
          <div class="flex-1">
            <div class="text-sm font-medium">{{ deviceItem.name }}</div>
            <div class="text-xs text-gray-500">{{ deviceItem.description }}</div>
          </div>
        </div>
      </div>
    </div>

    <div>
      <h3 class="font-medium mb-2">Connection Types</h3>
      <div class="space-y-2">
        <div
          v-for="connection in connectionTypes"
          :key="connection.type"
          :class="[
            'flex items-center gap-2 p-2 border rounded cursor-pointer transition-colors',
            selectedConnectionType === connection.type 
              ? 'border-blue-500 bg-blue-50' 
              : 'hover:bg-gray-50'
          ]"
          @click="selectConnectionType(connection.type)"
        >
          <div 
            :class="connection.color"
            class="w-4 h-1 rounded"
          />
          <div class="flex-1">
            <div class="text-sm font-medium">{{ connection.name }}</div>
            <div class="text-xs text-gray-500">{{ connection.description }}</div>
          </div>
          <div v-if="selectedConnectionType === connection.type" class="w-2 h-2 bg-blue-500 rounded-full" />
        </div>
      </div>
    </div>
    <div>
      <h3 class="font-medium mb-2">Device Properties</h3>
      <div v-if="selectedNode && selectedNode.type === 'device'" class="space-y-3">
        <div>
          <label class="text-xs text-gray-600">Device Name</label>
          <Input 
            v-model="selectedNode.name"
            class="text-sm"
          />
        </div>
        
        <div v-if="selectedNode.deviceType !== 'pc'">
          <label class="text-xs text-gray-600">Model</label>
          <Select v-model="selectedNode.model">
            <SelectTrigger class="text-sm">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem 
                v-for="model in getDeviceModels(selectedNode.deviceType)"
                :key="model"
                :value="model"
              >
                {{ model }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label class="text-xs text-gray-600">Management IP</label>
          <Input 
            v-model="selectedNode.managementIP"
            class="text-sm"
            placeholder="192.168.1.1"
          />
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-xs text-gray-600">Interfaces</label>
            <Button
              size="sm"
              variant="outline"
              @click="openInterfaceModal"
            >
              <Plus class="w-3 h-3 mr-1" />
              Add
            </Button>
          </div>
          
          <div class="space-y-1 max-h-32 overflow-y-auto">
            <div
              v-for="interfaceItem in selectedNode.interfaces"
              :key="interfaceItem.id"
              class="flex items-center justify-between p-1 text-xs bg-gray-50 rounded"
            >
              <span>{{ interfaceItem.name }}</span>
              <div class="flex items-center gap-1">
                <span 
                  :class="getInterfaceStatusColor(interfaceItem.status)"
                  class="w-2 h-2 rounded-full"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  @click="editInterface(interfaceItem)"
                  class="h-5 w-5 p-0"
                >
                  <Edit2 class="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p v-else class="text-sm text-gray-500">
        Select a device to edit properties
      </p>
    </div>

    <!-- Interface Configuration Modal -->
    <InterfaceConfigModal
      v-model:open="showInterfaceModal"
      :device-type="selectedNode?.deviceType"
      :interface="editingInterface"
      @save="saveInterface"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Monitor, Router, Server, Plus, Edit2 } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import InterfaceConfigModal from './modals/InterfaceConfigModal.vue'
import type { NetworkInterface } from '@/types/play'
import { usePlayCanvas } from '@/composables/usePlayCanvas'

const { selectedNode, selectedConnectionType, setConnectionType } = usePlayCanvas()

const showInterfaceModal = ref(false)
const editingInterface = ref<NetworkInterface | null>(null)

const deviceTypes = [
  { 
    type: 'pc', 
    name: 'PC/Workstation', 
    description: 'End-user device',
    icon: Monitor, 
    iconColor: 'text-blue-600' 
  },
  { 
    type: 'cisco-switch', 
    name: 'Cisco Switch', 
    description: 'Layer 2/3 Switch',
    icon: Server, 
    iconColor: 'text-green-600' 
  },
  { 
    type: 'cisco-router', 
    name: 'Cisco Router', 
    description: 'Layer 3 Router',
    icon: Router, 
    iconColor: 'text-orange-600' 
  }
]

const connectionTypes = [
  { 
    type: 'lan', 
    name: 'Ethernet Cable', 
    description: 'RJ45 Copper Cable',
    color: 'bg-blue-500' 
  },
  { 
    type: 'serial', 
    name: 'Serial Cable', 
    description: 'DCE/DTE Serial',
    color: 'bg-red-500' 
  }
]

const selectConnectionType = (type: string) => {
  setConnectionType(type)
}

const getDeviceModels = (deviceType: string | undefined) => {
  const models = {
    'cisco-switch': [
      'Catalyst 2960', 'Catalyst 3560', 'Catalyst 3750', 
      'Catalyst 3850', 'Catalyst 9200', 'Catalyst 9300'
    ],
    'cisco-router': [
      'ISR 1900', 'ISR 2900', 'ISR 4000', 
      'ASR 1000', 'CSR 1000V', '7200 Series'
    ]
  }
  return models[deviceType as keyof typeof models] || []
}

const getInterfaceStatusColor = (status: string) => {
  const colors = {
    'up': 'bg-green-500',
    'down': 'bg-red-500',
    'admin-down': 'bg-gray-500'
  }
  return colors[status as keyof typeof colors] || 'bg-gray-500'
}

const openInterfaceModal = () => {
  editingInterface.value = null
  showInterfaceModal.value = true
}

const editInterface = (interfaceItem: NetworkInterface) => {
  editingInterface.value = interfaceItem
  showInterfaceModal.value = true
}

const saveInterface = (interfaceData: NetworkInterface) => {
  if (!selectedNode.value) return
  
  if (!selectedNode.value.interfaces) {
    selectedNode.value.interfaces = []
  }
  
  if (editingInterface.value) {
    // Update existing interface
    const index = selectedNode.value.interfaces.findIndex(
      i => i.id === editingInterface.value!.id
    )
    if (index !== -1) {
      selectedNode.value.interfaces[index] = interfaceData
    }
  } else {
    // Add new interface
    selectedNode.value.interfaces.push(interfaceData)
  }
}

const onDragStart = (event: DragEvent, nodeType: string) => {
  event.dataTransfer?.setData('text/plain', nodeType)
}
</script>