/**
 * TetraCryptPQC Secure Audit Logging System
 * 
 * Implements NIST 800-53 AU controls and DISA STIG requirements
 * for secure, tamper-evident audit logging with quantum resistance.
 */

import { SecurityZone } from './security-zone-manager';
import { HSMManager } from './hardware-security';
import { StarkNetClient } from './starknet-client';
import { IPFSStorage } from './decentralized-storage';
import { PodmanContainer } from './podman-security';
import { ComplianceStandard, SecurityLevel } from './security-compliance';

// Audit Event Types
export enum AuditEventType {
  // Security Events
  SECURITY_ALERT = 'security_alert',
  ACCESS_ATTEMPT = 'access_attempt',
  PERMISSION_CHANGE = 'permission_change',
  POLICY_CHANGE = 'policy_change',
  CRYPTO_OPERATION = 'crypto_operation',
  KEY_MANAGEMENT = 'key_management',
  
  // System Events
  SYSTEM_START = 'system_start',
  SYSTEM_STOP = 'system_stop',
  CONFIG_CHANGE = 'config_change',
  BACKUP_OPERATION = 'backup_operation',
  
  // User Events
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_CREATE = 'user_create',
  USER_MODIFY = 'user_modify',
  USER_DELETE = 'user_delete',
  
  // Data Events
  DATA_ACCESS = 'data_access',
  DATA_MODIFY = 'data_modify',
  DATA_DELETE = 'data_delete',
  DATA_TRANSFER = 'data_transfer',
  
  // Compliance Events
  COMPLIANCE_CHECK = 'compliance_check',
  COMPLIANCE_VIOLATION = 'compliance_violation',
  COMPLIANCE_REMEDIATION = 'compliance_remediation',
  
  // Network Events
  NETWORK_CONNECTION = 'network_connection',
  NETWORK_DISCONNECT = 'network_disconnect',
  NETWORK_ATTACK = 'network_attack',
  
  // Hardware Events
  HARDWARE_CHANGE = 'hardware_change',
  HSM_OPERATION = 'hsm_operation',
  TPM_OPERATION = 'tpm_operation'
}

// Audit Event Severity
export enum AuditSeverity {
  EMERGENCY = 'emergency',  // System unusable
  ALERT = 'alert',         // Immediate action required
  CRITICAL = 'critical',   // Critical conditions
  ERROR = 'error',         // Error conditions
  WARNING = 'warning',     // Warning conditions
  NOTICE = 'notice',       // Normal but significant
  INFO = 'info',          // Informational messages
  DEBUG = 'debug'         // Debug messages
}

// Audit Event Status
export enum AuditStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  DENIED = 'denied',
  ERROR = 'error',
  PENDING = 'pending'
}

/**
 * Audit Event Interface
 */
export interface AuditEvent {
  id: string;
  type: AuditEventType;
  severity: AuditSeverity;
  status: AuditStatus;
  timestamp: Date;
  source: {
    ip: string;
    user?: string;
    process?: string;
    component?: string;
  };
  target: {
    resource: string;
    action: string;
    zone: SecurityZone;
  };
  details: {
    description: string;
    metadata: { [key: string]: any };
    previousState?: any;
    newState?: any;
  };
  security: {
    hash: string;
    signature: string;
    certificate?: string;
    zkProof?: string;
  };
  compliance: {
    standards: ComplianceStandard[];
    controls: string[];
    violations?: string[];
  };
}

/**
 * Audit Log Configuration
 */
export interface AuditConfig {
  retentionPeriod: number;
  encryptLogs: boolean;
  signLogs: boolean;
  enableZKProofs: boolean;
  backupInterval: number;
  minSeverity: AuditSeverity;
  maxBatchSize: number;
  syncInterval: number;
  alertOnFailure: boolean;
}

/**
 * Secure Audit Logging System
 */
export class SecureAuditLog {
  private config: AuditConfig;
  private hsm: HSMManager;
  private starkNet: StarkNetClient;
  private ipfs: IPFSStorage;
  private podman: PodmanContainer;
  private eventQueue: AuditEvent[];
  private eventBatch: Map<string, AuditEvent[]>;
  private lastSync: Date;
  private syncTimer: NodeJS.Timer | null;
  private backupTimer: NodeJS.Timer | null;

