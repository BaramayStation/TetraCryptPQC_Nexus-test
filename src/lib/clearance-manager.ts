/**
 * Baramay Station Clearance Management System
 * 
 * Manages security clearances and access permissions:
 * - Public Zone: Basic identity verification
 * - Restricted Zone: NDA-signed researchers
 * - Classified Zone: Government/military personnel
 * - Ultra-Classified Zone: Top-tier quantum security clearance
 */

import { v4 as uuidv4 } from 'uuid';
import { SecurityZone } from './security-zone-manager';
import { CredentialType } from './security-zone-manager';
import { ComplianceStandard } from './security-protocols';
import { aiSecurityOrchestrator } from './ai-security-orchestrator';
import { 
  signData,
  verifySignature,
  generateSLHDSAKeyPair
} from './pqcrypto-core';

/**
 * Clearance level
 */
export enum ClearanceLevel {
  PUBLIC = 'PUBLIC',
  RESTRICTED = 'RESTRICTED',
  CLASSIFIED = 'CLASSIFIED',
  ULTRA_CLASSIFIED = 'ULTRA_CLASSIFIED'
}

/**
 * Clearance status
 */
export interface ClearanceStatus {
  clearanceId: string;
  userId: string;
  level: ClearanceLevel;
  issuedAt: string;
  expiresAt: string;
  issuedBy: string;
  verificationHash: string;
  credentials: CredentialType[];
  ndaStatus: boolean;
  securityTraining: SecurityTraining[];
  backgroundChecks: BackgroundCheck[];
  restrictions: ClearanceRestriction[];
  revoked: boolean;
  revokedAt?: string;
  revokedBy?: string;
  revokedReason?: string;
}

/**
 * Security training
 */
export interface SecurityTraining {
  trainingId: string;
  type: TrainingType;
  completedAt: string;
  expiresAt: string;
  score: number;
  verified: boolean;
}

/**
 * Training types
 */
export enum TrainingType {
  BASIC_SECURITY = 'BASIC_SECURITY',
  CLASSIFIED_HANDLING = 'CLASSIFIED_HANDLING',
  QUANTUM_SECURITY = 'QUANTUM_SECURITY',
  COUNTERINTELLIGENCE = 'COUNTERINTELLIGENCE',
  INCIDENT_RESPONSE = 'INCIDENT_RESPONSE'
}

/**
 * Background check
 */
export interface BackgroundCheck {
  checkId: string;
  type: BackgroundCheckType;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  completedAt?: string;
  expiresAt?: string;
  level: 'BASIC' | 'ENHANCED' | 'FULL';
  findings: string[];
}

/**
 * Background check types
 */
export enum BackgroundCheckType {
  IDENTITY = 'IDENTITY',
  CRIMINAL = 'CRIMINAL',
  FINANCIAL = 'FINANCIAL',
  EMPLOYMENT = 'EMPLOYMENT',
  SECURITY = 'SECURITY'
}

/**
 * Clearance restriction
 */
export interface ClearanceRestriction {
  restrictionId: string;
  type: RestrictionType;
  description: string;
  appliedAt: string;
  appliedBy: string;
  expiresAt?: string;
  active: boolean;
}

/**
 * Restriction types
 */
export enum RestrictionType {
  TIME_BASED = 'TIME_BASED',
  LOCATION_BASED = 'LOCATION_BASED',
  PROJECT_BASED = 'PROJECT_BASED',
  SYSTEM_BASED = 'SYSTEM_BASED'
}

/**
 * Clearance request
 */
export interface ClearanceRequest {
  requestId: string;
  userId: string;
  requestedLevel: ClearanceLevel;
  requestedAt: string;
  justification: string;
  sponsorId?: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'CANCELLED';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

/**
 * Clearance Manager
 */
export class ClearanceManager {
  private clearances: Map<string, ClearanceStatus> = new Map();
  private requests: Map<string, ClearanceRequest> = new Map();
  private userClearances: Map<string, string[]> = new Map();
  
  // Quantum-resistant signing keys for clearance verification
  private keyPair: {
    publicKey: string;
    privateKey: string;
  };
  
  constructor() {
    this.initializeKeyPair();
  }
  
