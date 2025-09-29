export interface StudentIpConfig {
  student_id: number | string;
  baseNetwork: string; // e.g., "192.168.1.0" (deprecated - use managementNetwork)
  subnetMask: number;   // e.g., 24 (deprecated - use managementSubnetMask)

  // Enhanced network configuration
  managementNetwork?: string; // e.g., "10.0.0.0"
  managementSubnetMask?: number; // e.g., 24
  vlans?: VlanNetworkConfig[]; // VLAN configurations
}

export interface VlanNetworkConfig {
  id?: string;
  vlanId?: number;
  calculationMultiplier?: number;
  baseNetwork: string;
  subnetMask: number;
  groupModifier?: number;
  isStudentGenerated: boolean;
}

export interface GeneratedIpVariable {
  name: string;           // Variable name (e.g., "loopback0", "gig0_1")
  type: 'host_offset' | 'full_ip' | 'student_generated' | 'student_management' | 'student_vlan';
  value: string | number; // IP address or host offset
  readonly: boolean;      // True for student_generated types
  deviceId: string;       // Device this variable belongs to

  // New fields for enhanced IP generation
  vlanIndex?: number;     // Which VLAN this belongs to (for student_vlan type)
  interfaceOffset?: number; // Offset within the network for multiple interfaces
}

export interface IpVariableReference {
  deviceId: string;
  variableName: string;
  displayName: string;    // "DeviceID.VariableName"
  ipAddress: string;
  type: 'student_generated' | 'custom';
}

class StudentIpGenerator {
  private config: StudentIpConfig;

  constructor(config: StudentIpConfig) {
    this.config = config;
  }