  constructor(config: Partial<AuditConfig> = {}) {
    this.config = {
      retentionPeriod: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
      encryptLogs: true,
      signLogs: true,
      enableZKProofs: true,
      backupInterval: 24 * 60 * 60 * 1000, // 24 hours
      minSeverity: AuditSeverity.INFO,
      maxBatchSize: 1000,
      syncInterval: 5 * 60 * 1000, // 5 minutes
      alertOnFailure: true,
      ...config
    };

    this.eventQueue = [];
    this.eventBatch = new Map();
    this.lastSync = new Date();
    this.syncTimer = null;
    this.backupTimer = null;
  }

  /**
   * Initialize audit logging system
   */
  public async initialize(): Promise<boolean> {
    try {
      console.log("🔹 Initializing Secure Audit Logging System");

      // Initialize HSM
      this.hsm = new HSMManager();
      await this.hsm.initialize();

      // Initialize StarkNet
      this.starkNet = new StarkNetClient();
      await this.starkNet.initialize();

      // Initialize IPFS
      this.ipfs = new IPFSStorage();
      await this.ipfs.initialize();

      // Initialize Podman
      this.podman = new PodmanContainer();
      await this.podman.initialize();

      // Start sync and backup timers
      this.startSyncTimer();
      this.startBackupTimer();

      // Log system start
      await this.logSystemStart();

      console.log("✅ Secure Audit Logging System initialized successfully");
      return true;
    } catch (error) {
      console.error("❌ Failed to initialize Secure Audit Logging System:", error);
      return false;
    }
  }

  /**
   * Log system start
   */
  private async logSystemStart(): Promise<void> {
    await this.logEvent({
      type: AuditEventType.SYSTEM_START,
      severity: AuditSeverity.INFO,
      status: AuditStatus.SUCCESS,
      source: {
        component: 'SecureAuditLog'
      },
      target: {
        resource: 'system',
        action: 'start',
        zone: SecurityZone.SYSTEM
      },
      details: {
        description: 'Audit logging system started',
        metadata: {
          config: this.config
        }
      }
    });
  }

  /**
   * Log an audit event
   */
  public async logEvent(
    eventData: Partial<AuditEvent> & {
      type: AuditEventType;
      severity: AuditSeverity;
      source: Partial<AuditEvent['source']>;
      target: AuditEvent['target'];
      details: Partial<AuditEvent['details']>;
    }
  ): Promise<string> {
    try {
      // Check severity threshold
      if (!this.shouldLog(eventData.severity)) {
        return '';
      }

      // Create full audit event
      const event: AuditEvent = {
        id: crypto.randomUUID(),
        type: eventData.type,
        severity: eventData.severity,
        status: eventData.status || AuditStatus.SUCCESS,
        timestamp: new Date(),
        source: {
          ip: await this.getSourceIP(),
          ...eventData.source
        },
        target: eventData.target,
        details: {
          description: eventData.details.description || '',
          metadata: eventData.details.metadata || {},
          previousState: eventData.details.previousState,
          newState: eventData.details.newState
        },
        security: await this.generateSecurityMetadata(eventData),
        compliance: await this.getComplianceMetadata(eventData)
      };

      // Add to queue
      this.eventQueue.push(event);

      // Process queue if it reaches batch size
      if (this.eventQueue.length >= this.config.maxBatchSize) {
        await this.processBatch();
      }

      return event.id;
    } catch (error) {
      console.error("Failed to log audit event:", error);
      if (this.config.alertOnFailure) {
        await this.alertAuditFailure(error);
      }
      throw error;
    }
  }

  /**
   * Check if event should be logged based on severity
   */
  private shouldLog(severity: AuditSeverity): boolean {
    const severityLevels = {
      [AuditSeverity.EMERGENCY]: 0,
      [AuditSeverity.ALERT]: 1,
      [AuditSeverity.CRITICAL]: 2,
      [AuditSeverity.ERROR]: 3,
      [AuditSeverity.WARNING]: 4,
      [AuditSeverity.NOTICE]: 5,
      [AuditSeverity.INFO]: 6,
      [AuditSeverity.DEBUG]: 7
    };

    return severityLevels[severity] <= severityLevels[this.config.minSeverity];
  }

  /**
   * Get source IP address
   */
  private async getSourceIP(): Promise<string> {
    try {
      const networkInfo = await this.podman.getNetworkInfo();
      return networkInfo.ip;
    } catch {
      return '0.0.0.0';
    }
  }

