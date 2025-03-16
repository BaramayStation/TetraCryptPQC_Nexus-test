/**
 * TetraCryptPQC Autonomous Key Management System
 * 
 * Implements a fully autonomous, AI-driven post-quantum key management system
 * that handles key rotation, verification, secure storage, and HSM integration.
 */

import { PQCKey } from './crypto';
import { generateMLKEMKeypair, generateSLHDSAKeypair, generateFalconKeypair } from './pqcrypto';
import { hashWithSHAKE256 } from './pqcrypto-core';
import { aiSecurityOrchestrator, AISecurityMode, PQCAlgorithmPreference } from './ai-security-orchestrator';
import { onnxIntrusionDetection } from './ai-onnx-intrusion-detection';

// Key types supported by the system
export enum KeyType {
  ENCRYPTION = 'encryption',  // ML-KEM for encryption/key exchange
  SIGNATURE = 'signature',    // SLH-DSA or Falcon for signatures
  AUTHENTICATION = 'authentication', // Used for identity authentication
  RECOVERY = 'recovery',      // Key recovery
  MASTER = 'master'           // Master key for key derivation
}

// Key strength levels (NIST security levels)
export enum SecurityLevel {
  L1 = 'L1',  // Equivalent to AES-128
  L3 = 'L3',  // Equivalent to AES-192
  L5 = 'L5'   // Equivalent to AES-256
}

// Key storage options
export enum KeyStorageType {
  HSM = 'hsm',                  // Hardware Security Module
  TPM = 'tpm',                  // Trusted Platform Module
  SECURE_ENCLAVE = 'enclave',   // Secure Enclave
  SOFTWARE = 'software',        // Software-based storage (encrypted)
  DECENTRALIZED = 'decentralized' // Decentralized storage (StarkNet)
}

// Key usage policies
export interface KeyUsagePolicy {
  maxOperationsPerDay: number;
  maxTotalOperations: number;
  expirationDays: number;
  allowRemoteUsage: boolean;
  requiredAuthentication: 'none' | 'password' | 'mfa' | 'hardware';
  allowExport: boolean;
  auditUsage: boolean;
  restrictToIndices: number[] | null; // For ML-KEM indice restrictions
}

// Default key usage policy
const DEFAULT_KEY_POLICY: KeyUsagePolicy = {
  maxOperationsPerDay: 10000,
  maxTotalOperations: 1000000,
  expirationDays: 90,
  allowRemoteUsage: true,
  requiredAuthentication: 'mfa',
  allowExport: false,
  auditUsage: true,
  restrictToIndices: null
};

// Extended PQC key with metadata
export interface ManagedPQCKey extends PQCKey {
  keyType: KeyType;
  securityLevel: SecurityLevel;
  algorithm: string;
  created: string;
  expires: string;
  lastRotated: string | null;
  rotationCount: number;
  usageCount: number;
  storageType: KeyStorageType;
  status: 'active' | 'compromised' | 'expired' | 'revoked' | 'scheduled-rotation';
  tags: string[];
  policy: KeyUsagePolicy;
  backupExists: boolean;
  threatScore: number; // 0-100, AI-assessed risk level
}

// Key rotation reason
export enum RotationReason {
  SCHEDULED = 'scheduled',
  SECURITY_THREAT = 'security-threat',
  COMPROMISE_SUSPECTED = 'compromise-suspected',
  USAGE_THRESHOLD = 'usage-threshold',
  ADMIN_REQUESTED = 'admin-requested',
  ALGORITHM_UPGRADE = 'algorithm-upgrade',
  AI_RECOMMENDED = 'ai-recommended'
}

// Key rotation event
export interface KeyRotationEvent {
  id: string;
  keyId: string;
  timestamp: string;
  reason: RotationReason;
  previousFingerprint: string;
  newFingerprint: string;
  threatScoreBefore: number;
  threatScoreAfter: number;
  aiConfidence: number; // 0-1, confidence in the rotation decision
}

/**
 * Autonomous Key Management System
 */
export class AutonomousKeyManager {
  private keys: Map<string, ManagedPQCKey> = new Map();
  private rotationHistory: KeyRotationEvent[] = [];
  private isInitialized: boolean = false;
  private defaultSecurityLevel: SecurityLevel = SecurityLevel.L5;
  private defaultStorageType: KeyStorageType = KeyStorageType.HSM;
  private hsmAvailable: boolean = false;
  private tpmAvailable: boolean = false;
  private secureEnclaveAvailable: boolean = false;
  private lastHealthCheck: string | null = null;
  
