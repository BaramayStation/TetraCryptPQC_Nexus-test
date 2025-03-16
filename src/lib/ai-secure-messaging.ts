/**
 * TetraCryptPQC AI-Secured Quantum-Safe Messaging
 * 
 * Implements a post-quantum secure messaging system with AI-driven security,
 * offline resilience, and zero-knowledge proofs for enterprise communication.
 */

import { AISecurityMode, PQCAlgorithmPreference, aiSecurityOrchestrator } from './ai-security-orchestrator';
import { SecurityZone } from './security-zone-manager';
import { generateMLKEMKeypair, generateFalconKeypair } from './pqcrypto';
import { StarkNetClient } from './starknet-client';
import { IPFSStorage } from './decentralized-storage';
import { PodmanContainer } from './podman-security';

// Message States
export enum MessageState {
  DRAFT = 'draft',
  SENDING = 'sending',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  OFFLINE_QUEUED = 'offline-queued'
}

// Message Types
export enum MessageType {
  DIRECT = 'direct',
  GROUP = 'group',
  BROADCAST = 'broadcast',
  SYSTEM = 'system',
  EMERGENCY = 'emergency'
}

// Message Priority
export enum MessagePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Secure Message Interface
 */
export interface SecureMessage {
  id: string;
  type: MessageType;
  priority: MessagePriority;
  sender: string;
  recipients: string[];
  content: string;
  encryptedContent: string;
  signature: string;
  timestamp: Date;
  state: MessageState;
  zone: SecurityZone;
  zkProof?: string;
  offlineStorage?: boolean;
  retryCount: number;
  expiresAt?: Date;
}

/**
 * Message System Configuration
 */
export interface MessageSystemConfig {
  mode: AISecurityMode;
  pqcPreference: PQCAlgorithmPreference;
  enableOfflineMode: boolean;
  enableP2P: boolean;
  enableZKProofs: boolean;
  maxRetries: number;
  messageExpiry: number;
  autoDeleteExpired: boolean;
  compressionEnabled: boolean;
  maxMessageSize: number;
  syncInterval: number;
}

/**
 * AI-Secured Messaging System
 */
export class AISecureMessaging {
  private config: MessageSystemConfig;
  private starkNet: StarkNetClient;
  private ipfs: IPFSStorage;
  private podman: PodmanContainer;
  private messageQueue: Map<string, SecureMessage>;
  private offlineQueue: Map<string, SecureMessage>;
  private encryptionKeys: Map<SecurityZone, { encryption: any, signing: any }>;
  private syncInterval: NodeJS.Timer | null;

  constructor(config: Partial<MessageSystemConfig> = {}) {
    this.config = {
      mode: AISecurityMode.AUTONOMOUS,
      pqcPreference: PQCAlgorithmPreference.DYNAMIC,
      enableOfflineMode: true,
      enableP2P: true,
      enableZKProofs: true,
      maxRetries: 3,
      messageExpiry: 7 * 24 * 60 * 60 * 1000, // 7 days
      autoDeleteExpired: true,
      compressionEnabled: true,
      maxMessageSize: 10 * 1024 * 1024, // 10MB
      syncInterval: 60 * 1000, // 1 minute
      ...config
    };

    this.messageQueue = new Map();
    this.offlineQueue = new Map();
    this.encryptionKeys = new Map();
    this.syncInterval = null;
  }

  /**
   * Initialize the messaging system
   */
  public async initialize(): Promise<boolean> {
    try {
      console.log("🔹 Initializing AI-Secured Messaging System");

      // Initialize StarkNet client
      this.starkNet = new StarkNetClient();
      await this.starkNet.initialize();

      // Initialize IPFS storage
      this.ipfs = new IPFSStorage();
      await this.ipfs.initialize();

      // Initialize Podman
      this.podman = new PodmanContainer();
      await this.podman.initialize();

      // Generate initial encryption keys
      await this.generateZoneKeys();

      // Start sync process if offline mode is enabled
      if (this.config.enableOfflineMode) {
        this.startSync();
      }

      console.log("✅ AI-Secured Messaging System initialized successfully");
      return true;
    } catch (error) {
      console.error("❌ Failed to initialize AI-Secured Messaging System:", error);
      return false;
    }
  }

  /**
   * Generate encryption keys for each security zone
   */
  private async generateZoneKeys(): Promise<void> {
    for (const zone of Object.values(SecurityZone)) {
      const encryptionKeys = await generateMLKEMKeypair();
      const signingKeys = await generateFalconKeypair();

      this.encryptionKeys.set(zone, {
        encryption: encryptionKeys,
        signing: signingKeys
      });
    }
  }

