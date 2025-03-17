// Security Configuration File

export const securityConfig = {
  // HSM Configuration
  hsm: {
    enabled: false, // Set to true when HSM is available
    vendor: 'YubiHSM',
    endpoint: 'localhost:12345'
  },

  // Key Management
  keyRotation: {
    interval: '30d', // Rotate keys every 30 days
    archiveOldKeys: true
  },

  // TLS Configuration
  tls: {
    version: '1.3',
    cipherSuites: [
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256'
    ]
  },

  // Bootstrapping
  bootstrap: {
    requireSecureChannel: true,
    useEphemeralKeys: true
  }
};