  /**
   * Initialize quantum-resistant signing keys
   */
  private async initializeKeyPair(): Promise<void> {
    console.log("🔹 Initializing quantum-resistant signing keys for clearance management");
    this.keyPair = await generateSLHDSAKeyPair(5);
  }
  
  /**
   * Request new clearance
   */
  public async requestClearance(
    userId: string,
    requestedLevel: ClearanceLevel,
    justification: string,
    sponsorId?: string
  ): Promise<ClearanceRequest> {
    console.log(`🔹 Processing clearance request for ${requestedLevel}`);
    
    // Create request
    const request: ClearanceRequest = {
      requestId: uuidv4(),
      userId,
      requestedLevel,
      requestedAt: new Date().toISOString(),
      justification,
      sponsorId,
      status: 'PENDING'
    };
    
    // Store request
    this.requests.set(request.requestId, request);
    
    // Trigger AI analysis
    await this.analyzeClearanceRequest(request);
    
    return request;
  }
  
  /**
   * Analyze clearance request
   * @private
   */
  private async analyzeClearanceRequest(
    request: ClearanceRequest
  ): Promise<void> {
    // Get AI risk assessment
    const riskAssessment = await aiSecurityOrchestrator.assessClearanceRisk({
      userId: request.userId,
      requestedLevel: request.requestedLevel,
      justification: request.justification,
      sponsorId: request.sponsorId
    });
    
    // Auto-deny if risk is too high
    if (riskAssessment.riskScore > 0.8) {
      await this.denyRequest(
        request.requestId,
        'SYSTEM',
        'High risk score detected by AI analysis'
      );
    }
  }
  
  /**
   * Issue clearance
   */
  public async issueClearance(
    userId: string,
    level: ClearanceLevel,
    issuedBy: string,
    credentials: CredentialType[],
    ndaStatus: boolean,
    validityDays: number
  ): Promise<ClearanceStatus> {
    console.log(`🔹 Issuing ${level} clearance to user ${userId}`);
    
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + validityDays * 86400000);
      
      // Create clearance
      const clearance: ClearanceStatus = {
        clearanceId: uuidv4(),
        userId,
        level,
        issuedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        issuedBy,
        verificationHash: await this.generateVerificationHash(userId, level),
        credentials,
        ndaStatus,
        securityTraining: [],
        backgroundChecks: [],
        restrictions: [],
        revoked: false
      };
      
      // Store clearance
      this.clearances.set(clearance.clearanceId, clearance);
      
      // Update user clearances
      const userClearanceIds = this.userClearances.get(userId) || [];
      userClearanceIds.push(clearance.clearanceId);
      this.userClearances.set(userId, userClearanceIds);
      
