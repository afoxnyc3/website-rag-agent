import { lookup } from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(lookup);

/**
 * Secure URL validator to prevent SSRF attacks
 * Blocks access to private IP ranges, localhost, and cloud metadata endpoints
 */
export class SecureURLValidator {
  // Private IP ranges (IPv4)
  private static readonly PRIVATE_IP_RANGES = [
    { start: [10, 0, 0, 0], end: [10, 255, 255, 255] }, // 10.0.0.0/8
    { start: [172, 16, 0, 0], end: [172, 31, 255, 255] }, // 172.16.0.0/12
    { start: [192, 168, 0, 0], end: [192, 168, 255, 255] }, // 192.168.0.0/16
    { start: [127, 0, 0, 0], end: [127, 255, 255, 255] }, // 127.0.0.0/8 (loopback)
    { start: [169, 254, 0, 0], end: [169, 254, 255, 255] }, // 169.254.0.0/16 (link-local)
    { start: [0, 0, 0, 0], end: [0, 255, 255, 255] }, // 0.0.0.0/8
  ];

  // Blocked hostnames
  private static readonly BLOCKED_HOSTNAMES = [
    'localhost',
    'localhost.localdomain',
    'metadata.google.internal',
    'metadata',
    'metadata.amazonaws.com',
  ];

  // Cloud metadata endpoints
  private static readonly METADATA_IPS = [
    '169.254.169.254', // AWS, GCP, Azure
    'fd00:ec2::254', // AWS IPv6
  ];

