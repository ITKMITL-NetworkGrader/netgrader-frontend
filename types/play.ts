export interface NetworkInterface {
  id: string
  name: string
  type: 'ethernet' | 'serial' | 'console' | 'gigabit' | 'fastethernet'
  ipAddress?: string
  subnetMask?: string
  status: 'up' | 'down' | 'admin-down'
  description?: string
  vlan?: number
  speed?: string
  duplex?: 'full' | 'half' | 'auto'
}

export interface PlayNode {
  id: string
  type: 'grader' | 'device'
  deviceType?: 'pc' | 'cisco-switch' | 'cisco-router'
  name: string
  position: { x: number; y: number }
  ipAddress?: string
  interfaces?: NetworkInterface[]
  tasks?: TaskConfig[]
  // Device-specific properties
  model?: string
  osVersion?: string
  managementIP?: string
}

export interface Connection {
  id: string
  type: 'lan' | 'serial' | 'console'
  sourceNodeId: string
  targetNodeId: string
  sourceInterfaceId: string
  targetInterfaceId: string
  label?: string
  bandwidth?: string
}

export interface TaskConfig {
  id: string
  type: 'ping' | 'traceroute' | 'ssh' | 'telnet' | 'show-command' | 'config-verify'
  destinationIPs: string[]
  username?: string
  password?: string
  enablePassword?: string
  commands?: string[]
  expectedResult: 'success' | 'failure' | 'timeout' | 'contains' | 'not-contains'
  expectedOutput?: string
  points: number
  timeout?: number
}

export interface PlayData {
  id: string
  courseId: string
  name: string
  nodes: PlayNode[]
  connections: Connection[]
  createdAt: string
  updatedAt: string
}