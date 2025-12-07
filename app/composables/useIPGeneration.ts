import type { 
  IPGenerationResult, 
  IPAssignment, 
  StudentCSVRow, 
  NetworkConfig,
  DeviceConfig,
  IPGenerationStrategy
} from '@/types/ipSchema'
import type { IpSchema, DeviceIpMapping } from '@/types/lab'

export const useIPGeneration = () => {
  const { calculateNetworkInfo, validateIPAddress, isIPInNetwork } = useNetworkValidation()
  
  const generateIPAssignments = (
    students: StudentCSVRow[],
    networkConfig: NetworkConfig,
    deviceConfigs: DeviceConfig[],
    strategy: 'group_based' | 'student_id_based'
  ): IPGenerationResult => {
    const errors: string[] = []
    const warnings: string[] = []
    const assignments: IPAssignment[] = []
    
    try {
      const networkInfo = calculateNetworkInfo(networkConfig.baseNetwork, networkConfig.subnetMask)
      
      // Validate we have enough IP space
      const requiredIPs = students.length * deviceConfigs.length
      if (requiredIPs > networkInfo.totalHosts) {
        errors.push(`Not enough IP addresses: need ${requiredIPs}, but network has only ${networkInfo.totalHosts} available`)
        return { success: false, errors }
      }
      
      if (strategy === 'group_based') {
        return generateGroupBasedIPs(students, networkConfig, deviceConfigs, networkInfo)
      } else {
        return generateStudentBasedIPs(students, networkConfig, deviceConfigs, networkInfo)
      }
      
    } catch (error) {
      errors.push(`IP generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return { success: false, errors }
    }
  }
  
  const generateGroupBasedIPs = (
    students: StudentCSVRow[],
    networkConfig: NetworkConfig,
    deviceConfigs: DeviceConfig[],
    networkInfo: any
  ): IPGenerationResult => {
    const errors: string[] = []
    const warnings: string[] = []
    const assignments: IPAssignment[] = []
    
    // Group students by group number
    const groups = new Map<number, StudentCSVRow[]>()
    const studentsWithoutGroups: StudentCSVRow[] = []
    
    students.forEach(student => {
      if (student.groupNumber !== undefined) {
        if (!groups.has(student.groupNumber)) {
          groups.set(student.groupNumber, [])
        }
        groups.get(student.groupNumber)!.push(student)
      } else {
        studentsWithoutGroups.push(student)
      }
    })
    
    if (studentsWithoutGroups.length > 0) {
      errors.push(`Group-based generation requires all students to have group assignments. ${studentsWithoutGroups.length} students missing groups.`)
      return { success: false, errors }
    }
    
    // Generate IPs for each group
    const baseNetworkParts = networkConfig.baseNetwork.split('.').map(Number)
    
    for (const [groupNumber, groupStudents] of groups) {
      // Calculate group subnet (e.g., 10.30.[6+groupNumber].x)
      const groupSubnet = [...baseNetworkParts]
      groupSubnet[2] = baseNetworkParts[2] + groupNumber
      
      // Validate group subnet doesn't exceed valid range
      if (groupSubnet[2] > 255) {
        errors.push(`Group ${groupNumber} subnet exceeds valid IP range (${groupSubnet.join('.')})`)
        continue
      }
      
      const groupSubnetStr = groupSubnet.join('.')
      
      // Generate assignments for each student in the group
      groupStudents.forEach(student => {
        const deviceAssignments: IPAssignment['deviceAssignments'] = []
        const ipMappings: Record<string, string> = {}
        
        deviceConfigs.forEach(deviceConfig => {
          // Generate IP based on device host offset
          const deviceIP = [...groupSubnet]
          deviceIP[3] = deviceConfig.hostOffset
          const ipAddress = deviceIP.join('.')
          
          // Validate generated IP
          if (!validateIPAddress(ipAddress)) {
            errors.push(`Invalid IP generated for student ${student.studentId}, device ${deviceConfig.deviceId}: ${ipAddress}`)
            return
          }
          
          deviceAssignments.push({
            deviceId: deviceConfig.deviceId,
            ipAddress,
            variableName: deviceConfig.ipVariable
          })
          
          ipMappings[deviceConfig.ipVariable] = ipAddress
        })
        
        assignments.push({
          studentId: student.studentId,
          groupNumber: student.groupNumber,
          deviceAssignments,
          ipMappings
        })
      })
    }
    
    return {
      success: errors.length === 0,
      assignments,
      networkInfo,
      errors,
      warnings
    }
  }
  
  const generateStudentBasedIPs = (
    students: StudentCSVRow[],
    networkConfig: NetworkConfig,
    deviceConfigs: DeviceConfig[],
    networkInfo: any
  ): IPGenerationResult => {
    const errors: string[] = []
    const warnings: string[] = []
    const assignments: IPAssignment[] = []
    
    students.forEach((student, index) => {
      const deviceAssignments: IPAssignment['deviceAssignments'] = []
      const ipMappings: Record<string, string> = {}
      
      // Use student ID's last 2 digits for subnet offset
      const studentIdNum = parseInt(student.studentId)
      const subnetOffset = studentIdNum % 100 // Use last 2 digits
      
      const baseNetworkParts = networkConfig.baseNetwork.split('.').map(Number)
      const studentSubnet = [...baseNetworkParts]
      
      // Different strategies for student-based IP generation
      // Strategy 1: Use last 2 digits of student ID for 3rd octet offset
      studentSubnet[2] = (baseNetworkParts[2] + Math.floor(subnetOffset / 10)) % 256
      
      deviceConfigs.forEach(deviceConfig => {
        // Generate unique IP for this student and device
        const deviceIP = [...studentSubnet]
        
        // Use student index and device offset to create unique IPs
        const hostNumber = (subnetOffset % 10) * 10 + deviceConfig.hostOffset
        deviceIP[3] = Math.min(254, hostNumber) // Ensure valid host range
        
        const ipAddress = deviceIP.join('.')
        
        // Validate generated IP
        if (!validateIPAddress(ipAddress)) {
          errors.push(`Invalid IP generated for student ${student.studentId}, device ${deviceConfig.deviceId}: ${ipAddress}`)
          return
        }
        
        deviceAssignments.push({
          deviceId: deviceConfig.deviceId,
          ipAddress,
          variableName: deviceConfig.ipVariable
        })
        
        ipMappings[deviceConfig.ipVariable] = ipAddress
      })
      
      assignments.push({
        studentId: student.studentId,
        groupNumber: student.groupNumber,
        deviceAssignments,
        ipMappings
      })
    })
    
    return {
      success: errors.length === 0,
      assignments,
      networkInfo,
      errors,
      warnings
    }
  }
  
  const generateVLANs = (students: StudentCSVRow[], strategy: 'group_based' | 'student_id_based'): Record<string, number[]> => {
    const vlanAssignments: Record<string, number[]> = {}
    
    if (strategy === 'group_based') {
      const groups = new Set(students.map(s => s.groupNumber).filter(g => g !== undefined))
      students.forEach(student => {
        if (student.groupNumber !== undefined) {
          // Generate VLANs based on group number (e.g., 10, 20, 30...)
          const baseVLAN = student.groupNumber * 10
          vlanAssignments[student.studentId] = [
            baseVLAN,
            baseVLAN + 1,
            baseVLAN + 2
          ]
        }
      })
    } else {
      // Generate VLANs based on student ID
      students.forEach(student => {
        const studentIdNum = parseInt(student.studentId)
        const baseVLAN = (studentIdNum % 100) + 100 // VLANs 100-199
        vlanAssignments[student.studentId] = [
          baseVLAN,
          baseVLAN + 100, // Second VLAN
          baseVLAN + 200  // Third VLAN
        ]
      })
    }
    
    return vlanAssignments
  }
  
  const previewIPAssignments = (
    sampleStudents: StudentCSVRow[],
    networkConfig: NetworkConfig,
    deviceConfigs: DeviceConfig[],
    strategy: 'group_based' | 'student_id_based',
    maxPreview: number = 5
  ): IPGenerationResult => {
    const previewStudents = sampleStudents.slice(0, maxPreview)
    return generateIPAssignments(previewStudents, networkConfig, deviceConfigs, strategy)
  }
  
  const validateIPSchema = (
    ipSchema: IpSchema,
    deviceMappings: DeviceIpMapping[],
    students: StudentCSVRow[]
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []
    
    // Validate base network
    const networkInfo = calculateNetworkInfo(ipSchema.baseNetwork, ipSchema.subnetMask)
    if (!networkInfo) {
      errors.push('Invalid base network configuration')
    }
    
    // Validate device mappings
    if (deviceMappings.length === 0) {
      errors.push('At least one device mapping is required')
    }
    
    // Check for duplicate IP variables
    const ipVariables = new Set<string>()
    deviceMappings.forEach(mapping => {
      if (ipVariables.has(mapping.ipVariable)) {
        errors.push(`Duplicate IP variable: ${mapping.ipVariable}`)
      }
      ipVariables.add(mapping.ipVariable)
    })
    
    // Validate host offsets
    deviceMappings.forEach(mapping => {
      const hostOffset = ipSchema.variablesMapping.find(v => v.name === mapping.ipVariable)?.hostOffset
      if (hostOffset === undefined) {
        errors.push(`No host offset defined for IP variable: ${mapping.ipVariable}`)
      } else if (hostOffset < 1 || hostOffset > 254) {
        errors.push(`Invalid host offset for ${mapping.ipVariable}: must be between 1 and 254`)
      }
    })
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  const availableStrategies: IPGenerationStrategy[] = [
    {
      name: 'group_based',
      description: 'Generate IPs based on group numbers (e.g., 192.168.[group].x)',
      supportsGroups: true,
      supportsExams: false,
      generateIP: (baseNetwork, hostOffset, studentId, groupNumber) => {
        if (!groupNumber) throw new Error('Group number required')
        const parts = baseNetwork.split('.')
        parts[2] = String(parseInt(parts[2]) + groupNumber)
        parts[3] = String(hostOffset)
        return parts.join('.')
      }
    },
    {
      name: 'student_id_based',
      description: 'Generate IPs based on student ID (personalized for exams)',
      supportsGroups: false,
      supportsExams: true,
      generateIP: (baseNetwork, hostOffset, studentId) => {
        if (!studentId) throw new Error('Student ID required')
        const idNum = parseInt(studentId)
        const offset = idNum % 100
        const parts = baseNetwork.split('.')
        parts[2] = String(parseInt(parts[2]) + Math.floor(offset / 10))
        parts[3] = String((offset % 10) * 10 + hostOffset)
        return parts.join('.')
      }
    }
  ]
  
  return {
    generateIPAssignments,
    generateVLANs,
    previewIPAssignments,
    validateIPSchema,
    availableStrategies
  }
}