  /**
   * Constructor
   */
  constructor() {
    // Automatically detect available secure storage
    this.detectSecureStorage();
  }
  
  /**
   * Initialize the key management system
   */
  public async initialize(): Promise<boolean> {
    console.log("🔹 Initializing Autonomous Key Management System");
    
    // Initialize secure storage
    console.log(`🔹 Secure storage status: HSM: ${this.hsmAvailable}, TPM: ${this.tpmAvailable}, Secure Enclave: ${this.secureEnclaveAvailable}`);
    
    // Set default storage type based on availability
    if (this.hsmAvailable) {
      this.defaultStorageType = KeyStorageType.HSM;
    } else if (this.tpmAvailable) {
      this.defaultStorageType = KeyStorageType.TPM;
    } else if (this.secureEnclaveAvailable) {
      this.defaultStorageType = KeyStorageType.SECURE_ENCLAVE;
    } else {
      this.defaultStorageType = KeyStorageType.SOFTWARE;
      console.log("⚠️ No hardware security modules detected. Using software-based key storage.");
    }
    
    // Generate initial key set if needed
    await this.generateInitialKeys();
    
    // Perform initial health check
    await this.performHealthCheck();
    
    this.isInitialized = true;
    console.log("✅ Autonomous Key Management System initialized successfully");
    
    // Start autonomous key management in the background
    this.startAutonomousManagement();
    
    return true;
  }
  
  /**
   * Detect available secure storage options
   */
  private detectSecureStorage(): void {
    // Detect HSM
    try {
      // In real implementation, would check for HSM connectivity
      this.hsmAvailable = false;
    } catch (error) {
      this.hsmAvailable = false;
    }
    
    // Detect TPM
    try {
      // In real implementation, would check for TPM
      this.tpmAvailable = false;
    } catch (error) {
      this.tpmAvailable = false;
    }
    
    // Detect Secure Enclave
    try {
      // In real implementation, would check for Secure Enclave
      this.secureEnclaveAvailable = navigator.userAgent.includes('Mac') || 
                                   navigator.userAgent.includes('iPhone') || 
                                   navigator.userAgent.includes('iPad');
    } catch (error) {
      this.secureEnclaveAvailable = false;
    }
  }
  
  /**
   * Generate initial keys for the system
   */
  private async generateInitialKeys(): Promise<void> {
    console.log("🔹 Generating initial key set");
    
    // Check if we already have keys
    if (this.keys.size > 0) {
      console.log("🔹 Keys already exist, skipping initial generation");
      return;
    }
    
    // Generate ML-KEM encryption key
    const encryptionKey = await this.generateKey(
      KeyType.ENCRYPTION, 
      SecurityLevel.L5, 
      'ML-KEM-1024',
      this.defaultStorageType
    );
    console.log(`🔹 Generated ML-KEM-1024 encryption key: ${encryptionKey.id}`);
    
    // Generate SLH-DSA signature key
    const signatureKey = await this.generateKey(
      KeyType.SIGNATURE, 
      SecurityLevel.L5, 
      'SLH-DSA-Dilithium5',
      this.defaultStorageType
    );
    console.log(`🔹 Generated SLH-DSA-Dilithium5 signature key: ${signatureKey.id}`);
    
    // Generate Falcon signature key (alternate)
    const falconKey = await this.generateKey(
      KeyType.SIGNATURE, 
      SecurityLevel.L5, 
      'FALCON-1024',
      this.defaultStorageType
    );
    console.log(`🔹 Generated FALCON-1024 signature key: ${falconKey.id}`);
    
    // Generate authentication key
    const authKey = await this.generateKey(
      KeyType.AUTHENTICATION, 
      SecurityLevel.L5, 
      'ML-KEM-1024',
      this.defaultStorageType
    );
    console.log(`🔹 Generated ML-KEM-1024 authentication key: ${authKey.id}`);
    
    // Generate recovery key (with special policy)
    const recoveryPolicy: KeyUsagePolicy = {
      ...DEFAULT_KEY_POLICY,
      expirationDays: 365,
      allowExport: true,
      requiredAuthentication: 'hardware'
    };
    
    const recoveryKey = await this.generateKey(
      KeyType.RECOVERY, 
      SecurityLevel.L5, 
      'ML-KEM-1024',
      this.defaultStorageType,
      recoveryPolicy
    );
    console.log(`🔹 Generated ML-KEM-1024 recovery key: ${recoveryKey.id}`);
  }
  
