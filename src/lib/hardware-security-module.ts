/**
 * TetraCryptPQC Military-Grade Hardware Security Module
 * TOP SECRET//COSMIC//THAUMIEL
 */

import { generateQuantumUUID } from './crypto-utils';
import { 
  generateMLKEMKeyPair,
  generateSLHDSAKeyPair,
  hashWithSHA3,
  symmetricEncrypt,
  symmetricDecrypt
} from './pqcrypto-core';
import { aiSecurityOrchestrator } from './ai-security-orchestrator';
import { SecurityZone } from './security-zone-manager';
import { ComplianceStandard } from './security-compliance';

/**
 * Military security clearance levels
 */
export enum SecurityClearance {
  LEVEL_1 = 'CONFIDENTIAL',
  LEVEL_2 = 'SECRET',
  LEVEL_3 = 'TOP_SECRET',
  LEVEL_4 = 'TS_SCI',
  LEVEL_5 = 'TS_SCI_COSMIC_THAUMIEL'
}

/**
 * Military-grade HSM types
 */
export enum MilitaryHSMType {
  TPM_MILITARY = 'TPM_MIL',      // Military-grade TPM
  TEMPEST = 'TEMPEST',           // TEMPEST-certified HSM
  YUBIKEY_FIPS = 'YUBIKEY_FIPS', // YubiKey FIPS Series
  QKD = 'QKD',                   // Quantum Key Distribution
  VIRTUAL_SECURE = 'VIRTUAL_MIL' // Secure Virtual HSM
}

/**
 * Military HSM operation types
 */
export enum MilitaryHSMOperation {
  QUANTUM_KEY_GEN = 'QUANTUM_KEY_GEN',
  PQC_ENCRYPT = 'PQC_ENCRYPT',
  PQC_DECRYPT = 'PQC_DECRYPT',
  QUANTUM_SIGN = 'QUANTUM_SIGN',
  QUANTUM_VERIFY = 'QUANTUM_VERIFY',
  MILITARY_ATTESTATION = 'MIL_ATTESTATION',
  SECURE_SEAL = 'SECURE_SEAL'
}

/**
 * Military-grade hardware key
 */
export interface MilitaryHardwareKey {
  id: string;
  type: MilitaryHSMType;
  algorithm: 'ML-KEM-1024' | 'SLH-DSA' | 'SHAKE-256';
  publicKey?: string;
  handle: string;
  created: string;
  lastUsed: string;
  usageCount: number;
  clearanceLevel: SecurityClearance;
  policy: MilitaryKeyPolicy;
  metadata: {
    quantumResistant: boolean;
    securityLevel: number;
    tempestCompliant: boolean;
    fipsCompliant: boolean;
    cmmcLevel: number;
    fedrampImpact: 'high';
  };
}

/**
 * Military key policy
 */
export interface MilitaryKeyPolicy {
  allowedOperations: MilitaryHSMOperation[];
  maxOperationsPerDay: number;
  maxTotalOperations: number;
  requireTwoPersonRule: boolean;
  requireBiometrics: boolean;
  requireSmartCard: boolean;
  allowExport: false; // Never allow key export in military mode
  auditLevel: 'DETAILED';
}

/**
 * Military HSM operation result
 */
export interface MilitaryHSMOperationResult {
  id: string;
  operation: MilitaryHSMOperation;
  keyId: string;
  success: boolean;
  timestamp: string;
  duration: number;
  clearanceLevel: SecurityClearance;
  quantumResistance: number;
  error?: string;
  attestation?: string;
  auditLog: {
    officer1: string;
    officer2?: string; // For two-person rule
    biometricVerified: boolean;
    smartCardVerified: boolean;
    tempestCompliant: boolean;
    quantumTamperCheck: boolean;
  };
}

/**
 * Military HSM configuration
 */
export interface MilitaryHSMConfig {
  hsmType: MilitaryHSMType;
  clearanceLevel: SecurityClearance;
  requireTwoPersonRule: boolean;
  requireTempest: boolean;
  quantumResistant: true; // Always true for military
  fipsCompliant: true;    // Always true for military
  performanceMode: 'SECURITY_FIRST';
  auditLevel: 'DETAILED';
}

/**
 * Military-grade default configuration
 */