  updateConfig(newConfig: Partial<StudentIpConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  // Generate IP addresses using your original algorithm
  generateStudentIpData(deviceNumber: number = 0) {
    const student_id = Number(this.config.student_id);

    // Your original algorithm
    let dec2_1: number = (student_id / 1000000 - 61) * 10;
    let dec2_2: number = (student_id % 1000) / 250;
    let dec2: number = dec2_1 + dec2_2;
    dec2 = Math.floor(dec2);

    let dec3: number = (student_id % 1000) % 250;
    dec3 = Math.floor(dec3);

    let vlan1: number = (student_id / 1000000 - 61) * 400 + (student_id % 1000);
    let vlan2: number = (student_id / 1000000 - 61) * 500 + (student_id % 1000);
    vlan1 = Math.floor(vlan1);
    vlan2 = Math.floor(vlan2);

    // Base network parsing
    const [baseOct1, baseOct2, baseOct3] = this.config.baseNetwork.split('.').map(Number);

    return {
      student_id,
      calculatedValues: {
        dec2,
        dec3,
        vlan1,
        vlan2
      },
      generatedNetworks: {
        ipv4_subnet: `172.${dec2}.${dec3}.64/26`,
        ipv6_subnet: `2001:${dec2}:${dec3}::/48`
      },
      commonIpAddresses: {
        // Router interfaces
        router_vlan1_ip: `172.${dec2}.${dec3}.65`,
        router_vlan2_ip: `172.${dec2}.${dec3}.97`,
        router_external_ip: `10.30.6.${190 + deviceNumber}`,

        // IPv6 addresses
        router_vlan1_ipv6: `2001:${dec2}:${dec3}:${vlan1}::1`,
        router_vlan2_ipv6: `2001:${dec2}:${dec3}:${vlan2}::1`,
        router_external_ipv6: `2001:db8:dada:aaaa::${190 + deviceNumber}`,

        // Switch management
        switch_management_ip: `172.${dec2}.${dec3}.70`,

        // PC addresses
        pc1_ip: `172.${dec2}.${dec3}.66`,
        pc1_ipv6: `2001:${dec2}:${dec3}:${vlan1}::2`,

        // PC2 range
        pc2_ip_start: `172.${dec2}.${dec3}.101`,
        pc2_ipv6_prefix: `2001:${dec2}:${dec3}:${vlan2}::`
      }
    };
  }

  // Generate predefined IP variables for common network interfaces
  generatePredefinedIpVariables(deviceId: string, deviceType: 'router' | 'switch' | 'pc'): GeneratedIpVariable[] {
    const studentData = this.generateStudentIpData();
    const variables: GeneratedIpVariable[] = [];

    switch (deviceType) {
      case 'router':
        variables.push(
          {
            name: 'loopback0',
            type: 'student_generated',
            value: studentData.commonIpAddresses.router_external_ip,
            readonly: true,
            deviceId
          },
          {
            name: 'gig0_0_vlan1',
            type: 'student_generated',
            value: studentData.commonIpAddresses.router_vlan1_ip,
            readonly: true,
            deviceId
          },
          {
            name: 'gig0_0_vlan2',
            type: 'student_generated',
            value: studentData.commonIpAddresses.router_vlan2_ip,
            readonly: true,
            deviceId
          },
          {
            name: 'gig0_1',
            type: 'student_generated',
            value: studentData.commonIpAddresses.router_external_ip,
            readonly: true,
            deviceId
          },
          {
            name: 'loopback0_ipv6',
            type: 'student_generated',
            value: studentData.commonIpAddresses.router_external_ipv6,
            readonly: true,
            deviceId
          },
          {
            name: 'gig0_0_vlan1_ipv6',
            type: 'student_generated',
            value: studentData.commonIpAddresses.router_vlan1_ipv6,
            readonly: true,
            deviceId
          },
          {
            name: 'gig0_0_vlan2_ipv6',
            type: 'student_generated',
            value: studentData.commonIpAddresses.router_vlan2_ipv6,
            readonly: true,
            deviceId
          }
        );
        break;

      case 'switch':
        variables.push(
          {
            name: 'management_ip',
            type: 'student_generated',
            value: studentData.commonIpAddresses.switch_management_ip,
            readonly: true,
            deviceId
          }
        );
        break;

      case 'pc':
        const pcNumber = deviceId.includes('pc1') || deviceId.includes('PC1') ? 1 : 2;
        if (pcNumber === 1) {
          variables.push(
            {
              name: 'eth0',
              type: 'student_generated',
              value: studentData.commonIpAddresses.pc1_ip,
              readonly: true,
              deviceId
            },
            {
              name: 'eth0_ipv6',
              type: 'student_generated',
              value: studentData.commonIpAddresses.pc1_ipv6,
              readonly: true,
              deviceId
            }
          );
        } else {
          variables.push(
            {
              name: 'eth0',
              type: 'student_generated',
              value: studentData.commonIpAddresses.pc2_ip_start,
              readonly: true,
              deviceId
            },
            {
              name: 'eth0_ipv6',
              type: 'student_generated',
              value: `${studentData.commonIpAddresses.pc2_ipv6_prefix}2`,
              readonly: true,
              deviceId
            }
          );
        }
        break;
    }

    return variables;
  }

  // Create IP variable references for task parameter selection
  createIpVariableReferences(devices: Array<{deviceId: string, ipVariables: GeneratedIpVariable[]}>): IpVariableReference[] {
    const references: IpVariableReference[] = [];

    devices.forEach(device => {
      device.ipVariables.forEach(variable => {
        if (variable.type === 'student_generated' || variable.type === 'full_ip') {
          references.push({
            deviceId: device.deviceId,
            variableName: variable.name,
            displayName: `${device.deviceId}.${variable.name}`,
            ipAddress: variable.value as string,
            type: variable.type === 'student_generated' ? 'student_generated' : 'custom'
          });
        }
      });
    });

    return references;
  }

  // Validate IP address format
  validateIpAddress(ip: string, type: 'ipv4' | 'ipv6' = 'ipv4'): {
    isValid: boolean;
    error?: string;
  } {
    if (type === 'ipv4') {
      const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipv4Regex.test(ip)) {
        return {
          isValid: false,
          error: 'Invalid IPv4 address format'
        };
      }
    } else {
      // Basic IPv6 validation - in production, use a more robust regex
      const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^::1$|^(?:[0-9a-fA-F]{1,4}:)*::[0-9a-fA-F]{1,4}(?::[0-9a-fA-F]{1,4})*$/;
      if (!ipv6Regex.test(ip)) {
        return {
          isValid: false,
          error: 'Invalid IPv6 address format'
        };
      }
    }

    return { isValid: true };
  }

