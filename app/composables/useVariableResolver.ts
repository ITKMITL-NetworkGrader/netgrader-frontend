import type { ExamConfiguration } from '~/types/lab'

export const useVariableResolver = () => {
  const { memoize } = usePerformanceOptimization()
  
  // Memoized variable resolution cache
  const variableCache = new Map<string, string>()
  // Memoized variable resolution for better performance
  const resolveVariables = memoize((
    template: string,
    variables: Record<string, any>,
    studentId?: string,
    groupNumber?: number
  ): string => {
    let resolved = template

    // Replace group_number variable for lab mode
    if (groupNumber !== undefined) {
      resolved = resolved.replace(/\{group_number\}/g, groupNumber.toString())
    }

    // Replace student_id variable for exam mode
    if (studentId !== undefined) {
      resolved = resolved.replace(/\{student_id\}/g, studentId)
    }

    // Replace other custom variables with proper type handling
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g')
      
      // Handle different value types appropriately
      let resolvedValue: string
      if (typeof value === 'object' && value !== null) {
        resolvedValue = JSON.stringify(value)
      } else if (value === null || value === undefined) {
        resolvedValue = ''
      } else {
        resolvedValue = value.toString()
      }
      
      resolved = resolved.replace(regex, resolvedValue)
    })

    return resolved
  }, (template, variables, studentId, groupNumber) => 
    `${template}-${JSON.stringify(variables)}-${studentId || ''}-${groupNumber || ''}`
  )

  // Memoized exam configuration generation
  const generateExamConfig = memoize((studentId: string, examNumber: number): ExamConfiguration => {
    const student_id = Number(studentId)

    // Algorithm from requirements for subnet generation
    const dec2_1 = (student_id / 1000000 - 61) * 10
    const dec2_2 = (student_id % 1000) / 250
    const dec2 = Math.floor(dec2_1 + dec2_2)
    const dec3 = Math.floor((student_id % 1000) % 250)

    const vlan1 = Math.floor((student_id / 1000000 - 61) * 400 + (student_id % 1000))
    const vlan2 = Math.floor((student_id / 1000000 - 61) * 500 + (student_id % 1000))

    const ipv4Subnet = `172.${dec2}.${dec3}.64/26`
    const ipv6Subnet = `2001:${dec2}:${dec3}::/48`
    const outInterfaceIpv4 = `10.30.6.${190 + examNumber}`
    const outInterfaceIpv6 = `2001:db8:dada:aaaa::${190 + examNumber}`

    return {
      studentId,
      vlan1,
      vlan2,
      ipv4Subnet,
      ipv6Subnet,
      outInterfaceIpv4,
      outInterfaceIpv6,
      generatedAnswers: generateDetailedAnswers(student_id, examNumber, dec2, dec3, vlan1, vlan2)
    }
  }, (studentId, examNumber) => `${studentId}-${examNumber}`)

  const generateDetailedAnswers = (
    studentId: number,
    examNumber: number,
    dec2: number,
    dec3: number,
    vlan1: number,
    vlan2: number
  ) => {
    // Generate comprehensive answer set for exam validation
    return {
      networking: {
        ipv4: {
          subnet: `172.${dec2}.${dec3}.64/26`,
          networkAddress: `172.${dec2}.${dec3}.64`,
          broadcastAddress: `172.${dec2}.${dec3}.127`,
          firstUsable: `172.${dec2}.${dec3}.65`,
          lastUsable: `172.${dec2}.${dec3}.126`,
          subnetMask: '255.255.255.192'
        },
        ipv6: {
          subnet: `2001:${dec2}:${dec3}::/48`,
          networkAddress: `2001:${dec2}:${dec3}::`,
          prefixLength: 48
        },
        vlans: {
          vlan1,
          vlan2
        },
        interfaces: {
          outInterfaceIpv4: `10.30.6.${190 + examNumber}`,
          outInterfaceIpv6: `2001:db8:dada:aaaa::${190 + examNumber}`
        }
      },
      routing: {
        staticRoutes: [
          `ip route 172.${dec2}.${dec3}.64 255.255.255.192 10.30.6.${190 + examNumber}`,
          `ipv6 route 2001:${dec2}:${dec3}::/48 2001:db8:dada:aaaa::${190 + examNumber}`
        ]
      },
      security: {
        accessLists: [
          `access-list 100 permit ip 172.${dec2}.${dec3}.64 0.0.0.63 any`,
          `access-list 100 deny ip any any`
        ]
      }
    }
  }

  const previewVariableResolution = (
    template: string,
    variables: Record<string, any>,
    context: {
      mode: 'lab' | 'exam'
      studentId?: string
      groupNumber?: number
      examNumber?: number
    }
  ): string => {
    if (context.mode === 'lab' && context.groupNumber !== undefined) {
      return resolveVariables(template, variables, undefined, context.groupNumber)
    } else if (context.mode === 'exam' && context.studentId && context.examNumber !== undefined) {
      const examConfig = generateExamConfig(context.studentId, context.examNumber)
      const examVariables = {
        ...variables,
        vlan1: examConfig.vlan1,
        vlan2: examConfig.vlan2,
        ipv4_subnet: examConfig.ipv4Subnet,
        ipv6_subnet: examConfig.ipv6Subnet,
        out_interface_ipv4: examConfig.outInterfaceIpv4,
        out_interface_ipv6: examConfig.outInterfaceIpv6
      }
      return resolveVariables(template, examVariables, context.studentId)
    }
    return template
  }

  const extractVariablesFromTemplate = (template: string): string[] => {
    const variableRegex = /\{([^}]+)\}/g
    const variables: string[] = []
    let match

    while ((match = variableRegex.exec(template)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1])
      }
    }

    return variables
  }

  const validateVariableTemplate = (template: string, availableVariables: string[]): { isValid: boolean; errors: string[] } => {
    const usedVariables = extractVariablesFromTemplate(template)
    const errors: string[] = []

    usedVariables.forEach(variable => {
      if (!availableVariables.includes(variable)) {
        errors.push(`Unknown variable: {${variable}}`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  const getAvailableVariables = (mode: 'lab' | 'exam'): string[] => {
    const baseVariables = ['student_id']

    if (mode === 'lab') {
      return [...baseVariables, 'group_number']
    } else if (mode === 'exam') {
      return [
        ...baseVariables,
        'vlan1',
        'vlan2',
        'ipv4_subnet',
        'ipv6_subnet',
        'out_interface_ipv4',
        'out_interface_ipv6',
        'dec2',
        'dec3',
        'network_address',
        'broadcast_address',
        'first_usable',
        'last_usable',
        'subnet_mask',
        'prefix_length'
      ]
    }

    return baseVariables
  }

  const resolveExamVariables = (
    template: string,
    studentConfig: ExamConfiguration,
    additionalVariables: Record<string, any> = {}
  ): { resolvedContent: string; resolvedVariables: Record<string, any> } => {
    // Extract networking details from student configuration using student ID algorithm
    const student_id = Number(studentConfig.studentId)
    const dec2_1 = (student_id / 1000000 - 61) * 10
    const dec2_2 = (student_id % 1000) / 250
    const dec2 = Math.floor(dec2_1 + dec2_2)
    const dec3 = Math.floor((student_id % 1000) % 250)

    // Enhanced subnet calculations for more comprehensive personalization
    const subnetParts = studentConfig.ipv4Subnet.split('/')
    const [networkBase] = subnetParts
    const [octet1, octet2, octet3, octet4] = networkBase.split('.').map(Number)
    
    // Calculate additional networking values
    const subnetSize = 64 // /26 subnet = 64 addresses
    const usableHosts = subnetSize - 2 // Subtract network and broadcast
    const gatewayOffset = 1 // First usable IP as gateway
    const lastHostOffset = usableHosts // Last usable IP
    
    // Enhanced IPv6 calculations
    const ipv6Parts = studentConfig.ipv6Subnet.split('::/')
    const ipv6Base = ipv6Parts[0]
    const prefixLength = parseInt(ipv6Parts[1]) || 48

    // Create comprehensive variable set for exam mode with personalized values
    const examVariables = {
      // Basic student info
      student_id: studentConfig.studentId,
      
      // VLAN configuration (personalized per student)
      vlan1: studentConfig.vlan1,
      vlan2: studentConfig.vlan2,
      
      // IPv4/IPv6 configuration (unique per student)
      ipv4_subnet: studentConfig.ipv4Subnet,
      ipv6_subnet: studentConfig.ipv6Subnet,
      
      // Interface configuration (personalized)
      out_interface_ipv4: studentConfig.outInterfaceIpv4,
      out_interface_ipv6: studentConfig.outInterfaceIpv6,
      
      // Calculated values from student ID algorithm
      dec2,
      dec3,
      
      // Detailed networking from generated answers (student-specific)
      network_address: studentConfig.generatedAnswers?.networking?.ipv4?.networkAddress || `${octet1}.${octet2}.${octet3}.${octet4}`,
      broadcast_address: studentConfig.generatedAnswers?.networking?.ipv4?.broadcastAddress || `${octet1}.${octet2}.${octet3}.${octet4 + subnetSize - 1}`,
      first_usable: studentConfig.generatedAnswers?.networking?.ipv4?.firstUsable || `${octet1}.${octet2}.${octet3}.${octet4 + gatewayOffset}`,
      last_usable: studentConfig.generatedAnswers?.networking?.ipv4?.lastUsable || `${octet1}.${octet2}.${octet3}.${octet4 + lastHostOffset}`,
      subnet_mask: studentConfig.generatedAnswers?.networking?.ipv4?.subnetMask || '255.255.255.192',
      prefix_length: studentConfig.generatedAnswers?.networking?.ipv6?.prefixLength || prefixLength,
      
      // Static routes (personalized per student)
      static_routes: studentConfig.generatedAnswers?.routing?.staticRoutes || [],
      
      // Access control lists (personalized per student)
      access_lists: studentConfig.generatedAnswers?.security?.accessLists || [],
      
      // Additional computed networking values for enhanced personalization
      gateway_ipv4: `${octet1}.${octet2}.${octet3}.${octet4 + gatewayOffset}`, // First usable IP as gateway
      last_host_ipv4: `${octet1}.${octet2}.${octet3}.${octet4 + lastHostOffset}`, // Last usable IP
      network_id: `${octet1}.${octet2}.${octet3}.${octet4}`, // Network ID
      wildcard_mask: '0.0.0.63', // Wildcard mask for /26
      
      // VLAN names and descriptions (personalized)
      vlan1_name: `VLAN_${studentConfig.vlan1}`,
      vlan2_name: `VLAN_${studentConfig.vlan2}`,
      vlan1_description: `Student ${studentConfig.studentId} VLAN 1`,
      vlan2_description: `Student ${studentConfig.studentId} VLAN 2`,
      
      // Interface names (personalized)
      interface_vlan1: `Vlan${studentConfig.vlan1}`,
      interface_vlan2: `Vlan${studentConfig.vlan2}`,
      interface_g0_0: `GigabitEthernet0/0`,
      interface_g0_1: `GigabitEthernet0/1`,
      
      // Router configuration snippets (personalized)
      router_id: `${dec2}.${dec3}.1.1`,
      ospf_area: Math.floor(dec2 / 10),
      ospf_process_id: 1,
      
      // Enhanced IPv6 variables
      ipv6_network: `${ipv6Base}::`,
      ipv6_gateway: `${ipv6Base}::1`,
      ipv6_first_host: `${ipv6Base}::2`,
      
      // Subnet calculation helpers
      subnet_size: subnetSize,
      usable_hosts: usableHosts,
      host_bits: 6, // /26 = 6 host bits
      network_bits: 26,
      
      // Student-specific identifiers for unique configurations
      student_hash: generateStudentHash(studentConfig.studentId),
      config_version: '1.0',
      generation_timestamp: new Date().toISOString(),
      
      // Personalized naming conventions
      hostname: `R${student_id % 1000}`,
      domain_name: `student${student_id}.netgrader.local`,
      
      // Additional custom variables from play configuration
      ...additionalVariables,
      
      // Student-specific variables from config
      ...(studentConfig.variables || {})
    }

    // Resolve template with personalized variables
    const resolvedContent = resolveVariables(template, examVariables, studentConfig.studentId)

    return {
      resolvedContent,
      resolvedVariables: examVariables
    }
  }

  // Helper function to generate a unique hash for student identification
  const generateStudentHash = (studentId: string): string => {
    let hash = 0
    for (let i = 0; i < studentId.length; i++) {
      const char = studentId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).substring(0, 8)
  }

  const generatePersonalizedContent = (
    parts: LabPart[],
    studentConfig: ExamConfiguration
  ): LabPart[] => {
    return parts.map(part => {
      const { resolvedContent, resolvedVariables } = resolveExamVariables(
        part.content,
        studentConfig,
        part.playVariables || {}
      )

      return {
        ...part,
        content: resolvedContent,
        resolvedVariables,
        // Add personalized title if it contains variables
        title: resolveVariables(part.title, resolvedVariables, studentConfig.studentId)
      }
    })
  }

  const validateStudentAnswers = (
    answers: Record<string, any>,
    studentConfig: ExamConfiguration
  ): { isValid: boolean; errors: string[]; score: number } => {
    const errors: string[] = []
    let correctAnswers = 0
    let totalAnswers = 0

    const expectedAnswers = studentConfig.generatedAnswers

    // Validate networking answers against personalized configuration
    if (expectedAnswers?.networking) {
      const { ipv4, ipv6, vlans, interfaces } = expectedAnswers.networking

      // IPv4 validation with personalized values
      if (answers.ipv4_subnet) {
        totalAnswers++
        if (answers.ipv4_subnet === ipv4.subnet) {
          correctAnswers++
        } else {
          errors.push(`IPv4 subnet should be ${ipv4.subnet}, got ${answers.ipv4_subnet}`)
        }
      }

      if (answers.network_address) {
        totalAnswers++
        if (answers.network_address === ipv4.networkAddress) {
          correctAnswers++
        } else {
          errors.push(`Network address should be ${ipv4.networkAddress}, got ${answers.network_address}`)
        }
      }

      if (answers.broadcast_address) {
        totalAnswers++
        if (answers.broadcast_address === ipv4.broadcastAddress) {
          correctAnswers++
        } else {
          errors.push(`Broadcast address should be ${ipv4.broadcastAddress}, got ${answers.broadcast_address}`)
        }
      }

      if (answers.first_usable) {
        totalAnswers++
        if (answers.first_usable === ipv4.firstUsable) {
          correctAnswers++
        } else {
          errors.push(`First usable IP should be ${ipv4.firstUsable}, got ${answers.first_usable}`)
        }
      }

      if (answers.last_usable) {
        totalAnswers++
        if (answers.last_usable === ipv4.lastUsable) {
          correctAnswers++
        } else {
          errors.push(`Last usable IP should be ${ipv4.lastUsable}, got ${answers.last_usable}`)
        }
      }

      if (answers.subnet_mask) {
        totalAnswers++
        if (answers.subnet_mask === ipv4.subnetMask) {
          correctAnswers++
        } else {
          errors.push(`Subnet mask should be ${ipv4.subnetMask}, got ${answers.subnet_mask}`)
        }
      }

      // VLAN validation with personalized values
      if (answers.vlan1) {
        totalAnswers++
        if (Number(answers.vlan1) === vlans.vlan1) {
          correctAnswers++
        } else {
          errors.push(`VLAN 1 should be ${vlans.vlan1}, got ${answers.vlan1}`)
        }
      }

      if (answers.vlan2) {
        totalAnswers++
        if (Number(answers.vlan2) === vlans.vlan2) {
          correctAnswers++
        } else {
          errors.push(`VLAN 2 should be ${vlans.vlan2}, got ${answers.vlan2}`)
        }
      }

      // Interface validation with personalized values
      if (answers.out_interface_ipv4) {
        totalAnswers++
        if (answers.out_interface_ipv4 === interfaces.outInterfaceIpv4) {
          correctAnswers++
        } else {
          errors.push(`Output interface IPv4 should be ${interfaces.outInterfaceIpv4}, got ${answers.out_interface_ipv4}`)
        }
      }

      if (answers.out_interface_ipv6) {
        totalAnswers++
        if (answers.out_interface_ipv6 === interfaces.outInterfaceIpv6) {
          correctAnswers++
        } else {
          errors.push(`Output interface IPv6 should be ${interfaces.outInterfaceIpv6}, got ${answers.out_interface_ipv6}`)
        }
      }

      // IPv6 validation with personalized values
      if (answers.ipv6_subnet) {
        totalAnswers++
        if (answers.ipv6_subnet === ipv6.subnet) {
          correctAnswers++
        } else {
          errors.push(`IPv6 subnet should be ${ipv6.subnet}, got ${answers.ipv6_subnet}`)
        }
      }
    }

    // Validate routing configuration with personalized values
    if (expectedAnswers?.routing?.staticRoutes && answers.static_routes) {
      const expectedRoutes = expectedAnswers.routing.staticRoutes
      const providedRoutes = Array.isArray(answers.static_routes) ? answers.static_routes : [answers.static_routes]
      
      expectedRoutes.forEach((expectedRoute: string, index: number) => {
        totalAnswers++
        if (providedRoutes[index] === expectedRoute) {
          correctAnswers++
        } else {
          errors.push(`Static route ${index + 1} should be "${expectedRoute}", got "${providedRoutes[index] || 'missing'}"`)
        }
      })
    }

    // Validate security configuration with personalized values
    if (expectedAnswers?.security?.accessLists && answers.access_lists) {
      const expectedACLs = expectedAnswers.security.accessLists
      const providedACLs = Array.isArray(answers.access_lists) ? answers.access_lists : [answers.access_lists]
      
      expectedACLs.forEach((expectedACL: string, index: number) => {
        totalAnswers++
        if (providedACLs[index] === expectedACL) {
          correctAnswers++
        } else {
          errors.push(`Access list ${index + 1} should be "${expectedACL}", got "${providedACLs[index] || 'missing'}"`)
        }
      })
    }

    const score = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0

    return {
      isValid: errors.length === 0,
      errors,
      score: Math.round(score)
    }
  }

  const createExamGradingContext = (
    studentConfig: ExamConfiguration,
    partId: string,
    playVariables: Record<string, any> = {}
  ): Record<string, any> => {
    // Create grading context with personalized variables for exam mode
    const { resolvedVariables } = resolveExamVariables('', studentConfig, playVariables)
    
    return {
      mode: 'exam',
      studentId: studentConfig.studentId,
      partId,
      personalizedConfig: studentConfig,
      resolvedVariables,
      expectedAnswers: studentConfig.generatedAnswers,
      gradingCriteria: {
        // Personalized grading criteria based on student configuration
        networking: {
          ipv4_subnet: studentConfig.ipv4Subnet,
          ipv6_subnet: studentConfig.ipv6Subnet,
          network_address: studentConfig.generatedAnswers?.networking?.ipv4?.networkAddress,
          broadcast_address: studentConfig.generatedAnswers?.networking?.ipv4?.broadcastAddress,
          first_usable: studentConfig.generatedAnswers?.networking?.ipv4?.firstUsable,
          last_usable: studentConfig.generatedAnswers?.networking?.ipv4?.lastUsable,
          subnet_mask: studentConfig.generatedAnswers?.networking?.ipv4?.subnetMask
        },
        vlans: {
          vlan1: studentConfig.vlan1,
          vlan2: studentConfig.vlan2
        },
        interfaces: {
          out_interface_ipv4: studentConfig.outInterfaceIpv4,
          out_interface_ipv6: studentConfig.outInterfaceIpv6
        },
        routing: studentConfig.generatedAnswers?.routing,
        security: studentConfig.generatedAnswers?.security
      }
    }
  }

  const generateExamAnswerKey = (studentConfig: ExamConfiguration): Record<string, any> => {
    // Generate complete answer key for student's personalized configuration
    return {
      // Basic configuration
      student_id: studentConfig.studentId,
      vlan1: studentConfig.vlan1,
      vlan2: studentConfig.vlan2,
      ipv4_subnet: studentConfig.ipv4Subnet,
      ipv6_subnet: studentConfig.ipv6Subnet,
      out_interface_ipv4: studentConfig.outInterfaceIpv4,
      out_interface_ipv6: studentConfig.outInterfaceIpv6,
      
      // Detailed networking answers
      ...studentConfig.generatedAnswers?.networking?.ipv4,
      ...studentConfig.generatedAnswers?.networking?.ipv6,
      
      // Routing answers
      static_routes: studentConfig.generatedAnswers?.routing?.staticRoutes,
      
      // Security answers
      access_lists: studentConfig.generatedAnswers?.security?.accessLists,
      
      // Additional computed values
      variables: studentConfig.variables || {}
    }
  }

  const validatePersonalizedVariableResolution = (
    template: string,
    studentConfig: ExamConfiguration,
    expectedVariables: string[]
  ): { isValid: boolean; errors: string[]; resolvedVariables: Record<string, any> } => {
    const errors: string[] = []
    
    try {
      // Resolve variables for the student
      const { resolvedContent, resolvedVariables } = resolveExamVariables(template, studentConfig)
      
      // Check if all expected variables were resolved
      expectedVariables.forEach(variable => {
        if (!resolvedVariables[variable] || resolvedVariables[variable] === '') {
          errors.push(`Variable {${variable}} was not resolved or is empty`)
        }
      })
      
      // Check if template still contains unresolved variables
      const unresolvedVariables = extractVariablesFromTemplate(resolvedContent)
      if (unresolvedVariables.length > 0) {
        errors.push(`Template contains unresolved variables: ${unresolvedVariables.map(v => `{${v}}`).join(', ')}`)
      }
      
      // Validate that personalized values are unique and correct
      const student_id = Number(studentConfig.studentId)
      const expectedDec2 = Math.floor((student_id / 1000000 - 61) * 10 + (student_id % 1000) / 250)
      const expectedDec3 = Math.floor((student_id % 1000) % 250)
      
      if (resolvedVariables.dec2 !== expectedDec2) {
        errors.push(`Incorrect dec2 calculation: expected ${expectedDec2}, got ${resolvedVariables.dec2}`)
      }
      
      if (resolvedVariables.dec3 !== expectedDec3) {
        errors.push(`Incorrect dec3 calculation: expected ${expectedDec3}, got ${resolvedVariables.dec3}`)
      }
      
      // Validate IPv4 subnet format
      const expectedSubnet = `172.${expectedDec2}.${expectedDec3}.64/26`
      if (resolvedVariables.ipv4_subnet !== expectedSubnet) {
        errors.push(`Incorrect IPv4 subnet: expected ${expectedSubnet}, got ${resolvedVariables.ipv4_subnet}`)
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        resolvedVariables
      }
    } catch (error) {
      errors.push(`Variable resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return {
        isValid: false,
        errors,
        resolvedVariables: {}
      }
    }
  }

  const generatePersonalizedVariablePreview = (
    studentConfig: ExamConfiguration
  ): Record<string, any> => {
    // Generate a preview of all personalized variables for debugging/validation
    const { resolvedVariables } = resolveExamVariables('', studentConfig)
    
    return {
      studentInfo: {
        studentId: studentConfig.studentId,
        generatedAt: new Date().toISOString()
      },
      networking: {
        vlans: {
          vlan1: resolvedVariables.vlan1,
          vlan2: resolvedVariables.vlan2,
          vlan1_name: resolvedVariables.vlan1_name,
          vlan2_name: resolvedVariables.vlan2_name
        },
        ipv4: {
          subnet: resolvedVariables.ipv4_subnet,
          network_address: resolvedVariables.network_address,
          broadcast_address: resolvedVariables.broadcast_address,
          gateway: resolvedVariables.gateway_ipv4,
          first_usable: resolvedVariables.first_usable,
          last_usable: resolvedVariables.last_usable,
          subnet_mask: resolvedVariables.subnet_mask,
          wildcard_mask: resolvedVariables.wildcard_mask
        },
        ipv6: {
          subnet: resolvedVariables.ipv6_subnet,
          prefix_length: resolvedVariables.prefix_length
        },
        interfaces: {
          out_interface_ipv4: resolvedVariables.out_interface_ipv4,
          out_interface_ipv6: resolvedVariables.out_interface_ipv6,
          interface_vlan1: resolvedVariables.interface_vlan1,
          interface_vlan2: resolvedVariables.interface_vlan2
        },
        routing: {
          router_id: resolvedVariables.router_id,
          ospf_area: resolvedVariables.ospf_area,
          static_routes: resolvedVariables.static_routes
        }
      },
      calculatedValues: {
        dec2: resolvedVariables.dec2,
        dec3: resolvedVariables.dec3,
        network_id: resolvedVariables.network_id
      },
      security: {
        access_lists: resolvedVariables.access_lists
      }
    }
  }

  return {
    resolveVariables,
    generateExamConfig,
    generateDetailedAnswers,
    previewVariableResolution,
    extractVariablesFromTemplate,
    validateVariableTemplate,
    getAvailableVariables,
    resolveExamVariables,
    generatePersonalizedContent,
    validateStudentAnswers,
    createExamGradingContext,
    generateExamAnswerKey,
    validatePersonalizedVariableResolution,
    generatePersonalizedVariablePreview
  }
}