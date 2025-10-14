/**
 * IP Range Utilities for Exempt IP Range Feature
 *
 * Provides validation, parsing, merging, and management of IP ranges
 * for excluding IPs from Management IP assignment in labs.
 */

import type { IpRange } from '~/types/wizard'

/**
 * Validates if a string is a valid IPv4 address
 */
export function isValidIPv4(ip: string): boolean {
  const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  return ipv4Pattern.test(ip.trim())
}

/**
 * Converts IPv4 string to numeric value for comparison
 */
export function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number)
  return (parts[0] * 16777216) + (parts[1] * 65536) + (parts[2] * 256) + parts[3]
}

/**
 * Converts numeric value back to IPv4 string
 */
export function numberToIp(num: number): string {
  return [
    (num >>> 24) & 0xFF,
    (num >>> 16) & 0xFF,
    (num >>> 8) & 0xFF,
    num & 0xFF
  ].join('.')
}

/**
 * Checks if an IP is within a network (baseNetwork/subnetMask)
 */
export function isIpInNetwork(ip: string, baseNetwork: string, subnetMask: number): boolean {
  const ipNum = ipToNumber(ip)
  const networkNum = ipToNumber(baseNetwork)
  const maskBits = 0xFFFFFFFF << (32 - subnetMask)

  return (ipNum & maskBits) === (networkNum & maskBits)
}

/**
 * Parses user input into an IpRange object
 * Supports formats:
 * - Single IP: "10.0.0.1"
 * - IP Range: "10.0.0.1 - 10.0.0.10" or "10.0.0.1-10.0.0.10"
 */
export function parseIpInput(input: string): { range: IpRange | null; error: string | null } {
  const trimmed = input.trim()

  if (!trimmed) {
    return { range: null, error: 'Input cannot be empty' }
  }

  // Check for range format (with or without spaces around hyphen)
  const rangeMatch = trimmed.match(/^(.+?)\s*-\s*(.+?)$/)

  if (rangeMatch) {
    // Range format: "IP1 - IP2"
    const startIp = rangeMatch[1].trim()
    const endIp = rangeMatch[2].trim()

    if (!isValidIPv4(startIp)) {
      return { range: null, error: `Invalid start IP: ${startIp}` }
    }

    if (!isValidIPv4(endIp)) {
      return { range: null, error: `Invalid end IP: ${endIp}` }
    }

    // Validate that start < end
    if (ipToNumber(startIp) > ipToNumber(endIp)) {
      return { range: null, error: 'Start IP must be less than or equal to end IP' }
    }

    return {
      range: {
        start: startIp,
        end: endIp,
        original: trimmed
      },
      error: null
    }
  } else {
    // Single IP format
    if (!isValidIPv4(trimmed)) {
      return { range: null, error: `Invalid IP address: ${trimmed}` }
    }

    return {
      range: {
        start: trimmed,
        end: undefined,
        original: trimmed
      },
      error: null
    }
  }
}

/**
 * Validates that an IP range is within the management network
 */
export function validateRangeInNetwork(
  range: IpRange,
  baseNetwork: string,
  subnetMask: number
): { isValid: boolean; error: string | null } {
  if (!isIpInNetwork(range.start, baseNetwork, subnetMask)) {
    return {
      isValid: false,
      error: `IP ${range.start} is not within management network ${baseNetwork}/${subnetMask}`
    }
  }

  if (range.end && !isIpInNetwork(range.end, baseNetwork, subnetMask)) {
    return {
      isValid: false,
      error: `IP ${range.end} is not within management network ${baseNetwork}/${subnetMask}`
    }
  }

  return { isValid: true, error: null }
}

/**
 * Counts the number of IPs in a range
 */
export function countIpsInRange(range: IpRange): number {
  if (!range.end) {
    return 1
  }

  const startNum = ipToNumber(range.start)
  const endNum = ipToNumber(range.end)

  return endNum - startNum + 1
}

/**
 * Checks if two IP ranges overlap
 */