  // Generate debugging information
  generateDebugInfo() {
    const studentData = this.generateStudentIpData();
    return {
      config: this.config,
      studentData,
      timestamp: new Date().toISOString(),
      algorithmSteps: {
        step1_dec2_calculation: {
          dec2_1: `(${this.config.student_id} / 1000000 - 61) * 10 = ${(Number(this.config.student_id) / 1000000 - 61) * 10}`,
          dec2_2: `(${this.config.student_id} % 1000) / 250 = ${(Number(this.config.student_id) % 1000) / 250}`,
          dec2_final: `Math.floor(${(Number(this.config.student_id) / 1000000 - 61) * 10} + ${(Number(this.config.student_id) % 1000) / 250}) = ${studentData.calculatedValues.dec2}`
        },
        step2_dec3_calculation: {
          dec3: `Math.floor((${this.config.student_id} % 1000) % 250) = ${studentData.calculatedValues.dec3}`
        },
        step3_vlan_calculation: {
          vlan1: `Math.floor((${this.config.student_id} / 1000000 - 61) * 400 + (${this.config.student_id} % 1000)) = ${studentData.calculatedValues.vlan1}`,
          vlan2: `Math.floor((${this.config.student_id} / 1000000 - 61) * 500 + (${this.config.student_id} % 1000)) = ${studentData.calculatedValues.vlan2}`
        }
      }
    };
  }

  // Generate management IP using perfect conflict-free algorithm with blacklist support
  generateManagementIP(blacklistedIPs: string[] = [], assignedIPs?: Map<number, string>): string {
    const student_id = Number(this.config.student_id);

    // Use management network if available, otherwise fall back to baseNetwork
    const managementNetwork = this.config.managementNetwork || this.config.baseNetwork;
    const managementParts = managementNetwork.split('.').map(Number);

    // Create blacklist set for O(1) lookup
    const blacklistSet = new Set(blacklistedIPs);

    // Check if this student already has an assigned IP
    if (assignedIPs && assignedIPs.has(student_id)) {
      return assignedIPs.get(student_id)!;
    }

    // Create set of currently assigned IPs to avoid conflicts
    const assignedSet = assignedIPs ? new Set(Array.from(assignedIPs.values())) : new Set();

    // Simple deterministic hash for initial placement
    const uniquePart = student_id % 100000;
    let candidateAddress = 50 + (uniquePart % 150); // Range: 50-199

    // Find first available address using linear probing
    let attempts = 0;
    const maxAttempts = 205; // Available addresses from 50-254

    while (attempts < maxAttempts) {
      const candidateIP = `${managementParts[0]}.${managementParts[1]}.${managementParts[2]}.${candidateAddress}`;

      // Check if this address is available
      if (!blacklistSet.has(candidateIP) && !assignedSet.has(candidateIP)) {
        // Found available address!
        if (assignedIPs) {
          assignedIPs.set(student_id, candidateIP);
        }
        return candidateIP;
      }

      // Move to next address
      candidateAddress++;
      if (candidateAddress > 254) {
        candidateAddress = 50; // Wrap around
      }
      attempts++;
    }

    // Fallback (should never reach here with proper capacity)
    throw new Error(`No available IP addresses for student ${student_id}`);
  }

  // Generate VLAN-specific IP using VLAN base network and interface offset
  generateVlanIP(vlanIndex: number, interfaceOffset: number = 1): string {
    if (!this.config.vlans || !this.config.vlans[vlanIndex]) {
      throw new Error(`VLAN ${vlanIndex} not found in configuration`);
    }

    const student_id = Number(this.config.student_id);
    const vlan = this.config.vlans[vlanIndex];

    // Calculate student-specific octets using original algorithm
    let dec2_1: number = (student_id / 1000000 - 61) * 10;
    let dec2_2: number = (student_id % 1000) / 250;
    let dec2: number = Math.floor(dec2_1 + dec2_2);
    let dec3: number = Math.floor((student_id % 1000) % 250);

    // For calculated VLANs, incorporate the calculated VLAN ID into the IP generation
    if (vlan.calculationMultiplier !== undefined) {
      // Calculate the actual VLAN ID for this student
      const calculatedVlanId = Math.floor((student_id / 1000000 - 61) * vlan.calculationMultiplier + (student_id % 1000));

      // Use the calculated VLAN ID to modify the third octet for uniqueness
      // This ensures different multipliers produce different IP ranges
      dec3 = Math.floor((dec3 + calculatedVlanId) % 250);
    }

    // Use VLAN base network
    const [vlanOct1] = vlan.baseNetwork.split('.').map(Number);

    // Base VLAN IP starts at .64, then add interface offset
    // This ensures multiple interfaces on same VLAN get different IPs
    const hostAddress = 64 + interfaceOffset;

    return `${vlanOct1}.${dec2}.${dec3}.${hostAddress}`;
  }

