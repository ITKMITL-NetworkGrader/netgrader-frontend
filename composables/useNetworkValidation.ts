import type { NetworkValidationResult, NetworkInfo } from '@/types/ipSchema'

export const useNetworkValidation = () => {
  
  const validateCIDR = (cidr: string): NetworkValidationResult => {
    const errors: string[] = []
    const warnings: string[] = []
    
    // Basic CIDR format validation
    const cidrPattern = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/
    if (!cidrPattern.test(cidr)) {
      errors.push('Invalid CIDR format. Expected format: x.x.x.x/xx')
      return { isValid: false, errors, warnings }
    }
    
    const [networkPart, prefixPart] = cidr.split('/')
    const prefix = parseInt(prefixPart)
    
    // Validate prefix length
    if (prefix < 1 || prefix > 30) {
      errors.push('Subnet mask must be between /1 and /30 for host allocation')
      return { isValid: false, errors, warnings }
    }
    
    // Validate IP address octets
    const octets = networkPart.split('.').map(Number)
    for (let i = 0; i < octets.length; i++) {
      if (isNaN(octets[i]) || octets[i] < 0 || octets[i] > 255) {
        errors.push(`Invalid octet at position ${i + 1}: ${octets[i]}`)
      }
    }
    
    if (errors.length > 0) {
      return { isValid: false, errors, warnings }
    }
    
    // Calculate network information
    const networkInfo = calculateNetworkInfo(networkPart, prefix)
    
    // Check if network is actually a network address (not host)
    if (networkPart !== networkInfo.network) {
      warnings.push(`Input ${networkPart} is not the network address. Network address is ${networkInfo.network}`)
    }
    
    // Warn about small networks
    if (networkInfo.totalHosts < 10) {
      warnings.push(`Network has only ${networkInfo.totalHosts} available hosts. Consider using a larger subnet.`)
    }
    
    return {
      isValid: true,
      errors,
      warnings,
      network_info: networkInfo
    }
  }
  
  const validateIPAddress = (ip: string): boolean => {
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/
    if (!ipPattern.test(ip)) return false
    
    const octets = ip.split('.').map(Number)
    return octets.every(octet => octet >= 0 && octet <= 255)
  }
  
  const calculateNetworkInfo = (networkIP: string, prefixLength: number): NetworkInfo => {
    const octets = networkIP.split('.').map(Number)
    const ip = (octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]
    
    const mask = 0xffffffff << (32 - prefixLength)
    const network = ip & mask
    const broadcast = network | (~mask)
    
    const networkOctets = [
      (network >> 24) & 0xff,
      (network >> 16) & 0xff,
      (network >> 8) & 0xff,
      network & 0xff
    ]
    
    const broadcastOctets = [
      (broadcast >> 24) & 0xff,
      (broadcast >> 16) & 0xff,
      (broadcast >> 8) & 0xff,
      broadcast & 0xff
    ]
    
    const firstHostOctets = [...networkOctets]
    firstHostOctets[3] += 1
    
    const lastHostOctets = [...broadcastOctets]
    lastHostOctets[3] -= 1
    
    const subnetMaskOctets = [
      (mask >> 24) & 0xff,
      (mask >> 16) & 0xff,
      (mask >> 8) & 0xff,
      mask & 0xff
    ]
    
    return {
      network: networkOctets.join('.'),
      broadcast: broadcastOctets.join('.'),
      firstHost: firstHostOctets.join('.'),
      lastHost: lastHostOctets.join('.'),
      totalHosts: Math.max(0, (broadcast - network - 1)),
      subnetMask: subnetMaskOctets.join('.'),
      cidr: `${networkOctets.join('.')}/${prefixLength}`
    }
  }
  
  const isIPInNetwork = (ip: string, network: string, prefixLength: number): boolean => {
    if (!validateIPAddress(ip)) return false
    
    const ipOctets = ip.split('.').map(Number)
    const networkOctets = network.split('.').map(Number)
    
    const ipInt = (ipOctets[0] << 24) | (ipOctets[1] << 16) | (ipOctets[2] << 8) | ipOctets[3]
    const networkInt = (networkOctets[0] << 24) | (networkOctets[1] << 16) | (networkOctets[2] << 8) | networkOctets[3]
    
    const mask = 0xffffffff << (32 - prefixLength)
    
    return (ipInt & mask) === (networkInt & mask)
  }
  
  const generateSequentialIP = (baseNetwork: string, prefixLength: number, hostNumber: number): string | null => {
    const networkInfo = calculateNetworkInfo(baseNetwork, prefixLength)
    
    if (hostNumber < 1 || hostNumber > networkInfo.totalHosts) {
      return null
    }
    
    const networkOctets = networkInfo.network.split('.').map(Number)
    const networkInt = (networkOctets[0] << 24) | (networkOctets[1] << 16) | (networkOctets[2] << 8) | networkOctets[3]
    
    const hostIP = networkInt + hostNumber
    
    return [
      (hostIP >> 24) & 0xff,
      (hostIP >> 16) & 0xff,
      (hostIP >> 8) & 0xff,
      hostIP & 0xff
    ].join('.')
  }
  
  const validateGateway = (gateway: string, network: string, prefixLength: number): { isValid: boolean; error?: string } => {
    if (!validateIPAddress(gateway)) {
      return { isValid: false, error: 'Invalid gateway IP address format' }
    }
    
    if (!isIPInNetwork(gateway, network, prefixLength)) {
      return { isValid: false, error: 'Gateway IP address is not in the specified network' }
    }
    
    const networkInfo = calculateNetworkInfo(network, prefixLength)
    
    if (gateway === networkInfo.network) {
      return { isValid: false, error: 'Gateway cannot be the network address' }
    }
    
    if (gateway === networkInfo.broadcast) {
      return { isValid: false, error: 'Gateway cannot be the broadcast address' }
    }
    
    return { isValid: true }
  }
  
  const suggestGateway = (network: string, prefixLength: number): string => {
    const networkInfo = calculateNetworkInfo(network, prefixLength)
    return networkInfo.firstHost // Typically use first available host as gateway
  }
  
  const getAvailableHostCount = (network: string, prefixLength: number, reservedIPs: string[] = []): number => {
    const networkInfo = calculateNetworkInfo(network, prefixLength)
    return Math.max(0, networkInfo.totalHosts - reservedIPs.length)
  }
  
  return {
    validateCIDR,
    validateIPAddress,
    calculateNetworkInfo,
    isIPInNetwork,
    generateSequentialIP,
    validateGateway,
    suggestGateway,
    getAvailableHostCount
  }
}