  /**
   * Generate security metadata for event
   */
  private async generateSecurityMetadata(
    eventData: Partial<AuditEvent>
  ): Promise<AuditEvent['security']> {
    const metadata: AuditEvent['security'] = {
      hash: '',
      signature: '',
    };

    try {
      // Generate event hash
      metadata.hash = await this.hsm.hashData(JSON.stringify({
        type: eventData.type,
        timestamp: new Date(),
        source: eventData.source,
        target: eventData.target,
        details: eventData.details
      }));

      // Sign event
      if (this.config.signLogs) {
        metadata.signature = await this.hsm.signData(metadata.hash);
        metadata.certificate = await this.hsm.getCertificate();
      }

      // Generate zero-knowledge proof
      if (this.config.enableZKProofs) {
        metadata.zkProof = await this.generateEventProof(eventData);
      }

      return metadata;
    } catch (error) {
      console.error("Failed to generate security metadata:", error);
      return metadata;
    }
  }

  /**
   * Generate zero-knowledge proof for event
   */
  private async generateEventProof(
    eventData: Partial<AuditEvent>
  ): Promise<string> {
    return await this.starkNet.generateZKProof({
      type: 'audit_event',
      eventType: eventData.type,
      timestamp: new Date(),
      sourceHash: await this.hsm.hashData(JSON.stringify(eventData.source)),
      targetHash: await this.hsm.hashData(JSON.stringify(eventData.target))
    });
  }

  /**
   * Get compliance metadata for event
   */
  private async getComplianceMetadata(
    eventData: Partial<AuditEvent>
  ): Promise<AuditEvent['compliance']> {
    try {
      const compliance = await this.starkNet.getEventCompliance(eventData.type);
      return {
        standards: compliance.standards,
        controls: compliance.controls,
        violations: compliance.violations
      };
    } catch {
      return {
        standards: [],
        controls: []
      };
    }
  }

  /**
   * Process a batch of events
   */
  private async processBatch(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const batchId = crypto.randomUUID();
    const events = this.eventQueue.splice(0, this.config.maxBatchSize);

    try {
      // Store batch
      await this.storeBatch(batchId, events);

      // Add to batch map
      this.eventBatch.set(batchId, events);

      // Clean up old batches
      await this.cleanupOldBatches();
    } catch (error) {
      console.error(`Failed to process batch ${batchId}:`, error);
      
      // Return events to queue
      this.eventQueue.unshift(...events);
      
      if (this.config.alertOnFailure) {
        await this.alertAuditFailure(error);
      }
    }
  }

  /**
   * Store batch of events
   */
  private async storeBatch(batchId: string, events: AuditEvent[]): Promise<void> {
    // Encrypt batch if configured
    const batchData = this.config.encryptLogs
      ? await this.encryptBatch(events)
      : JSON.stringify(events);

    // Store in StarkNet
    await this.starkNet.storeAuditBatch(batchId, batchData);

    // Store backup in IPFS
    const cid = await this.ipfs.addAuditBatch(batchId, batchData);

    // Log batch storage
    await this.logEvent({
      type: AuditEventType.BACKUP_OPERATION,
      severity: AuditSeverity.INFO,
      source: {
        component: 'SecureAuditLog'
      },
      target: {
        resource: `batch:${batchId}`,
        action: 'store',
        zone: SecurityZone.SYSTEM
      },
      details: {
        description: 'Stored audit event batch',
        metadata: {
          batchId,
          eventCount: events.length,
          ipfsCid: cid
        }
      }
    });
  }

  /**
   * Encrypt batch of events
   */
  private async encryptBatch(events: AuditEvent[]): Promise<string> {
    const batchData = JSON.stringify(events);
    return await this.hsm.encryptData(batchData);
  }

  /**
   * Clean up old batches
   */
  private async cleanupOldBatches(): Promise<void> {
    const now = Date.now();
    const cutoff = now - this.config.retentionPeriod;

    for (const [batchId, events] of this.eventBatch) {
      if (events[0].timestamp.getTime() < cutoff) {
        this.eventBatch.delete(batchId);
      }
    }
  }