  /**
   * Send a secure message
   */
  public async sendMessage(
    content: string,
    recipients: string[],
    options: {
      type?: MessageType;
      priority?: MessagePriority;
      zone?: SecurityZone;
      expiresIn?: number;
    } = {}
  ): Promise<string> {
    const messageId = crypto.randomUUID();

    try {
      // Create message object
      const message: SecureMessage = {
        id: messageId,
        type: options.type || MessageType.DIRECT,
        priority: options.priority || MessagePriority.NORMAL,
        sender: await this.getCurrentUserId(),
        recipients,
        content,
        encryptedContent: '',
        signature: '',
        timestamp: new Date(),
        state: MessageState.DRAFT,
        zone: options.zone || SecurityZone.RESTRICTED,
        retryCount: 0,
        expiresAt: options.expiresIn ? new Date(Date.now() + options.expiresIn) : undefined
      };

      // Validate message
      await this.validateMessage(message);

      // Encrypt message content
      message.encryptedContent = await this.encryptMessage(message);

      // Sign message
      message.signature = await this.signMessage(message);

      // Generate zero-knowledge proof if enabled
      if (this.config.enableZKProofs) {
        message.zkProof = await this.generateMessageProof(message);
      }

      // Add to message queue
      this.messageQueue.set(messageId, message);

      // Attempt to send message
      await this.processMessage(message);

      return messageId;
    } catch (error) {
      console.error(`❌ Failed to send message ${messageId}:`, error);
      throw error;
    }
  }

  /**
   * Get current user ID
   */
  private async getCurrentUserId(): Promise<string> {
    return await this.starkNet.getCurrentUserId();
  }

  /**
   * Validate message before sending
   */
  private async validateMessage(message: SecureMessage): Promise<void> {
    // Check message size
    if (message.content.length > this.config.maxMessageSize) {
      throw new Error("Message exceeds maximum size limit");
    }

    // Validate recipients
    for (const recipient of message.recipients) {
      const valid = await this.starkNet.validateUserId(recipient);
      if (!valid) {
        throw new Error(`Invalid recipient: ${recipient}`);
      }
    }

    // Check security zone requirements
    const zoneValid = await aiSecurityOrchestrator.validateZoneAccess(
      message.sender,
      message.zone
    );
    if (!zoneValid) {
      throw new Error("Sender does not have required zone access");
    }
  }

  /**
   * Encrypt message content
   */
  private async encryptMessage(message: SecureMessage): Promise<string> {
    try {
      // Get zone encryption keys
      const keys = this.encryptionKeys.get(message.zone);
      if (!keys) {
        throw new Error("Encryption keys not found for zone");
      }

      // Compress content if enabled
      const processedContent = this.config.compressionEnabled
        ? await this.compressContent(message.content)
        : message.content;

      // Encrypt for each recipient
      const encryptedData = await Promise.all(
        message.recipients.map(async (recipient) => {
          const recipientKey = await this.starkNet.getPublicKey(recipient);
          return {
            recipient,
            content: await this.encryptForRecipient(processedContent, recipientKey)
          };
        })
      );

      return JSON.stringify(encryptedData);
    } catch (error) {
      console.error("Failed to encrypt message:", error);
      throw error;
    }
  }

  /**
   * Compress message content
   */
  private async compressContent(content: string): Promise<string> {
    // Implement compression logic
    return content; // Placeholder
  }

  /**
   * Encrypt content for a specific recipient
   */
  private async encryptForRecipient(content: string, recipientKey: string): Promise<string> {
    // Use ML-KEM for encryption
    const encryptedContent = await aiSecurityOrchestrator.encryptWithMLKEM(
      content,
      recipientKey
    );
    return encryptedContent;
  }

  /**
   * Sign message
   */
  private async signMessage(message: SecureMessage): Promise<string> {
    // Get zone signing keys
    const keys = this.encryptionKeys.get(message.zone);
    if (!keys) {
      throw new Error("Signing keys not found for zone");
    }

    // Create signature using Falcon
    return await aiSecurityOrchestrator.signWithFalcon(
      message.encryptedContent,
      keys.signing.privateKey
    );
  }