  /**
   * Validates if a URL is safe to access (not pointing to internal resources)
   */
  public static async isSecureURL(url: string): Promise<boolean> {
    try {
      // 1. Basic URL parsing
      const parsed = new URL(url);

      // 2. Protocol validation - only allow HTTP/HTTPS
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return false;
      }

      // 3. Check blocked hostnames
      if (this.isBlockedHostname(parsed.hostname)) {
        return false;
      }

      // 4. Check if hostname is an IP address
      if (this.isIPAddress(parsed.hostname)) {
        // Direct IP access - validate immediately
        if (!this.isPublicIP(parsed.hostname)) {
          return false;
        }
      } else {
        // 5. DNS resolution check for domain names
        try {
          const resolvedIP = await this.resolveHostname(parsed.hostname);
          if (resolvedIP && !this.isPublicIP(resolvedIP)) {
            return false;
          }
        } catch (dnsError) {
          // DNS resolution failed - block for safety
          return false;
        }
      }

      // 6. Check port restrictions (optional - can be configured)
      if (this.isRestrictedPort(parsed.port)) {
        return false;
      }

      return true;
    } catch (error) {
      // Invalid URL or other parsing error
      return false;
    }
  }

  /**
   * Checks if hostname is in the blocked list
   */
  private static isBlockedHostname(hostname: string): boolean {
    const lowerHostname = hostname.toLowerCase();
    return this.BLOCKED_HOSTNAMES.includes(lowerHostname) || this.METADATA_IPS.includes(hostname);
  }

  /**
   * Checks if a string is an IP address (IPv4 or IPv6)
   */
  private static isIPAddress(hostname: string): boolean {
    // Handle IPv6 with brackets
    let cleanHostname = hostname;
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      cleanHostname = hostname.slice(1, -1);
    }

    // IPv4 pattern
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    // IPv6 pattern (simplified but more comprehensive)
    const ipv6Regex =
      /^(([0-9a-fA-F]{0,4}:){1,7}[0-9a-fA-F]{0,4}|::([0-9a-fA-F]{0,4}:){0,6}[0-9a-fA-F]{0,4}|([0-9a-fA-F]{0,4}:){1,6}:[0-9a-fA-F]{0,4}|::)$/;

    return ipv4Regex.test(cleanHostname) || ipv6Regex.test(cleanHostname);
  }

  /**
   * Checks if an IP address is public (not in private ranges)
   */
  private static isPublicIP(ip: string): boolean {
    // Handle IPv6 with brackets
    let cleanIP = ip;
    if (ip.startsWith('[') && ip.endsWith(']')) {
      cleanIP = ip.slice(1, -1);
    }

    // Check cloud metadata IPs
    if (this.METADATA_IPS.includes(cleanIP)) {
      return false;
    }

    // Handle IPv6
    if (cleanIP.includes(':')) {
      return this.isPublicIPv6(cleanIP);
    }

    // Handle IPv4
    const octets = cleanIP.split('.').map(Number);
    if (octets.length !== 4 || octets.some((o) => isNaN(o) || o < 0 || o > 255)) {
      return false; // Invalid IP
    }

    // Check against private ranges
    for (const range of this.PRIVATE_IP_RANGES) {
      if (this.isInRange(octets, range.start, range.end)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Checks if IPv6 address is public
   */
  private static isPublicIPv6(ip: string): boolean {
    const lowerIP = ip.toLowerCase();

    // Block loopback (::1, ::ffff:127.0.0.1, etc.)
    if (lowerIP === '::1' || lowerIP === '::' || lowerIP.includes('::ffff:127')) {
      return false;
    }

    // Block common private IPv6 ranges by prefix
    const privateIPv6Prefixes = [
      'fe80:', // Link-local (fe80::/10)
      'fec0:', // Site-local (deprecated)
      'fc00:', // Unique local (fc00::/7)
      'fd', // Unique local (fd00::/8) - checking just 'fd' prefix
      '100::', // Discard prefix
      '2001:db8:', // Documentation
      'ff', // Multicast (ff00::/8)
    ];

    for (const prefix of privateIPv6Prefixes) {
      if (lowerIP.startsWith(prefix)) {
        return false;
      }
    }

    // Block IPv6 metadata endpoint
    if (lowerIP === 'fd00:ec2::254') {
      return false;
    }

    return true;
  }

  /**
   * Checks if IP octets are within a range
   */
  private static isInRange(octets: number[], start: number[], end: number[]): boolean {
    for (let i = 0; i < 4; i++) {
      if (octets[i] < start[i]) return false;
      if (octets[i] > end[i]) return false;
      if (octets[i] > start[i] && octets[i] < end[i]) return true;
    }
    return true; // Exactly matches one of the boundaries
  }

  /**
   * Resolves hostname to IP address
   */
  private static async resolveHostname(hostname: string): Promise<string | null> {
    try {
      const result = await dnsLookup(hostname);
      return result.address;
    } catch (error) {
      // DNS resolution failed
      return null;
    }
  }

  /**
   * Checks if port is restricted (optional security measure)
   */
  private static isRestrictedPort(port: string): boolean {
    if (!port) return false; // No port specified, use default

    const portNum = parseInt(port, 10);
    if (isNaN(portNum)) return true; // Invalid port

    // Block common internal service ports
    const restrictedPorts = [
      22, // SSH
      23, // Telnet
      25, // SMTP
      110, // POP3
      143, // IMAP
      445, // SMB
      1433, // MSSQL
      1521, // Oracle
      3306, // MySQL
      3389, // RDP
      5432, // PostgreSQL
      5984, // CouchDB
      6379, // Redis
      8020, // Hadoop
      8086, // InfluxDB
      9200, // Elasticsearch
      11211, // Memcached
      27017, // MongoDB
    ];

    return restrictedPorts.includes(portNum);
  }

  /**
   * Validates a URL without DNS resolution (faster, less secure)
   */
  public static isBasicSecureURL(url: string): boolean {
    try {
      const parsed = new URL(url);

      // Protocol check
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return false;
      }

      // Blocked hostname check
      if (this.isBlockedHostname(parsed.hostname)) {
        return false;
      }

      // If it's an IP, validate it
      if (this.isIPAddress(parsed.hostname)) {
        if (!this.isPublicIP(parsed.hostname)) {
          return false;
        }
      }

      // Check port restrictions
      if (this.isRestrictedPort(parsed.port)) {
        return false;
      }

      // Domain name - allow for now (no DNS check)
      return true;
    } catch {
      return false;
    }
  }
}

// Export a convenience function for simple usage
export async function validateURL(url: string): Promise<boolean> {
  return SecureURLValidator.isSecureURL(url);
}

// Export a synchronous basic validator
export function validateURLBasic(url: string): boolean {
  return SecureURLValidator.isBasicSecureURL(url);
}
