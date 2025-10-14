export interface StudentIdConfig {
  baseYear: number; // e.g., 61 for Buddhist year 2561
  facultyCode: string; // e.g., "07" for IT faculty
  indexDigits: number; // e.g., 4 for 4-digit student index
}

export interface VlanConfig {
  count: number; // Number of VLANs to generate
  baseMultipliers: number[]; // Multipliers for VLAN calculation (e.g., [400, 500])
  ranges?: {
    min: number;
    max: number;
  }[];
}

export interface IpConfig {
  ipv4: {
    management: {
      baseNetwork: string; // e.g., "172.16.0.0"
      subnetMask: number; // e.g., 16
      subnetSize: number; // e.g., 26 for /26 subnets
    };
    external: {
      baseNetwork: string; // e.g., "10.30.6.0"
      subnetMask: number; // e.g., 24
      startOffset: number; // e.g., 190
    };
  };
  ipv6: {
    management: {
      basePrefix: string; // e.g., "2001:db8:cafe"
      prefixLength: number; // e.g., 48
    };
    external: {
      basePrefix: string; // e.g., "2001:db8:dada:aaaa"
      prefixLength: number; // e.g., 64
      startOffset: number; // e.g., 190
    };
  };
}

export interface DeviceConfig {
  router: {
    vlans: Array<{
      ipOffset: number; // IP offset within subnet
      subnetMask: string; // Subnet mask for this VLAN
      interface: string; // Interface name
    }>;
    external: {
      interface: string;
      gateway: string;
    };
  };
  switch: {
    ipOffset: number;
    managementVlan: number; // Which VLAN index for management
  };
  pcs: Array<{
    vlanIndex: number; // Which VLAN this PC belongs to
    ipOffset?: number; // Fixed IP offset, or undefined for dynamic
    multipleIps?: {
      count: number;
      startOffset: number;
    };
  }>;
}

export interface NetworkGenerationConfig {
  studentId: StudentIdConfig;
  vlans: VlanConfig;
  ip: IpConfig;
  devices: DeviceConfig;
  conflictChecking: {
    enabled: boolean;
    reservedRanges: Array<{
      start: string;
      end: string;
      type: 'ipv4' | 'ipv6' | 'vlan';
    }>;
  };
}

// Default configuration matching your current algorithm
export const DEFAULT_CONFIG: NetworkGenerationConfig = {
  studentId: {
    baseYear: 61,
    facultyCode: "07",
    indexDigits: 4
  },
  vlans: {
    count: 2,
    baseMultipliers: [400, 500]
  },
  ip: {
    ipv4: {
      management: {
        baseNetwork: "172.16.0.0",
        subnetMask: 16,
        subnetSize: 26
      },
      external: {
        baseNetwork: "10.30.6.0",
        subnetMask: 24,
        startOffset: 190
      }
    },
    ipv6: {
      management: {
        basePrefix: "2001:db8:cafe",
        prefixLength: 48
      },
      external: {
        basePrefix: "2001:db8:dada:aaaa",
        prefixLength: 64,
        startOffset: 190
      }
    }
  },
  devices: {
    router: {
      vlans: [
        {
          ipOffset: 1, // .65 becomes .1 in new subnet
          subnetMask: "255.255.255.248", // /29
          interface: "e0/0"
        },
        {
          ipOffset: 1, // .97 becomes .1 in new subnet
          subnetMask: "255.255.255.224", // /27
          interface: "e0/0"
        }
      ],
      external: {
        interface: "e0/1",
        gateway: "10.30.6.1"
      }
    },
    switch: {
      ipOffset: 6, // .70 becomes .6 in subnet
      managementVlan: 0 // Use first VLAN for management
    },
    pcs: [
      {
        vlanIndex: 0,
        ipOffset: 2 // .66 becomes .2 in subnet
      },
      {
        vlanIndex: 1,
        multipleIps: {
          count: 5,
          startOffset: 5 // Start from .101 equivalent
        }
      }
    ]
  },
  conflictChecking: {
    enabled: true,
    reservedRanges: []
  }
};

class NetworkConfigGenerator {
  private config: NetworkGenerationConfig;
  private allocatedIps: Set<string> = new Set();
  private allocatedVlans: Set<number> = new Set();