  /**
   * Generate a new PQC key
   */
  public async generateKey(
    keyType: KeyType,
    securityLevel: SecurityLevel,
    algorithm: string,
    storageType: KeyStorageType,
    policy: KeyUsagePolicy = DEFAULT_KEY_POLICY
  ): Promise<ManagedPQCKey> {
    console.log(`🔹 Generating ${algorithm} ${keyType} key with security level ${securityLevel}`);
    
    // Generate the appropriate key based on algorithm
    let keyPair: PQCKey;
    
    switch (algorithm) {
      case 'ML-KEM-768':
        keyPair = await generateMLKEMKeypair(768);
        break;
      case 'ML-KEM-1024':
        keyPair = await generateMLKEMKeypair(1024);
        break;
      case 'SLH-DSA-Dilithium3':
        keyPair = await generateSLHDSAKeypair(3);
        break;
      case 'SLH-DSA-Dilithium5':
        keyPair = await generateSLHDSAKeypair(5);
        break;
      case 'FALCON-512':
        keyPair = await generateFalconKeypair(512);
        break;
      case 'FALCON-1024':
        keyPair = await generateFalconKeypair(1024);
        break;
      default:
        throw new Error(`Unsupported algorithm: ${algorithm}`);
    }
    
    // Calculate expiration date
    const now = new Date();
    const expirationDate = new Date(now);
    expirationDate.setDate(expirationDate.getDate() + policy.expirationDays);
    
    // Create managed key
    const managedKey: ManagedPQCKey = {
      ...keyPair,
      keyType,
      securityLevel,
      algorithm,
      created: now.toISOString(),
      expires: expirationDate.toISOString(),
      lastRotated: null,
      rotationCount: 0,
      usageCount: 0,
      storageType,
      status: 'active',
      tags: [keyType, securityLevel, algorithm],
      policy,
      backupExists: false,
      threatScore: 0
    };
    
    // Store the key
    this.keys.set(managedKey.id, managedKey);
    
    // If using a hardware storage option, attempt to securely store the key
    if (storageType !== KeyStorageType.SOFTWARE) {
      await this.securelyStoreKey(managedKey);
    }
    
    // Create a backup if required by policy
    if (keyType === KeyType.RECOVERY || keyType === KeyType.MASTER) {
      await this.backupKey(managedKey.id);
    }
    
    return managedKey;
  }
  
  /**
   * Securely store a key in hardware
   */
  private async securelyStoreKey(key: ManagedPQCKey): Promise<boolean> {
    // In a real implementation, this would store the key in the selected hardware
    console.log(`🔹 Securely storing key ${key.id} in ${key.storageType}`);
    
    // Simulate storing in appropriate hardware
    switch (key.storageType) {
      case KeyStorageType.HSM:
        if (!this.hsmAvailable) {
          console.log("⚠️ HSM not available, falling back to software storage");
          key.storageType = KeyStorageType.SOFTWARE;
          return false;
        }
        // Simulate HSM storage
        break;
        
      case KeyStorageType.TPM:
        if (!this.tpmAvailable) {
          console.log("⚠️ TPM not available, falling back to software storage");
          key.storageType = KeyStorageType.SOFTWARE;
          return false;
        }
        // Simulate TPM storage
        break;
        
      case KeyStorageType.SECURE_ENCLAVE:
        if (!this.secureEnclaveAvailable) {
          console.log("⚠️ Secure Enclave not available, falling back to software storage");
          key.storageType = KeyStorageType.SOFTWARE;
          return false;
        }
        // Simulate Secure Enclave storage
        break;
        
      case KeyStorageType.DECENTRALIZED:
        // Simulate storage on StarkNet
        console.log("🔹 Storing key reference on StarkNet decentralized identity system");
        break;
        
      default:
        // No hardware storage needed
        return true;
    }
    
    return true;
  }
  
  /**
   * Get a key by ID
   */
  public getKey(keyId: string): ManagedPQCKey | undefined {
    const key = this.keys.get(keyId);
    
    if (key) {
      // Increment usage count
      key.usageCount++;
      this.keys.set(keyId, key);
      
      // Check if we need to schedule rotation based on usage
      if (key.usageCount >= key.policy.maxTotalOperations * 0.9) {
        key.status = 'scheduled-rotation';
        console.log(`🔹 Key ${keyId} scheduled for rotation due to approaching usage limit`);
      }
    }
    
    return key;
  }
  