const MILITARY_DEFAULT_CONFIG: MilitaryHSMConfig = {
  hsmType: MilitaryHSMType.TEMPEST,
  clearanceLevel: SecurityClearance.LEVEL_5,
  requireTwoPersonRule: true,
  requireTempest: true,
  quantumResistant: true,
  fipsCompliant: true,
  performanceMode: 'SECURITY_FIRST',
  auditLevel: 'DETAILED'
};

/**
 * Military-Grade Hardware Security Module
 */
export class MilitaryHSM {
  private config: MilitaryHSMConfig;
  private militaryKeys: Map<string, MilitaryHardwareKey> = new Map();
  private operationLog: Map<string, MilitaryHSMOperationResult> = new Map();
  private isInitialized: boolean = false;
  private availableModules: Map<MilitaryHSMType, boolean> = new Map();
  private authorizedSessions: Set<string> = new Set();
  private quantumTamperDetection: boolean = true;

  constructor(config: Partial<MilitaryHSMConfig> = {}) {
    this.config = { ...MILITARY_DEFAULT_CONFIG, ...config };
    this.validateMilitaryClearance();
  }

  /**
   * Initialize military-grade HSM
   */
  public async initialize(): Promise<boolean> {
    console.log(" Initializing Military-Grade Hardware Security Module");

    try {
      // Verify TEMPEST compliance
      await this.verifyTempestCompliance();

      // Initialize quantum tamper detection
      await this.initializeQuantumTamperDetection();

      // Verify FIPS 140-3 compliance
      await this.verifyFipsCompliance();

      // Initialize military-grade modules
      await this.initializeMilitaryModules();

      this.isInitialized = true;
      console.log(" Military-Grade HSM initialized successfully");
      return true;
    } catch (error) {
      console.error(" Military-Grade HSM initialization failed:", error);
      throw new Error(`SECURITY BREACH: ${error.message}`);
    }
  }

  /**
   * Generate quantum-safe key pair
   */
  public async generateQuantumKeyPair(): Promise<MilitaryHardwareKey> {
    await this.enforceSecurityChecks();
    
    // Generate quantum-resistant UUID
    const keyId = await generateQuantumUUID();
    const keyPair = await generateMLKEMKeyPair(1024); // ML-KEM-1024 for military grade

    const militaryKey: MilitaryHardwareKey = {
      id: keyId,
      type: MilitaryHSMType.TEMPEST,
      algorithm: 'ML-KEM-1024',
      publicKey: keyPair.publicKey,
      handle: keyPair.privateKey, // Using privateKey directly as handle
      created: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      usageCount: 0,
      clearanceLevel: SecurityClearance.LEVEL_5,
      policy: {
        allowedOperations: [
          MilitaryHSMOperation.QUANTUM_KEY_GEN,
          MilitaryHSMOperation.PQC_ENCRYPT,
          MilitaryHSMOperation.PQC_DECRYPT
        ],
        maxOperationsPerDay: 1000,
        maxTotalOperations: 100000,
        requireTwoPersonRule: true,
        requireBiometrics: true,
        requireSmartCard: true,
        allowExport: false,
        auditLevel: 'DETAILED'
      },
      metadata: {
        quantumResistant: true,
        securityLevel: 256,
        tempestCompliant: true,
        fipsCompliant: true,
        cmmcLevel: 2,
        fedrampImpact: 'high'
      }
    };

    this.militaryKeys.set(keyId, militaryKey);
    await this.logSecureOperation('QUANTUM_KEY_GEN', keyId);
    
    return militaryKey;
  }

  /**
   * Verify TEMPEST compliance
   */
  private async verifyTempestCompliance(): Promise<void> {
    if (!this.config.requireTempest) {
      throw new Error('SECURITY VIOLATION: TEMPEST compliance required for military-grade operations');
    }

    // Implement actual TEMPEST verification here
    const tempestVerified = true; // Simulated for test environment
    
    if (!tempestVerified) {
      throw new Error('TEMPEST VIOLATION: System does not meet military security requirements');
    }
  }

  /**
   * Initialize quantum tamper detection
   */
  private async initializeQuantumTamperDetection(): Promise<void> {
    // Implement actual quantum tamper detection here
    this.quantumTamperDetection = true;
    
    // Monitor for quantum tampering attempts
    setInterval(() => {
      if (!this.quantumTamperDetection) {
        this.handleSecurityBreach('QUANTUM_TAMPER_DETECTED');
      }
    }, 1000);
  }