  /**
   * Generate zero-knowledge proof for message
   */
  private async generateMessageProof(message: SecureMessage): Promise<string> {
    return await this.starkNet.generateZKProof({
      sender: message.sender,
      recipients: message.recipients,
      timestamp: message.timestamp,
      zone: message.zone
    });
  }

  /**
   * Process a message for sending
   */
  private async processMessage(message: SecureMessage): Promise<void> {
    try {
      message.state = MessageState.SENDING;

      // Check network status
      const isOnline = await this.checkNetworkStatus();

      if (!isOnline && this.config.enableOfflineMode) {
        // Queue message for offline storage
        await this.queueOfflineMessage(message);
        return;
      }

      // Attempt to send message
      const sent = await this.deliverMessage(message);

      if (sent) {
        message.state = MessageState.DELIVERED;
        this.messageQueue.delete(message.id);
      } else {
        await this.handleFailedDelivery(message);
      }
    } catch (error) {
      console.error(`Failed to process message ${message.id}:`, error);
      await this.handleFailedDelivery(message);
    }
  }

  /**
   * Check network status
   */
  private async checkNetworkStatus(): Promise<boolean> {
    try {
      return await this.starkNet.checkConnection();
    } catch {
      return false;
    }
  }

  /**
   * Queue message for offline storage
   */
  private async queueOfflineMessage(message: SecureMessage): Promise<void> {
    message.state = MessageState.OFFLINE_QUEUED;
    message.offlineStorage = true;

    // Store in offline queue
    this.offlineQueue.set(message.id, message);

    // Store in local IPFS node
    if (this.config.enableP2P) {
      await this.ipfs.addMessage(message);
    }

    console.log(`📥 Message ${message.id} queued for offline delivery`);
  }

  /**
   * Deliver message to recipients
   */
  private async deliverMessage(message: SecureMessage): Promise<boolean> {
    try {
      // Use StarkNet for delivery
      const result = await this.starkNet.deliverMessage({
        id: message.id,
        encryptedContent: message.encryptedContent,
        signature: message.signature,
        zkProof: message.zkProof,
        recipients: message.recipients
      });

      return result.success;
    } catch (error) {
      console.error(`Failed to deliver message ${message.id}:`, error);
      return false;
    }
  }

  /**
   * Handle failed message delivery
   */
  private async handleFailedDelivery(message: SecureMessage): Promise<void> {
    message.retryCount++;

    if (message.retryCount >= this.config.maxRetries) {
      message.state = MessageState.FAILED;
      console.error(`❌ Message ${message.id} failed after ${message.retryCount} attempts`);
    } else {
      // Queue for retry
      setTimeout(async () => {
        await this.processMessage(message);
      }, Math.pow(2, message.retryCount) * 1000); // Exponential backoff
    }
  }

  /**
   * Start message sync process
   */
  private startSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      await this.syncMessages();
    }, this.config.syncInterval);
  }

  /**
   * Sync offline messages
   */
  private async syncMessages(): Promise<void> {
    if (this.offlineQueue.size === 0) return;

    const isOnline = await this.checkNetworkStatus();
    if (!isOnline) return;

    console.log("🔄 Syncing offline messages");

    for (const [messageId, message] of this.offlineQueue) {
      try {
        const delivered = await this.deliverMessage(message);
        if (delivered) {
          console.log(`✅ Offline message ${messageId} delivered successfully`);
          this.offlineQueue.delete(messageId);
        }
      } catch (error) {
        console.error(`Failed to sync offline message ${messageId}:`, error);
      }
    }
  }

  /**
   * Clean up expired messages
   */
  private async cleanupExpiredMessages(): Promise<void> {
    const now = Date.now();

    // Clean message queue
    for (const [messageId, message] of this.messageQueue) {
      if (message.expiresAt && message.expiresAt.getTime() < now) {
        this.messageQueue.delete(messageId);
      }
    }

    // Clean offline queue
    for (const [messageId, message] of this.offlineQueue) {
      if (message.expiresAt && message.expiresAt.getTime() < now) {
        this.offlineQueue.delete(messageId);
      }
    }
  }

  /**
   * Get messaging system status
   */
  public getStatus(): {
    queuedMessages: number;
    offlineMessages: number;
    failedMessages: number;
  } {
    const failed = Array.from(this.messageQueue.values())
      .filter(m => m.state === MessageState.FAILED).length;

    return {
      queuedMessages: this.messageQueue.size,
      offlineMessages: this.offlineQueue.size,
      failedMessages: failed
    };
  }
}

// Export singleton instance
export const aiSecureMessaging = new AISecureMessaging({});