export function rangesOverlap(range1: IpRange, range2: IpRange): boolean {
  const start1 = ipToNumber(range1.start)
  const end1 = range1.end ? ipToNumber(range1.end) : start1
  const start2 = ipToNumber(range2.start)
  const end2 = range2.end ? ipToNumber(range2.end) : start2

  // Ranges overlap if start1 <= end2 AND start2 <= end1
  return start1 <= end2 && start2 <= end1
}

/**
 * Merges two overlapping IP ranges
 */
export function mergeRanges(range1: IpRange, range2: IpRange): IpRange {
  const start1 = ipToNumber(range1.start)
  const end1 = range1.end ? ipToNumber(range1.end) : start1
  const start2 = ipToNumber(range2.start)
  const end2 = range2.end ? ipToNumber(range2.end) : start2

  const mergedStart = Math.min(start1, start2)
  const mergedEnd = Math.max(end1, end2)

  const startIp = numberToIp(mergedStart)
  const endIp = numberToIp(mergedEnd)

  return {
    start: startIp,
    end: startIp !== endIp ? endIp : undefined,
    original: startIp !== endIp ? `${startIp} - ${endIp}` : startIp
  }
}

/**
 * Auto-merges overlapping IP ranges in an array
 * Returns a new array with merged ranges, sorted by start IP
 */
export function autoMergeRanges(ranges: IpRange[]): IpRange[] {
  if (ranges.length <= 1) {
    return [...ranges]
  }

  // Sort ranges by start IP
  const sorted = [...ranges].sort((a, b) => ipToNumber(a.start) - ipToNumber(b.start))

  const merged: IpRange[] = []
  let current = sorted[0]

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i]

    if (rangesOverlap(current, next)) {
      // Merge overlapping ranges
      current = mergeRanges(current, next)
    } else {
      // No overlap, push current and move to next
      merged.push(current)
      current = next
    }
  }

  // Push the last range
  merged.push(current)

  return merged
}

/**
 * Calculates the total number of IPs in all ranges
 */
export function countTotalIps(ranges: IpRange[]): number {
  return ranges.reduce((sum, range) => sum + countIpsInRange(range), 0)
}

/**
 * Generates a display string for an IP range
 */
export function formatRangeDisplay(range: IpRange): string {
  if (!range.end || range.start === range.end) {
    return range.start
  }
  return `${range.start} - ${range.end}`
}

/**
 * Validates the entire exempt IP ranges configuration
 */
export function validateExemptRanges(
  ranges: IpRange[],
  baseNetwork: string,
  subnetMask: number,
  maxRanges: number = 20
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  // Check max ranges limit
  if (ranges.length > maxRanges) {
    errors.push(`Maximum ${maxRanges} exempt ranges allowed (current: ${ranges.length})`)
  }

  // Validate each range
  for (const range of ranges) {
    const validation = validateRangeInNetwork(range, baseNetwork, subnetMask)
    if (!validation.isValid && validation.error) {
      errors.push(validation.error)
    }

    // Warning for large ranges (>100 IPs)
    const ipCount = countIpsInRange(range)
    if (ipCount > 100) {
      warnings.push(`Range ${formatRangeDisplay(range)} excludes ${ipCount} IPs (large range)`)
    }
  }

  // Calculate total IPs excluded
  const totalIps = countTotalIps(ranges)
  const networkCapacity = Math.pow(2, 32 - subnetMask) - 2 // -2 for network and broadcast

  if (totalIps > networkCapacity * 0.5) {
    warnings.push(
      `Excluding ${totalIps} IPs (${Math.round((totalIps / networkCapacity) * 100)}% of network capacity). ` +
      `This may limit available Management IPs for students.`
    )
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Exports exempt ranges to backend format
 */
export function exportRangesToBackendFormat(ranges: IpRange[]): Array<{ start: string; end?: string }> {
  return ranges.map(range => ({
    start: range.start,
    ...(range.end ? { end: range.end } : {})
  }))
}