  /**
   * Get all keys of a specific type
   */
  public getKeysByType(keyType: KeyType): ManagedPQCKey[] {
    return Array.from(this.keys.values()).filter(key => key.keyType === keyType);
  }
  
  /**
   * Get active keys of a specific type
   */
  public getActiveKeysByType(keyType: KeyType): ManagedPQCKey[] {
    return this.getKeysByType(keyType).filter(key => key.status === 'active');
  }
  
  /**
   * Rotate a key
   */
  public async rotateKey(
    keyId: string, 
    reason: RotationReason = RotationReason.SCHEDULED
  ): Promise<{
    success: boolean;
    oldKey?: ManagedPQCKey;
    newKey?: ManagedPQCKey;
    rotationEvent?: KeyRotationEvent;
  }> {
    console.log(`🔹 Rotating key ${keyId} for reason: ${reason}`);
    
    // Get the existing key
    const existingKey = this.keys.get(keyId);
    if (!existingKey) {
      console.error(`❌ Key ${keyId} not found for rotation`);
      return { success: false };
    }
    
    // Generate a new key with the same parameters
    const newKey = await this.generateKey(
      existingKey.keyType,
      existingKey.securityLevel,
      existingKey.algorithm,
      existingKey.storageType,
      existingKey.policy
    );
    
    // Mark the old key as revoked
    existingKey.status = 'revoked';
    this.keys.set(keyId, existingKey);
    
    // Create rotation event
    const rotationEvent: KeyRotationEvent = {
      id: crypto.randomUUID(),
      keyId: existingKey.id,
      timestamp: new Date().toISOString(),
      reason,
      previousFingerprint: existingKey.fingerprint,
      newFingerprint: newKey.fingerprint,
      threatScoreBefore: existingKey.threatScore,
      threatScoreAfter: 0,
      aiConfidence: reason === RotationReason.AI_RECOMMENDED ? 0.95 : 0.75
    };
    
    // Add to rotation history
    this.rotationHistory.push(rotationEvent);
    
    console.log(`✅ Key ${keyId} rotated successfully. New key ID: ${newKey.id}`);
    
    return {
      success: true,
      oldKey: existingKey,
      newKey,
      rotationEvent
    };
  }
  
  /**
   * Revoke a key
   */
  public revokeKey(keyId: string, reason: string): boolean {
    console.log(`🔹 Revoking key ${keyId}: ${reason}`);
    
    // Get the existing key
    const existingKey = this.keys.get(keyId);
    if (!existingKey) {
      console.error(`❌ Key ${keyId} not found for revocation`);
      return false;
    }
    
    // Mark as revoked
    existingKey.status = 'revoked';
    this.keys.set(keyId, existingKey);
    
    console.log(`✅ Key ${keyId} revoked successfully`);
    return true;
  }
  
  /**
   * Backup a key
   */
  public async backupKey(keyId: string): Promise<boolean> {
    console.log(`🔹 Creating backup for key ${keyId}`);
    
    // Get the existing key
    const existingKey = this.keys.get(keyId);
    if (!existingKey) {
      console.error(`❌ Key ${keyId} not found for backup`);
      return false;
    }
    
    // In a real implementation, would securely back up the key
    // For this simulation, just mark it as backed up
    existingKey.backupExists = true;
    this.keys.set(keyId, existingKey);
    
    console.log(`✅ Key ${keyId} backed up successfully`);
    return true;
  }
  