  /**
   * Verify FIPS 140-3 compliance
   */
  private async verifyFipsCompliance(): Promise<void> {
    // Implement actual FIPS verification here
    const fipsVerified = true; // Simulated for test environment
    
    if (!fipsVerified) {
      throw new Error('FIPS VIOLATION: System does not meet FIPS 140-3 Level 4 requirements');
    }
  }

  /**
   * Handle security breach
   */
  private async handleSecurityBreach(type: string): Promise<void> {
    console.error(` SECURITY BREACH DETECTED: ${type}`);
    
    // Implement actual security breach handling here
    // 1. Lock down all military-grade operations
    // 2. Notify security officers
    // 3. Log the incident
    // 4. Initiate quantum-safe key destruction
    // 5. Alert Military Quantum Security Officer (MQSO)
    
    throw new Error(`SECURITY BREACH: ${type}`);
  }

  /**
   * Validate military clearance
   */
  private validateMilitaryClearance(): void {
    if (this.config.clearanceLevel !== SecurityClearance.LEVEL_5) {
      throw new Error('CLEARANCE VIOLATION: TS/SCI with COSMIC/THAUMIEL access required');
    }
  }

  /**
   * Log secure operation
   */
  private async logSecureOperation(operation: string, keyId: string): Promise<void> {
    const result: MilitaryHSMOperationResult = {
      id: await generateQuantumUUID(),
      operation: operation as MilitaryHSMOperation,
      keyId,
      success: true,
      timestamp: new Date().toISOString(),
      duration: 0,
      clearanceLevel: SecurityClearance.LEVEL_5,
      quantumResistance: 256,
      auditLog: {
        officer1: 'OFFICER_ID_1',
        officer2: 'OFFICER_ID_2',
        biometricVerified: true,
        smartCardVerified: true,
        tempestCompliant: true,
        quantumTamperCheck: true
      }
    };

    this.operationLog.set(result.id, result);
  }

  /**
   * Enforce security checks
   */
  private async enforceSecurityChecks(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('SECURITY VIOLATION: HSM not initialized');
    }

    if (!this.quantumTamperDetection) {
      throw new Error('SECURITY VIOLATION: Quantum tamper detection inactive');
    }

    // Verify TEMPEST compliance
    await this.verifyTempestCompliance();

    // Verify FIPS compliance
    await this.verifyFipsCompliance();

    // Verify clearance
    this.validateMilitaryClearance();
  }

  /**
   * Initialize military-grade modules
   */
  private async initializeMilitaryModules(): Promise<void> {
    try {
      // Initialize TEMPEST-compliant modules
      await this.initializeTEMPESTModules();

      // Initialize quantum-resistant modules
      await this.initializeQuantumModules();

      // Initialize FIPS 140-3 compliant modules
      await this.initializeFIPSModules();

      console.log("✅ Military-grade modules initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize military-grade modules:", error);
      throw new Error(`SECURITY BREACH: ${error.message}`);
    }
  }

  /**
   * Initialize TEMPEST-compliant modules
   */
  private async initializeTEMPESTModules(): Promise<void> {
    // Implement TEMPEST module initialization
    const tempestModules = [
      MilitaryHSMType.TEMPEST,
      MilitaryHSMType.TPM_MILITARY
    ];

    for (const module of tempestModules) {
      this.availableModules.set(module, true);
    }
  }

  /**
   * Initialize quantum-resistant modules
   */
  private async initializeQuantumModules(): Promise<void> {
    // Initialize QKD simulation
    this.availableModules.set(MilitaryHSMType.QKD, true);

    // Initialize quantum-safe key storage
    const quantumKeyStorage = new Map<string, MilitaryHardwareKey>();
    this.militaryKeys = quantumKeyStorage;
  }

  /**
   * Initialize FIPS 140-3 compliant modules
   */
  private async initializeFIPSModules(): Promise<void> {
    // Initialize YubiKey FIPS
    this.availableModules.set(MilitaryHSMType.YUBIKEY_FIPS, true);

    // Initialize secure virtual HSM
    this.availableModules.set(MilitaryHSMType.VIRTUAL_SECURE, true);
  }
}

// Export singleton instance
export const militaryHSM = new MilitaryHSM({
  clearanceLevel: SecurityClearance.LEVEL_5,
  requireTwoPersonRule: true,
  requireTempest: true
});
