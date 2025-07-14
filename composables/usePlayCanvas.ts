import { ref, computed } from 'vue'
import type { PlayNode, Connection, TaskConfig, NetworkInterface } from '@/types/play'

export const usePlayCanvas = (playId?: string) => {
  const nodes = ref<PlayNode[]>([
    {
      id: 'grader-1',
      type: 'grader',
      name: 'Grader',
      position: { x: 100, y: 100 },
      interfaces: [
        {
          id: 'grader-int-1',
          name: 'Control',
          type: 'ethernet',
          status: 'up'
        }
      ]
    }
  ])
  
  const connections = ref<Connection[]>([])
  const selectedNodeId = ref<string | null>(null)
  const connectingFrom = ref<{ nodeId: string; interfaceId: string } | null>(null)

  const selectedNode = computed(() => 
    nodes.value.find(node => node.id === selectedNodeId.value) || null
  )
  const selectedConnectionType = ref<string>('lan')

  const addNode = (nodeType: string, position: { x: number; y: number }) => {
    const defaultInterfaces = getDefaultInterfaces(nodeType)
    
    const newNode: PlayNode = {
      id: `${nodeType}-${Date.now()}`,
      type: 'device',
      deviceType: nodeType as 'pc' | 'cisco-switch' | 'cisco-router',
      name: `${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}-${nodes.value.length}`,
      position,
      interfaces: defaultInterfaces,
      tasks: []
    }
    
    nodes.value.push(newNode)
  }

  const getDefaultInterfaces = (deviceType: string): NetworkInterface[] => {
    const timestamp = Date.now()
    const defaults = {
      'pc': [
        {
          id: `int-${timestamp}-1`,
          name: 'Ethernet0',
          type: 'ethernet' as const,
          status: 'up' as const,
          duplex: 'auto' as const,
          speed: 'auto'
        }
      ],
      'cisco-switch': [
        {
          id: `int-${timestamp}-1`,
          name: 'FastEthernet0/1',
          type: 'fastethernet' as const,
          status: 'up' as const,
          duplex: 'auto' as const,
          speed: '100'
        },
        {
          id: `int-${timestamp}-2`,
          name: 'FastEthernet0/2',
          type: 'fastethernet' as const,
          status: 'up' as const,
          duplex: 'auto' as const,
          speed: '100'
        },
        {
          id: `int-${timestamp}-3`,
          name: 'VLAN1',
          type: 'ethernet' as const,
          status: 'up' as const,
          vlan: 1
        }
      ],
      'cisco-router': [
        {
          id: `int-${timestamp}-1`,
          name: 'FastEthernet0/0',
          type: 'fastethernet' as const,
          status: 'up' as const,
          duplex: 'auto' as const,
          speed: '100'
        },
        {
          id: `int-${timestamp}-2`,
          name: 'Serial0/0/0',
          type: 'serial' as const,
          status: 'up' as const
        }
      ]
    }
    
    return defaults[deviceType as keyof typeof defaults] || []
  }

  const moveNode = (nodeId: string, position: { x: number; y: number }) => {
    const node = nodes.value.find(n => n.id === nodeId)
    if (node) {
      node.position = position
    }
  }

  const selectNode = (nodeId: string) => {
    selectedNodeId.value = nodeId
  }

  const clearSelection = () => {
    selectedNodeId.value = null
    connectingFrom.value = null
  }

  const startConnection = (data: { nodeId: string; interfaceId: string }) => {
    console.log('Starting connection from:', data)
    connectingFrom.value = data
  }

  const setConnectionType = (type: string) => {
    selectedConnectionType.value = type
  }

  const completeConnection = (data: { nodeId: string; interfaceId: string }) => {
    if (!connectingFrom.value) return
    
    console.log('Completing connection to:', data)
    
    // Don't allow connection to the same node
    if (connectingFrom.value.nodeId === data.nodeId) {
      console.log('Cannot connect to the same node')
      connectingFrom.value = null
      return
    }

    // Don't allow connection to the same interface
    if (connectingFrom.value.interfaceId === data.interfaceId) {
      console.log('Cannot connect to the same interface')
      connectingFrom.value = null
      return
    }

    // Check if interface is already connected
    const existingConnection = connections.value.find(conn => 
      conn.sourceInterfaceId === data.interfaceId || 
      conn.targetInterfaceId === data.interfaceId ||
      conn.sourceInterfaceId === connectingFrom.value!.interfaceId || 
      conn.targetInterfaceId === connectingFrom.value!.interfaceId
    )

    if (existingConnection) {
      console.log('Interface already connected')
      connectingFrom.value = null
      return
    }

    // Create connection
    const newConnection: Connection = {
      id: `conn-${Date.now()}`,
      type: selectedConnectionType.value as 'lan' | 'serial',
      sourceNodeId: connectingFrom.value.nodeId,
      targetNodeId: data.nodeId,
      sourceInterfaceId: connectingFrom.value.interfaceId,
      targetInterfaceId: data.interfaceId
    }
    
    connections.value.push(newConnection)
    console.log('Connection created:', newConnection)
    connectingFrom.value = null
  }

  const saveTask = (config: TaskConfig) => {
    if (selectedNode.value) {
      if (!selectedNode.value.tasks) {
        selectedNode.value.tasks = []
      }
      selectedNode.value.tasks.push(config)
    }
  }

  const removeNode = (nodeId: string) => {
  // Remove node
  nodes.value = nodes.value.filter(n => n.id !== nodeId)
  // Remove related connections
  connections.value = connections.value.filter(
    c => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId
  )
  // Deselect if needed
  if (selectedNodeId.value === nodeId) selectedNodeId.value = null
}

  return {
    nodes,
    connections,
    selectedNodeId,
    selectedNode,
    selectedConnectionType,
    setConnectionType,
    connectingFrom,
    addNode,
    moveNode,
    selectNode,
    removeNode,
    clearSelection,
    startConnection,
    completeConnection,
    saveTask
  }
}