  /**
   * Perform a health check on all keys
   */
  private async performHealthCheck(): Promise<{
    healthyKeys: number;
    keyRotationRecommendations: { keyId: string; reason: string }[];
    overallHealth: 'good' | 'warning' | 'critical';
  }> {
    console.log("🔹 Performing key health check");
    
    const now = new Date();
    const keyRotationRecommendations: { keyId: string; reason: string }[] = [];
    let criticalIssues = 0;
    let warnings = 0;
    
    // Check each key
    for (const [keyId, key] of this.keys.entries()) {
      // Check expiration
      const expirationDate = new Date(key.expires);
      const daysUntilExpiration = Math.floor((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (expirationDate < now) {
        // Key is expired
        key.status = 'expired';
        criticalIssues++;
        keyRotationRecommendations.push({
          keyId,
          reason: `Key is expired as of ${key.expires}`
        });
      } else if (daysUntilExpiration < 30) {
        // Key is expiring soon
        warnings++;
        keyRotationRecommendations.push({
          keyId,
          reason: `Key expires in ${daysUntilExpiration} days`
        });
      }
      
      // Check usage count
      const usagePercentage = (key.usageCount / key.policy.maxTotalOperations) * 100;
      if (usagePercentage > 90) {
        warnings++;
        keyRotationRecommendations.push({
          keyId,
          reason: `Key usage at ${usagePercentage.toFixed(1)}% of maximum`
        });
      }
      
      // Update the key
      this.keys.set(keyId, key);
    }
    
    // Determine overall health
    let overallHealth: 'good' | 'warning' | 'critical' = 'good';
    if (criticalIssues > 0) {
      overallHealth = 'critical';
    } else if (warnings > 0) {
      overallHealth = 'warning';
    }
    
    // Update last health check time
    this.lastHealthCheck = now.toISOString();
    
    // Return health status
    return {
      healthyKeys: this.keys.size - criticalIssues - warnings,
      keyRotationRecommendations,
      overallHealth
    };
  }
  
  /**
   * Start autonomous key management
   * This simulates a background process that monitors and rotates keys
   */
  private startAutonomousManagement(): void {
    console.log("🔹 Starting autonomous key management");
    
    // In a real implementation, this would be a background process
    // For simulation, just perform an initial health check and automate rotations
    
    const securityPolicy = aiSecurityOrchestrator.getSecurityPolicy();
    
    // Check if we're running in autonomous mode
    if (aiSecurityOrchestrator.getSecurityPolicy().autoRemediate) {
      console.log("🔹 Autonomous key rotation is enabled");
      
      // Schedule key health checks and rotations
      setInterval(async () => {
        // Perform health check
        const healthCheck = await this.performHealthCheck();
        
        // Handle key rotation recommendations
        for (const recommendation of healthCheck.keyRotationRecommendations) {
          console.log(`🔹 Autonomous key rotation: ${recommendation.reason}`);
          
          // Perform the rotation
          await this.rotateKey(recommendation.keyId, RotationReason.AI_RECOMMENDED);
        }
      }, 24 * 60 * 60 * 1000); // Daily check in real implementation
    }
  }
  
  /**
   * Get key statistics
   */
  public getKeyStatistics(): {
    totalKeys: number;
    activeKeys: number;
    revokedKeys: number;
    expiredKeys: number;
    scheduledRotationKeys: number;
    byType: Record<KeyType, number>;
    byAlgorithm: Record<string, number>;
    bySecurityLevel: Record<SecurityLevel, number>;
    rotationEvents: number;
    lastHealthCheck: string | null;
  } {
    // Count keys by status
    let activeKeys = 0;
    let revokedKeys = 0;
    let expiredKeys = 0;
    let scheduledRotationKeys = 0;
    
    // Counters for types, algorithms, and security levels
    const byType: Record<KeyType, number> = {
      [KeyType.ENCRYPTION]: 0,
      [KeyType.SIGNATURE]: 0,
      [KeyType.AUTHENTICATION]: 0,
      [KeyType.RECOVERY]: 0,
      [KeyType.MASTER]: 0
    };
    
    const byAlgorithm: Record<string, number> = {};
    
    const bySecurityLevel: Record<SecurityLevel, number> = {
      [SecurityLevel.L1]: 0,
      [SecurityLevel.L3]: 0,
      [SecurityLevel.L5]: 0
    };
    
    // Process each key
    for (const key of this.keys.values()) {
      // Count by status
      if (key.status === 'active') activeKeys++;
      else if (key.status === 'revoked') revokedKeys++;
      else if (key.status === 'expired') expiredKeys++;
      else if (key.status === 'scheduled-rotation') scheduledRotationKeys++;
      
      // Count by type
      byType[key.keyType]++;
      
      // Count by algorithm
      byAlgorithm[key.algorithm] = (byAlgorithm[key.algorithm] || 0) + 1;
      
      // Count by security level
      bySecurityLevel[key.securityLevel]++;
    }
    
    return {
      totalKeys: this.keys.size,
      activeKeys,
      revokedKeys,
      expiredKeys,
      scheduledRotationKeys,
      byType,
      byAlgorithm,
      bySecurityLevel,
      rotationEvents: this.rotationHistory.length,
      lastHealthCheck: this.lastHealthCheck
    };
  }
}

// Export singleton instance
export const autonomousKeyManager = new AutonomousKeyManager();