      return clearance;
    } catch (error) {
      console.error("❌ Failed to issue clearance:", error);
      throw new Error("Clearance issuance failed");
    }
  }
  
  /**
   * Generate verification hash
   * @private
   */
  private async generateVerificationHash(
    userId: string,
    level: ClearanceLevel
  ): Promise<string> {
    const data = `${userId}-${level}-${Date.now()}`;
    return await signData(data, this.keyPair.privateKey);
  }
  
  /**
   * Verify clearance
   */
  public async verifyClearance(
    userId: string,
    requiredLevel: ClearanceLevel
  ): Promise<boolean> {
    console.log(`🔹 Verifying ${requiredLevel} clearance for user ${userId}`);
    
    try {
      // Get user's clearances
      const clearanceIds = this.userClearances.get(userId) || [];
      
      for (const id of clearanceIds) {
        const clearance = this.clearances.get(id);
        if (!clearance) continue;
        
        // Check if clearance is valid
        if (await this.isClearanceValid(clearance, requiredLevel)) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error("❌ Clearance verification failed:", error);
      return false;
    }
  }
  
  /**
   * Check if clearance is valid
   * @private
   */
  private async isClearanceValid(
    clearance: ClearanceStatus,
    requiredLevel: ClearanceLevel
  ): Promise<boolean> {
    // Check if revoked
    if (clearance.revoked) {
      return false;
    }
    
    // Check expiration
    if (new Date() > new Date(clearance.expiresAt)) {
      return false;
    }
    
    // Check level
    if (!this.isLevelSufficient(clearance.level, requiredLevel)) {
      return false;
    }
    
    // Verify hash
    const hashValid = await verifySignature(
      clearance.verificationHash,
      this.keyPair.publicKey
    );
    
    if (!hashValid) {
      return false;
    }
    
    // Check active restrictions
    const activeRestrictions = clearance.restrictions.filter(r => r.active);
    if (activeRestrictions.length > 0) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Check if clearance level is sufficient
   * @private
   */
  private isLevelSufficient(
    userLevel: ClearanceLevel,
    requiredLevel: ClearanceLevel
  ): boolean {
    const levels = {
      [ClearanceLevel.PUBLIC]: 0,
      [ClearanceLevel.RESTRICTED]: 1,
      [ClearanceLevel.CLASSIFIED]: 2,
      [ClearanceLevel.ULTRA_CLASSIFIED]: 3
    };
    
    return levels[userLevel] >= levels[requiredLevel];
  }
  
  /**
   * Add security training
   */
  public async addSecurityTraining(
    clearanceId: string,
    training: SecurityTraining
  ): Promise<void> {
    const clearance = this.clearances.get(clearanceId);
    if (!clearance) {
      throw new Error("Clearance not found");
    }
    
    clearance.securityTraining.push(training);
    this.clearances.set(clearanceId, clearance);
  }
  
  /**
   * Add background check
   */
  public async addBackgroundCheck(
    clearanceId: string,
    check: BackgroundCheck
  ): Promise<void> {
    const clearance = this.clearances.get(clearanceId);
    if (!clearance) {
      throw new Error("Clearance not found");
    }
    
    clearance.backgroundChecks.push(check);
    this.clearances.set(clearanceId, clearance);
  }
  
  /**
   * Add clearance restriction
   */
  public async addRestriction(
    clearanceId: string,
    restriction: ClearanceRestriction
  ): Promise<void> {
    const clearance = this.clearances.get(clearanceId);
    if (!clearance) {
      throw new Error("Clearance not found");
    }
    
    clearance.restrictions.push(restriction);
    this.clearances.set(clearanceId, clearance);
  }
  
  /**
   * Revoke clearance
   */
  public async revokeClearance(
    clearanceId: string,
    revokedBy: string,
    reason: string
  ): Promise<void> {
    console.log(`🔹 Revoking clearance ${clearanceId}`);
    
    const clearance = this.clearances.get(clearanceId);
    if (!clearance) {
      throw new Error("Clearance not found");
    }
    
    // Update clearance
    clearance.revoked = true;
    clearance.revokedAt = new Date().toISOString();
    clearance.revokedBy = revokedBy;
    clearance.revokedReason = reason;
    
    this.clearances.set(clearanceId, clearance);
    
    // Notify AI orchestrator
    await aiSecurityOrchestrator.handleClearanceRevocation({
      userId: clearance.userId,
      clearanceId,
      level: clearance.level,
      reason
    });
  }
  
  /**
   * Approve clearance request
   */
  public async approveRequest(
    requestId: string,
    reviewedBy: string,
    notes?: string
  ): Promise<void> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error("Request not found");
    }
    
    request.status = 'APPROVED';
    request.reviewedBy = reviewedBy;
    request.reviewedAt = new Date().toISOString();
    request.reviewNotes = notes;
    
    this.requests.set(requestId, request);
  }
  
  /**
   * Deny clearance request
   */
  public async denyRequest(
    requestId: string,
    reviewedBy: string,
    notes?: string
  ): Promise<void> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error("Request not found");
    }
    
    request.status = 'DENIED';
    request.reviewedBy = reviewedBy;
    request.reviewedAt = new Date().toISOString();
    request.reviewNotes = notes;
    
    this.requests.set(requestId, request);
  }
  
  /**
   * Get clearance status
   */
  public getClearanceStatus(clearanceId: string): ClearanceStatus | undefined {
    return this.clearances.get(clearanceId);
  }
  
  /**
   * Get request status
   */
  public getRequestStatus(requestId: string): ClearanceRequest | undefined {
    return this.requests.get(requestId);
  }
  
  /**
   * Get user clearances
   */
  public getUserClearances(userId: string): ClearanceStatus[] {
    const clearanceIds = this.userClearances.get(userId) || [];
    return clearanceIds
      .map(id => this.clearances.get(id))
      .filter((c): c is ClearanceStatus => c !== undefined);
  }
}

// Export singleton instance
export const clearanceManager = new ClearanceManager();
