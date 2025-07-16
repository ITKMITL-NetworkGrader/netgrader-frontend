import { ref, computed, watch } from 'vue'
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
  const selectedConnectionType = ref<string | null>(null)

  // Debug watcher to track when selectedConnectionType changes
  watch(selectedConnectionType, (newVal, oldVal) => {
    console.log('🔍 selectedConnectionType changed:', { from: oldVal, to: newVal })
    console.trace('Call stack:')
  })

  // Debug watcher to track when connectingFrom changes
  watch(connectingFrom, (newVal, oldVal) => {
    console.log('🔍 connectingFrom changed:', { from: oldVal, to: newVal })
    console.trace('Call stack:')
  })

  // State for the new interface selection modal
  const isInterfaceModalOpen = ref(false)
  const modalNode = ref<PlayNode | null>(null)
  const modalTitle = ref('')

  const selectedNode = computed(() => 
    nodes.value.find(node => node.id === selectedNodeId.value) || null
  )

  const setConnectionType = (type: string | null) => {
    selectedConnectionType.value = type
  }

  // --- NEW CONNECTION FLOW ---

  // 1. Triggered when a node is clicked in connection mode
  const initiateConnection = (node: PlayNode) => {
    console.log('=== INITIATE CONNECTION ===')
    console.log('Node:', node.name)
    console.log('connectingFrom before:', connectingFrom.value)
    
    modalNode.value = node
    if (!connectingFrom.value) {
      console.log('Setting title to Select Source Interface')
      // This is the source node
      modalTitle.value = 'Select Source Interface'
    } else {
      console.log('Setting title to Select Destination Interface')
      // This is the destination node
      modalTitle.value = 'Select Destination Interface'
    }
    isInterfaceModalOpen.value = true
    console.log('Modal title set to:', modalTitle.value)
  }

  // 2. Triggered when an interface is selected from the modal
  const handleInterfaceSelection = (interfaceId: string) => {
    console.log('=== INTERFACE SELECTION ===')
    console.log('Interface ID:', interfaceId)
    console.log('Modal Node:', modalNode.value?.name)
    console.log('Connecting From:', connectingFrom.value)
    
    if (!modalNode.value) return

    const nodeId = modalNode.value.id

    if (!connectingFrom.value) {
      console.log('Setting source connection')
      // Set the source and wait for the next node click
      connectingFrom.value = { nodeId, interfaceId }
      console.log('ConnectingFrom set to:', connectingFrom.value)
      console.log('selectedConnectionType after setting source:', selectedConnectionType.value)
      // DON'T reset selectedConnectionType here - we're still in connection mode!
    } else {
      console.log('Creating destination connection')
      // We have the source, now we have the destination. Create the connection.
      if (connectingFrom.value.nodeId === nodeId) {
        console.log('Cannot connect node to itself')
        // Avoid connecting a node to itself
        connectingFrom.value = null
        // Reset connection type to exit connection mode
        selectedConnectionType.value = null
        return
      }

      console.log('Creating new connection...')
      const newConnection: Connection = {
        id: `conn-${Date.now()}`,
        type: (selectedConnectionType.value || 'lan') as 'lan' | 'serial' | 'console',
        sourceNodeId: connectingFrom.value.nodeId,
        sourceInterfaceId: connectingFrom.value.interfaceId,
        targetNodeId: nodeId,
        targetInterfaceId: interfaceId,
      }
      console.log('New connection created:', newConnection)
      connections.value.push(newConnection)
      console.log('Total connections now:', connections.value.length)
      // Reset for the next connection
      connectingFrom.value = null
      // Reset connection type to exit connection mode
      selectedConnectionType.value = null
    }
    isInterfaceModalOpen.value = false
    modalNode.value = null
  }

  const cancelConnection = () => {
    connectingFrom.value = null
    isInterfaceModalOpen.value = false
    modalNode.value = null
    // Reset connection type to exit connection mode
    selectedConnectionType.value = null
  }

  const selectNode = (nodeId: string) => {
    selectedNodeId.value = nodeId
  }

  const clearSelection = () => {
    console.log('=== CLEAR SELECTION CALLED ===')
    console.log('connectingFrom before clear:', connectingFrom.value)
    console.log('selectedConnectionType:', selectedConnectionType.value)
    
    selectedNodeId.value = null
    
    // Only cancel connection if we're not in connection mode
    if (!selectedConnectionType.value) {
      cancelConnection() // Also cancel any pending connection
    }
    
    console.log('connectingFrom after clear:', connectingFrom.value)
  }

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

  const startConnection = (data: { nodeId: string; interfaceId: string }) => {
    connectingFrom.value = data
  }

  const completeConnection = (data: { nodeId: string; interfaceId: string }) => {
    if (!connectingFrom.value) return
    
    // Don't allow connection to the same node
    if (connectingFrom.value.nodeId === data.nodeId) {
      connectingFrom.value = null
      return
    }

    // Don't allow connection to the same interface
    if (connectingFrom.value.interfaceId === data.interfaceId) {
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
      connectingFrom.value = null
      return
    }

    // Create connection
    const newConnection: Connection = {
      id: `conn-${Date.now()}`,
      type: (selectedConnectionType.value || 'lan') as 'lan' | 'serial',
      sourceNodeId: connectingFrom.value.nodeId,
      targetNodeId: data.nodeId,
      sourceInterfaceId: connectingFrom.value.interfaceId,
      targetInterfaceId: data.interfaceId
    }
    
    connections.value.push(newConnection)
    connectingFrom.value = null
    // Reset connection type to exit connection mode
    selectedConnectionType.value = null
  }

  const saveTask = (config: TaskConfig) => {
    if (selectedNode.value) {
      if (!selectedNode.value.tasks) {
        selectedNode.value.tasks = []
      }
      selectedNode.value.tasks.push(config)
    }
  }

  const deleteTask = (taskId: string) => {
    nodes.value.forEach(node => {
      if (node.tasks) {
        node.tasks = node.tasks.filter(task => task.id !== taskId)
      }
    })
  }

  const updateTaskOrder = (reorderedTasks: TaskConfig[]) => {
    // Update task order across all nodes
    const taskMap = new Map<string, TaskConfig>()
    reorderedTasks.forEach(task => {
      taskMap.set(task.id, task)
    })

    nodes.value.forEach(node => {
      if (node.tasks) {
        node.tasks = node.tasks
          .map(task => taskMap.get(task.id) || task)
          .sort((a, b) => {
            const indexA = reorderedTasks.findIndex(t => t.id === a.id)
            const indexB = reorderedTasks.findIndex(t => t.id === b.id)
            return indexA - indexB
          })
      }
    })
  }

  const duplicateTask = (originalTask: TaskConfig, targetNodeId?: string) => {
    const newTask: TaskConfig = {
      ...originalTask,
      id: `task-${Date.now()}`,
    }

    const targetNode = targetNodeId 
      ? nodes.value.find(n => n.id === targetNodeId)
      : selectedNode.value

    if (targetNode) {
      if (!targetNode.tasks) {
        targetNode.tasks = []
      }
      targetNode.tasks.push(newTask)
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
    connectingFrom,
    selectedConnectionType,
    isInterfaceModalOpen,
    modalNode,
    modalTitle,
    addNode,
    moveNode,
    selectNode,
    clearSelection,
    saveTask,
    deleteTask,
    updateTaskOrder,
    duplicateTask,
    removeNode,
    setConnectionType,
    initiateConnection,
    handleInterfaceSelection,
    cancelConnection,
  }
}