  // Generate enhanced IP variables with VLAN and management support
  generateEnhancedIpVariables(deviceId: string, variables: Array<{
    name: string;
    type: 'host_offset' | 'full_ip' | 'student_generated' | 'student_management' | 'student_vlan';
    vlanIndex?: number;
    interfaceOffset?: number;
    hostOffset?: number;
    fullIP?: string;
  }>): GeneratedIpVariable[] {
    const results: GeneratedIpVariable[] = [];

    variables.forEach(varConfig => {
      let value: string | number;
      let readonly = false;

      switch (varConfig.type) {
        case 'host_offset':
          // Use management network + host offset - stay within management subnet
          const managementNetwork = this.config.managementNetwork || this.config.baseNetwork;
          const mgmtParts = managementNetwork.split('.').map(Number);
          // For host offset, simply use the network + offset (no student-specific calculation)
          value = `${mgmtParts[0]}.${mgmtParts[1]}.${mgmtParts[2]}.${varConfig.hostOffset || 1}`;
          break;

        case 'full_ip':
          value = varConfig.fullIP || '';
          break;

        case 'student_management':
          value = this.generateManagementIP(varConfig.interfaceOffset || 1);
          readonly = true;
          break;

        case 'student_vlan':
          if (varConfig.vlanIndex !== undefined) {
            value = this.generateVlanIP(varConfig.vlanIndex, varConfig.interfaceOffset || 1);
          } else {
            throw new Error('VLAN index required for student_vlan type');
          }
          readonly = true;
          break;

        case 'student_generated':
          // Legacy support
          value = this.generateStudentIpData().commonIpAddresses.router_vlan1_ip;
          readonly = true;
          break;

        default:
          value = '';
      }

      results.push({
        name: varConfig.name,
        type: varConfig.type,
        value,
        readonly,
        deviceId,
        vlanIndex: varConfig.vlanIndex,
        interfaceOffset: varConfig.interfaceOffset
      });
    });

    return results;
  }

  // Backward compatibility method for existing code
  generateLegacyStudentIpData(deviceNumber: number = 0) {
    // For backward compatibility, assume 2 VLANs with 400x and 500x multipliers
    const student_id = Number(this.config.student_id);

    let dec2_1: number = (student_id / 1000000 - 61) * 10;
    let dec2_2: number = (student_id % 1000) / 250;
    let dec2: number = dec2_1 + dec2_2;
    dec2 = Math.floor(dec2);

    let dec3: number = (student_id % 1000) % 250;
    dec3 = Math.floor(dec3);

    let vlan1: number = (student_id / 1000000 - 61) * 400 + (student_id % 1000);
    let vlan2: number = (student_id / 1000000 - 61) * 500 + (student_id % 1000);
    vlan1 = Math.floor(vlan1);
    vlan2 = Math.floor(vlan2);

    return {
      student_id,
      calculatedValues: {
        dec2,
        dec3,
        vlan1,
        vlan2
      },
      generatedNetworks: {
        ipv4_subnet: `172.${dec2}.${dec3}.64/26`,
        ipv6_subnet: `2001:${dec2}:${dec3}::/48`
      },
      commonIpAddresses: {
        router_vlan1_ip: `172.${dec2}.${dec3}.65`,
        router_vlan2_ip: `172.${dec2}.${dec3}.97`,
        router_external_ip: `10.30.6.${190 + deviceNumber}`,
        router_vlan1_ipv6: `2001:${dec2}:${dec3}:${vlan1}::1`,
        router_vlan2_ipv6: `2001:${dec2}:${dec3}:${vlan2}::1`,
        router_external_ipv6: `2001:db8:dada:aaaa::${190 + deviceNumber}`,
        switch_management_ip: `172.${dec2}.${dec3}.70`,
        pc1_ip: `172.${dec2}.${dec3}.66`,
        pc1_ipv6: `2001:${dec2}:${dec3}:${vlan1}::2`,
        pc2_ip_start: `172.${dec2}.${dec3}.101`,
        pc2_ipv6_prefix: `2001:${dec2}:${dec3}:${vlan2}::`
      }
    };
  }
}

export default StudentIpGenerator;