  constructor(config: NetworkGenerationConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  updateConfig(newConfig: Partial<NetworkGenerationConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  parseStudentId(studentId: number | string): {
    year: number;
    faculty: string;
    index: number;
    isValid: boolean;
  } {
    const id = String(studentId).padStart(8, '0');

    const yearPart = id.substring(0, 2);
    const facultyPart = id.substring(2, 4);
    const indexPart = id.substring(4);

    return {
      year: parseInt(yearPart),
      faculty: facultyPart,
      index: parseInt(indexPart),
      isValid: parseInt(yearPart) >= this.config.studentId.baseYear &&
               facultyPart === this.config.studentId.facultyCode
    };
  }

  generateVlans(studentInfo: ReturnType<typeof this.parseStudentId>): number[] {
    const vlans: number[] = [];

    for (let i = 0; i < this.config.vlans.count; i++) {
      const multiplier = this.config.vlans.baseMultipliers[i] || (400 + i * 100);
      const vlan = (studentInfo.year - this.config.studentId.baseYear) * multiplier + studentInfo.index;

      // Check for conflicts if enabled
      if (this.config.conflictChecking.enabled && this.allocatedVlans.has(vlan)) {
        throw new Error(`VLAN ${vlan} already allocated`);
      }

      vlans.push(vlan);
      this.allocatedVlans.add(vlan);
    }

    return vlans;
  }

  generateIpv4Subnets(studentInfo: ReturnType<typeof this.parseStudentId>): {
    management: string;
    managementDetails: { network: string; broadcast: string; usable: string };
  } {
    const { management } = this.config.ip.ipv4;

    // Calculate subnet based on student info
    const dec2 = (studentInfo.year - this.config.studentId.baseYear) * 10 +
                 Math.floor(studentInfo.index / 250);
    const dec3 = studentInfo.index % 250;

    const networkAddr = `172.${dec2}.${dec3}.64`;
    const subnet = `${networkAddr}/${management.subnetSize}`;

    // Calculate network details
    const subnetSize = Math.pow(2, 32 - management.subnetSize);
    const broadcast = this.calculateBroadcast(networkAddr, management.subnetSize);
    const usableStart = this.incrementIp(networkAddr, 1);
    const usableEnd = this.incrementIp(broadcast, -1);

    return {
      management: subnet,
      managementDetails: {
        network: networkAddr,
        broadcast,
        usable: `${usableStart} - ${usableEnd}`
      }
    };
  }

  generateIpv6Subnets(studentInfo: ReturnType<typeof this.parseStudentId>): {
    management: string;
  } {
    const dec2 = (studentInfo.year - this.config.studentId.baseYear) * 10 +
                 Math.floor(studentInfo.index / 250);
    const dec3 = studentInfo.index % 250;

    return {
      management: `2001:${dec2}:${dec3}::/${this.config.ip.ipv6.management.prefixLength}`
    };
  }

  generateDeviceConfigs(
    studentInfo: ReturnType<typeof this.parseStudentId>,
    vlans: number[],
    ipv4Subnets: ReturnType<typeof this.generateIpv4Subnets>,
    ipv6Subnets: ReturnType<typeof this.generateIpv6Subnets>,
    deviceNumber: number
  ) {
    const externalIpv4 = `${this.config.ip.ipv4.external.baseNetwork.split('.').slice(0, 3).join('.')}.${this.config.ip.ipv4.external.startOffset + deviceNumber}`;
    const externalIpv6 = `${this.config.ip.ipv6.external.basePrefix}::${this.config.ip.ipv6.external.startOffset + deviceNumber}`;

    // Parse management network for device IPs
    const [baseNet] = ipv4Subnets.management.split('/');
    const [oct1, oct2, oct3, oct4] = baseNet.split('.').map(Number);

    const result = {
      router: {
        vlans: vlans.map((vlan, index) => {
          const vlanConfig = this.config.devices.router.vlans[index];
          const vlanIp = `${oct1}.${oct2}.${oct3}.${oct4 + vlanConfig.ipOffset}`;

          return {
            ip: vlanIp,
            mask: vlanConfig.subnetMask,
            interface: vlanConfig.interface,
            vlan: vlan
          };
        }),
        external: {
          ip: externalIpv4,
          mask: this.cidrToMask(this.config.ip.ipv4.external.subnetMask),
          interface: this.config.devices.router.external.interface,
          gateway: this.config.devices.router.external.gateway
        }
      },
      switch: {
        ip: `${oct1}.${oct2}.${oct3}.${oct4 + this.config.devices.switch.ipOffset}`,
        mask: this.config.devices.router.vlans[this.config.devices.switch.managementVlan].subnetMask,
        interface: `vlan${vlans[this.config.devices.switch.managementVlan]}`,
        gateway: `${oct1}.${oct2}.${oct3}.${oct4 + this.config.devices.router.vlans[this.config.devices.switch.managementVlan].ipOffset}`
      },
      pcs: this.config.devices.pcs.map((pcConfig, pcIndex) => {
        const vlan = vlans[pcConfig.vlanIndex];
        const routerVlanConfig = this.config.devices.router.vlans[pcConfig.vlanIndex];
        const gatewayIp = `${oct1}.${oct2}.${oct3}.${oct4 + routerVlanConfig.ipOffset}`;

        if (pcConfig.multipleIps) {
          const ips = [];
          for (let i = 0; i < pcConfig.multipleIps.count; i++) {
            ips.push(`${oct1}.${oct2}.${oct3}.${oct4 + pcConfig.multipleIps.startOffset + i}`);
          }
          return {
            ip: ips,
            mask: routerVlanConfig.subnetMask,
            interface: 'ens2',
            gateway: gatewayIp,
            dns: gatewayIp,
            vlan: vlan
          };
        } else {
          return {
            ip: `${oct1}.${oct2}.${oct3}.${oct4 + (pcConfig.ipOffset || 2)}`,
            mask: routerVlanConfig.subnetMask,
            interface: 'ens2',
            gateway: gatewayIp,
            dns: gatewayIp,
            vlan: vlan
          };
        }
      })
    };

    return result;
  }

  // Helper methods
  private calculateBroadcast(networkAddr: string, cidr: number): string {
    const [oct1, oct2, oct3, oct4] = networkAddr.split('.').map(Number);
    const hostBits = 32 - cidr;
    const hostMask = (1 << hostBits) - 1;

    const network = (oct1 << 24) | (oct2 << 16) | (oct3 << 8) | oct4;
    const broadcast = network | hostMask;

    return [
      (broadcast >>> 24) & 255,
      (broadcast >>> 16) & 255,
      (broadcast >>> 8) & 255,
      broadcast & 255
    ].join('.');
  }

  private incrementIp(ip: string, increment: number): string {
    const [oct1, oct2, oct3, oct4] = ip.split('.').map(Number);
    const ipNum = (oct1 << 24) | (oct2 << 16) | (oct3 << 8) | oct4;
    const newIpNum = ipNum + increment;

    return [
      (newIpNum >>> 24) & 255,
      (newIpNum >>> 16) & 255,
      (newIpNum >>> 8) & 255,
      newIpNum & 255
    ].join('.');
  }

  private cidrToMask(cidr: number): string {
    const mask = (0xFFFFFFFF << (32 - cidr)) >>> 0;
    return [
      (mask >>> 24) & 255,
      (mask >>> 16) & 255,
      (mask >>> 8) & 255,
      mask & 255
    ].join('.');
  }

  generateAnswer(studentId: number | string, deviceNumber: number = 0) {
    const studentInfo = this.parseStudentId(studentId);

    if (!studentInfo.isValid) {
      throw new Error(`Invalid student ID format. Expected format: ${this.config.studentId.baseYear}${this.config.studentId.facultyCode}XXXX`);
    }

    const vlans = this.generateVlans(studentInfo);
    const ipv4Subnets = this.generateIpv4Subnets(studentInfo);
    const ipv6Subnets = this.generateIpv6Subnets(studentInfo);
    const deviceConfigs = this.generateDeviceConfigs(studentInfo, vlans, ipv4Subnets, ipv6Subnets, deviceNumber);

    return {
      studentId: Number(studentId),
      studentInfo,
      vlans,
      ipv4Subnets,
      ipv6Subnets,
      deviceConfigs,
      generationConfig: this.config
    };
  }
}

export default NetworkConfigGenerator;

// Backward compatibility function
export function generateAnswer(studentId: number | string, deviceNumber: number = 0) {
  const generator = new NetworkConfigGenerator();
  return generator.generateAnswer(studentId, deviceNumber);
}