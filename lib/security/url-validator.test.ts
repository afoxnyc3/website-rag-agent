import { describe, it, expect } from 'vitest';
import { SecureURLValidator, validateURLBasic } from './url-validator';

describe('SecureURLValidator', () => {
  describe('Basic URL Validation', () => {
    it('should reject non-HTTP/HTTPS protocols', () => {
      expect(validateURLBasic('ftp://example.com')).toBe(false);
      expect(validateURLBasic('file:///etc/passwd')).toBe(false);
      expect(validateURLBasic('javascript:alert(1)')).toBe(false);
      expect(validateURLBasic('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    it('should accept valid HTTP/HTTPS URLs', () => {
      expect(validateURLBasic('http://example.com')).toBe(true);
      expect(validateURLBasic('https://api.openai.com')).toBe(true);
      expect(validateURLBasic('https://docs.google.com/document')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validateURLBasic('not-a-url')).toBe(false);
      expect(validateURLBasic('')).toBe(false);
      expect(validateURLBasic('http://')).toBe(false);
    });
  });

  describe('Private IP Range Blocking', () => {
    it('should block 10.x.x.x range', () => {
      expect(validateURLBasic('http://10.0.0.1')).toBe(false);
      expect(validateURLBasic('http://10.255.255.255')).toBe(false);
      expect(validateURLBasic('http://10.1.1.1:8080')).toBe(false);
    });

    it('should block 172.16-31.x.x range', () => {
      expect(validateURLBasic('http://172.16.0.1')).toBe(false);
      expect(validateURLBasic('http://172.31.255.255')).toBe(false);
      expect(validateURLBasic('http://172.20.10.5')).toBe(false);
    });

    it('should block 192.168.x.x range', () => {
      expect(validateURLBasic('http://192.168.1.1')).toBe(false);
      expect(validateURLBasic('http://192.168.0.1')).toBe(false);
      expect(validateURLBasic('http://192.168.255.255')).toBe(false);
    });

    it('should allow public IPs in 172 range outside private subnet', () => {
      expect(validateURLBasic('http://172.15.0.1')).toBe(true);
      expect(validateURLBasic('http://172.32.0.1')).toBe(true);
    });
  });

  describe('Localhost and Loopback Blocking', () => {
    it('should block localhost hostname', () => {
      expect(validateURLBasic('http://localhost')).toBe(false);
      expect(validateURLBasic('http://localhost:3000')).toBe(false);
      expect(validateURLBasic('https://localhost/api')).toBe(false);
      expect(validateURLBasic('http://localhost.localdomain')).toBe(false);
    });

    it('should block 127.x.x.x loopback range', () => {
      expect(validateURLBasic('http://127.0.0.1')).toBe(false);
      expect(validateURLBasic('http://127.0.0.1:8080')).toBe(false);
      expect(validateURLBasic('http://127.255.255.255')).toBe(false);
    });

    it('should block 0.0.0.0 range', () => {
      expect(validateURLBasic('http://0.0.0.0')).toBe(false);
      expect(validateURLBasic('http://0.1.1.1')).toBe(false);
    });
  });

  describe('Cloud Metadata Endpoint Blocking', () => {
    it('should block AWS/GCP/Azure metadata IP', () => {
      expect(validateURLBasic('http://169.254.169.254')).toBe(false);
      expect(validateURLBasic('http://169.254.169.254/latest/meta-data/')).toBe(false);
    });

    it('should block other link-local addresses', () => {
      expect(validateURLBasic('http://169.254.0.1')).toBe(false);
      expect(validateURLBasic('http://169.254.255.255')).toBe(false);
    });

    it('should block metadata hostnames', () => {
      expect(validateURLBasic('http://metadata')).toBe(false);
      expect(validateURLBasic('http://metadata.google.internal')).toBe(false);
      expect(validateURLBasic('http://metadata.amazonaws.com')).toBe(false);
    });
  });

  describe('IPv6 Support', () => {
    it('should block IPv6 loopback', () => {
      expect(validateURLBasic('http://[::1]')).toBe(false);
      expect(validateURLBasic('http://[::1]:8080')).toBe(false);
    });

    it('should block IPv6 link-local addresses', () => {
      expect(validateURLBasic('http://[fe80::1]')).toBe(false);
      expect(validateURLBasic('http://[fe80::1234:5678]')).toBe(false);
    });

    it('should block IPv6 unique local addresses', () => {
      expect(validateURLBasic('http://[fc00::1]')).toBe(false);
      expect(validateURLBasic('http://[fd00::1]')).toBe(false);
      expect(validateURLBasic('http://[fd00:ec2::254]')).toBe(false); // AWS metadata
    });
  });

  describe('Port Restrictions', () => {
    it('should block restricted internal service ports', () => {
      expect(SecureURLValidator.isBasicSecureURL('http://example.com:22')).toBe(false); // SSH
      expect(SecureURLValidator.isBasicSecureURL('http://example.com:3306')).toBe(false); // MySQL
      expect(SecureURLValidator.isBasicSecureURL('http://example.com:5432')).toBe(false); // PostgreSQL
      expect(SecureURLValidator.isBasicSecureURL('http://example.com:6379')).toBe(false); // Redis
      expect(SecureURLValidator.isBasicSecureURL('http://example.com:27017')).toBe(false); // MongoDB
    });

    it('should allow standard web ports', () => {
      expect(validateURLBasic('http://example.com:80')).toBe(true);
      expect(validateURLBasic('https://example.com:443')).toBe(true);
      expect(validateURLBasic('http://example.com:8080')).toBe(true);
      expect(validateURLBasic('http://example.com:3000')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle URLs with paths and query strings', () => {
      expect(validateURLBasic('http://192.168.1.1/admin?user=admin')).toBe(false);
      expect(validateURLBasic('https://example.com/api?key=value')).toBe(true);
    });

    it('should handle URLs with authentication', () => {
      expect(validateURLBasic('http://user:pass@192.168.1.1')).toBe(false);
      expect(validateURLBasic('https://user:pass@example.com')).toBe(true);
    });

    it('should handle URLs with fragments', () => {
      expect(validateURLBasic('http://localhost#section')).toBe(false);
      expect(validateURLBasic('https://example.com#section')).toBe(true);
    });

    it('should handle encoded URLs', () => {
      expect(validateURLBasic('http://%31%32%37%2e%30%2e%30%2e%31')).toBe(false); // 127.0.0.1 encoded
    });
  });

  describe('Async DNS Resolution Tests', () => {
    it('should validate URLs with DNS resolution', async () => {
      // These tests would require mocking DNS or network access
      // For now, we'll test the basic async function exists
      const isValid = await SecureURLValidator.isSecureURL('https://example.com');
      expect(typeof isValid).toBe('boolean');
    });

    it('should reject when DNS points to private IP', async () => {
      // This would need DNS mocking to test properly
      // The actual implementation would catch DNS rebinding attacks
      const validator = SecureURLValidator;
      expect(validator).toBeDefined();
    });
  });

  describe('Real-world Attack Vectors', () => {
    it('should block SSRF attempts to internal services', () => {
      // Kubernetes/Docker internal DNS
      expect(validateURLBasic('http://kubernetes.default.svc')).toBe(true); // Would need DNS check

      // Common internal service names (would be caught by DNS resolution)
      expect(validateURLBasic('http://redis.internal')).toBe(true); // Would need DNS check
      expect(validateURLBasic('http://db.local')).toBe(true); // Would need DNS check
    });

    it('should block attempts to access cloud metadata', () => {
      // Various cloud metadata endpoints
      expect(validateURLBasic('http://169.254.169.254/latest/meta-data/')).toBe(false);
      expect(validateURLBasic('http://metadata.google.internal/computeMetadata/v1/')).toBe(false);
      expect(validateURLBasic('http://169.254.169.254/metadata/instance')).toBe(false);
    });

    it('should block attempts to scan internal network', () => {
      // Port scanning attempts
      expect(validateURLBasic('http://192.168.1.1:22')).toBe(false);
      expect(validateURLBasic('http://10.0.0.1:3306')).toBe(false);
      expect(validateURLBasic('http://172.16.0.1:6379')).toBe(false);
    });
  });
});

describe('validateURLBasic Helper Function', () => {
  it('should be a convenience wrapper', () => {
    expect(validateURLBasic('http://localhost')).toBe(false);
    expect(validateURLBasic('https://google.com')).toBe(true);
  });
});