  /**
   * Start sync timer
   */
  private startSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(async () => {
      await this.syncEvents();
    }, this.config.syncInterval);
  }

  /**
   * Start backup timer
   */
  private startBackupTimer(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
    }

    this.backupTimer = setInterval(async () => {
      await this.backupEvents();
    }, this.config.backupInterval);
  }

  /**
   * Sync events to storage
   */
  private async syncEvents(): Promise<void> {
    try {
      await this.processBatch();
      this.lastSync = new Date();
    } catch (error) {
      console.error("Failed to sync events:", error);
      if (this.config.alertOnFailure) {
        await this.alertAuditFailure(error);
      }
    }
  }

  /**
   * Backup events
   */
  private async backupEvents(): Promise<void> {
    try {
      // Get all events since last backup
      const events = Array.from(this.eventBatch.values()).flat();
      if (events.length === 0) return;

      // Create backup
      const backupId = crypto.randomUUID();
      const backupData = this.config.encryptLogs
        ? await this.encryptBatch(events)
        : JSON.stringify(events);

      // Store backup
      const cid = await this.ipfs.addAuditBackup(backupId, backupData);

      // Log backup operation
      await this.logEvent({
        type: AuditEventType.BACKUP_OPERATION,
        severity: AuditSeverity.INFO,
        source: {
          component: 'SecureAuditLog'
        },
        target: {
          resource: `backup:${backupId}`,
          action: 'create',
          zone: SecurityZone.SYSTEM
        },
        details: {
          description: 'Created audit log backup',
          metadata: {
            backupId,
            eventCount: events.length,
            ipfsCid: cid
          }
        }
      });
    } catch (error) {
      console.error("Failed to backup events:", error);
      if (this.config.alertOnFailure) {
        await this.alertAuditFailure(error);
      }
    }
  }

  /**
   * Alert audit failure
   */
  private async alertAuditFailure(error: any): Promise<void> {
    const alert = {
      type: 'audit_failure',
      severity: AuditSeverity.ERROR,
      timestamp: new Date(),
      error: error.message || 'Unknown error',
      component: 'SecureAuditLog'
    };

    await this.starkNet.sendSecurityAlert(alert);
  }

  /**
   * Query audit logs
   */
  public async queryLogs(
    filters: {
      startTime?: Date;
      endTime?: Date;
      types?: AuditEventType[];
      severities?: AuditSeverity[];
      sources?: string[];
      targets?: string[];
      zones?: SecurityZone[];
    }
  ): Promise<AuditEvent[]> {
    try {
      // Get events from StarkNet
      const events = await this.starkNet.queryAuditLogs(filters);

      // Verify event integrity
      const verifiedEvents = await this.verifyEvents(events);

      return verifiedEvents;
    } catch (error) {
      console.error("Failed to query audit logs:", error);
      throw error;
    }
  }

  /**
   * Verify event integrity
   */
  private async verifyEvents(events: AuditEvent[]): Promise<AuditEvent[]> {
    const verifiedEvents: AuditEvent[] = [];

    for (const event of events) {
      try {
        // Verify hash
        const validHash = await this.verifyEventHash(event);
        if (!validHash) continue;

        // Verify signature
        if (event.security.signature) {
          const validSignature = await this.verifyEventSignature(event);
          if (!validSignature) continue;
        }

        // Verify zero-knowledge proof
        if (event.security.zkProof) {
          const validProof = await this.verifyEventProof(event);
          if (!validProof) continue;
        }

        verifiedEvents.push(event);
      } catch {
        continue;
      }
    }

    return verifiedEvents;
  }

  /**
   * Verify event hash
   */
  private async verifyEventHash(event: AuditEvent): Promise<boolean> {
    const computedHash = await this.hsm.hashData(JSON.stringify({
      type: event.type,
      timestamp: event.timestamp,
      source: event.source,
      target: event.target,
      details: event.details
    }));

    return computedHash === event.security.hash;
  }

  /**
   * Verify event signature
   */
  private async verifyEventSignature(event: AuditEvent): Promise<boolean> {
    return await this.hsm.verifySignature(
      event.security.hash,
      event.security.signature,
      event.security.certificate
    );
  }

  /**
   * Verify event proof
   */
  private async verifyEventProof(event: AuditEvent): Promise<boolean> {
    return await this.starkNet.verifyZKProof(event.security.zkProof);
  }

  /**
   * Get audit system status
   */
  public getStatus(): {
    queuedEvents: number;
    batchedEvents: number;
    lastSync: Date;
    storageUsage: number;
  } {
    return {
      queuedEvents: this.eventQueue.length,
      batchedEvents: Array.from(this.eventBatch.values())
        .reduce((sum, events) => sum + events.length, 0),
      lastSync: this.lastSync,
      storageUsage: this.calculateStorageUsage()
    };
  }

  /**
   * Calculate storage usage
   */
  private calculateStorageUsage(): number {
    let size = 0;
    
    // Add queued events size
    size += JSON.stringify(this.eventQueue).length;

    // Add batched events size
    for (const events of this.eventBatch.values()) {
      size += JSON.stringify(events).length;
    }

    return size;
  }
}

// Export singleton instance
export const secureAuditLog = new SecureAuditLog({});
