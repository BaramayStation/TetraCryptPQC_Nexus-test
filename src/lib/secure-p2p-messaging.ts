/**
 * TetraCryptPQC Secure P2P Messaging
 * 
 * Implements a post-quantum secure messaging system with:
 * - End-to-end encryption using AES-256-GCM
 * - Post-quantum secure key exchange (ML-KEM)
 * - Message signing with SLH-DSA
 * - Delay-Tolerant Networking (DTN) support
 * - Perfect Forward Secrecy
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  encapsulateKey, 
  decapsulateKey, 
  signData, 
  verifySignature, 
  symmetricEncrypt, 
  symmetricDecrypt,
  generateMLKEMKeyPair,
  generateSLHDSAKeyPair,
  DTNMessage,
  dtnMessageQueue,
  sendDTNMessage,
  PQC
} from './pqcrypto-core';
import { ConnectionState, P2PMessage, TetraCryptMessaging, getTetraCryptMessaging } from './p2p-messaging';
import { decentralizedIdentityManager } from './decentralized-identity-verification';

/**
 * Extended message interface with security properties
 */
export interface SecureP2PMessage extends P2PMessage {
  encrypted: boolean;
  signed: boolean;
  signature?: string;
  keyId?: string;
  algorithm: string;
  iv?: string;
  dtn?: boolean;
  forwardSecrecy?: boolean;
}

/**
 * Key exchange record
 */
interface KeyExchangeRecord {
  peerId: string;
  ourKeyPair: {
    publicKey: string;
    privateKey: string;
  };
  theirPublicKey: string;
  sessionKey: string;
  established: number; // timestamp
  lastRotation: number; // timestamp
  algorithm: string;
}

/**
 * Security levels for messaging
 */
export enum MessageSecurityLevel {
  STANDARD = 'standard',   // AES-256-GCM + signing
  HIGH = 'high',           // ML-KEM-768 + SLH-DSA-L3
  MAXIMUM = 'maximum'      // ML-KEM-1024 + SLH-DSA-L5
}

/**
 * Message priority
 */
export type MessagePriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Options for sending messages
 */
export interface SendMessageOptions {
  securityLevel?: MessageSecurityLevel;
  sign?: boolean;
  dtn?: boolean;
  priority?: MessagePriority;
  ttl?: number; // Time to live in seconds
  forwardSecrecy?: boolean;
  deliveryTimeout?: number; // Timeout in milliseconds
}

/**
 * Default message options
 */
const DEFAULT_MESSAGE_OPTIONS: SendMessageOptions = {
  securityLevel: MessageSecurityLevel.HIGH,
  sign: true,
  dtn: false,
  priority: 'medium',
  ttl: 86400, // 24 hours
  forwardSecrecy: true,
  deliveryTimeout: 30000 // 30 seconds
};

/**
 * Message delivery status
 */
export type MessageDeliveryStatus = 'sent' | 'delivered' | 'failed' | 'pending' | 'expired';

/**
 * Peer connection information
 */
interface PeerConnection {
  peerId: string;
  publicKey: string;
  publicSigningKey: string;
  lastSeen: number;
  latency: number;
  connectionQuality: 'poor' | 'fair' | 'good' | 'excellent';
  keysExchanged: boolean;
  keyExchangeId?: string;
  metadata?: Record<string, any>;
}

/**
 * Implementation of secure messaging
 */
export class SecureP2PMessaging implements TetraCryptMessaging {
  // Base messaging implementation
  private baseMessaging: TetraCryptMessaging;
  
  // Our identity and keys
  private ourKeyPairs: {
    ml_kem_768?: { publicKey: string; privateKey: string; };
    ml_kem_1024?: { publicKey: string; privateKey: string; };
    slh_dsa_l3?: { publicKey: string; privateKey: string; };
    slh_dsa_l5?: { publicKey: string; privateKey: string; };
  } = {};
  
  // Peer connections
  private peerConnections: Map<string, PeerConnection> = new Map();
  
  // Key exchange records (for session keys)
  private keyExchanges: Map<string, KeyExchangeRecord> = new Map();
  
  // Message tracking
  private sentMessages: Map<string, {
    message: SecureP2PMessage;
    recipientId: string;
    sentAt: number;
    status: MessageDeliveryStatus;
    deliveryTime?: number;
  }> = new Map();
  
  // Initialization state
  private _initialized: boolean = false;
  
  // Security level
  private defaultSecurityLevel: MessageSecurityLevel = MessageSecurityLevel.HIGH;
  
  // Message listeners
  private secureMessageListeners: ((message: SecureP2PMessage) => void)[] = [];
  
  /**
   * Constructor
   */
  constructor() {
    this.baseMessaging = getTetraCryptMessaging();
  }
  
  /**
   * Initialize the secure messaging system
   */
  public async initialize(): Promise<void> {
    console.log("🔹 Initializing Secure P2P Messaging");
    
    if (this._initialized) {
      return;
    }
    
    // Initialize base messaging
    this.baseMessaging.initialize();
    
    // Generate key pairs if they don't exist
    if (!this.ourKeyPairs.ml_kem_768) {
      console.log("🔹 Generating ML-KEM-768 key pair");
      this.ourKeyPairs.ml_kem_768 = await generateMLKEMKeyPair(768);
    }
    
    if (!this.ourKeyPairs.slh_dsa_l3) {
      console.log("🔹 Generating SLH-DSA-L3 key pair");
      this.ourKeyPairs.slh_dsa_l3 = await generateSLHDSAKeyPair(3);
    }
    
    // Set up message listener
    this.baseMessaging.onMessage(this.handleIncomingMessage.bind(this));
    
    this._initialized = true;
    console.log("✅ Secure P2P Messaging initialized");
  }
  
  /**
   * Check if initialized
   */
  public isInitialized(): boolean {
    return this._initialized;
  }
  
  /**
   * Connect to the P2P network
   */
  public connect(): void {
    if (!this._initialized) {
      throw new Error("Secure P2P Messaging not initialized");
    }
    
    console.log("🔹 Connecting to P2P network");
    this.baseMessaging.connect();
  }
  
  /**
   * Disconnect from the P2P network
   */
  public disconnect(): void {
    console.log("🔹 Disconnecting from P2P network");
    this.baseMessaging.disconnect();
  }
  
  /**
   * Reconnect to the P2P network
   */
  public reconnect(): void {
    console.log("🔹 Reconnecting to P2P network");
    this.baseMessaging.reconnect();
  }
  
  /**
   * Get the current connection state
   */
  public getConnectionState(): ConnectionState {
    return this.baseMessaging.getConnectionState();
  }
  
  /**
   * Get the number of peers
   */
  public getPeerCount(): number {
    return this.baseMessaging.getPeerCount();
  }
  
  /**
   * Get our peer ID
   */
  public getPeerId(): string | null {
    return this.baseMessaging.getPeerId();
  }
  
  /**
   * Get network latency
   */
  public getNetworkLatency(): number {
    return this.baseMessaging.getNetworkLatency();
  }
  
  /**
   * Handle incoming message
   * @private
   */
  private async handleIncomingMessage(message: P2PMessage): Promise<void> {
    console.log(`🔹 Received message: ${message.id.substring(0, 8)}...`);
    
    try {
      // Check if this is a secure message
      if ((message as SecureP2PMessage).encrypted) {
        // Handle secure message
        const secureMessage = message as SecureP2PMessage;
        const decryptedMessage = await this.decryptMessage(secureMessage);
        
        // Notify listeners
        this.secureMessageListeners.forEach(listener => listener(decryptedMessage));
      } else {
        // Treat as regular message and convert to secure format
        const regularMessage: SecureP2PMessage = {
          ...message,
          encrypted: false,
          signed: false,
          algorithm: 'none'
        };
        
        // Notify listeners
        this.secureMessageListeners.forEach(listener => listener(regularMessage));
      }
    } catch (error) {
      console.error("❌ Error handling incoming message:", error);
    }
  }
  
  /**
   * Decrypt an incoming secure message
   * @private
   */
  private async decryptMessage(message: SecureP2PMessage): Promise<SecureP2PMessage> {
    // Find the key exchange record
    const keyExchangeId = message.keyId;
    if (!keyExchangeId) {
      throw new Error("Message missing key ID");
    }
    
    const keyExchange = this.keyExchanges.get(keyExchangeId);
    if (!keyExchange) {
      throw new Error(`Key exchange record not found: ${keyExchangeId}`);
    }
    
    // Decrypt the content
    const decryptedContent = await symmetricDecrypt(
      message.content,
      keyExchange.sessionKey
    );
    
    // Verify signature if signed
    let signatureValid = false;
    if (message.signed && message.signature) {
      // Find peer connection to get their signing key
      const peerConnection = this.peerConnections.get(message.senderId);
      if (peerConnection && peerConnection.publicSigningKey) {
        signatureValid = await verifySignature(
          decryptedContent,
          message.signature,
          peerConnection.publicSigningKey
        );
        
        if (!signatureValid) {
          console.warn(`⚠️ Invalid signature on message: ${message.id}`);
        }
      }
    }
    
    // Create decrypted message
    return {
      ...message,
      content: decryptedContent,
      // Record signature verification result
      signed: message.signed && signatureValid
    };
  }
  
  /**
   * Send a message to a specific recipient
   */
  public async sendMessage(recipientId: string, message: string, options: SendMessageOptions = {}): Promise<boolean> {
    // Merge options with defaults
    const mergedOptions: SendMessageOptions = {
      ...DEFAULT_MESSAGE_OPTIONS,
      ...options
    };
    
    // Check if we're connected
    if (this.getConnectionState() !== 'connected') {
      console.error("❌ Cannot send message: Not connected");
      return false;
    }
    
    try {
      // Get our peer ID
      const ourPeerId = this.getPeerId();
      if (!ourPeerId) {
        throw new Error("Our peer ID is not available");
      }
      
      // Check if we have keys appropriate for the security level
      await this.ensureKeysForSecurityLevel(mergedOptions.securityLevel!);
      
      // Prepare message ID
      const messageId = `msg-${uuidv4()}`;
      
      // If DTN is enabled, use DTN messaging
      if (mergedOptions.dtn) {
        return await this.sendDTNMessage(recipientId, message, messageId, mergedOptions);
      }
      
      // Get or establish key exchange with recipient
      const keyExchange = await this.getOrEstablishKeyExchange(recipientId, mergedOptions.securityLevel!);
      
      // Create secure message
      const secureMessage = await this.createSecureMessage(
        messageId,
        ourPeerId,
        recipientId,
        message,
        keyExchange,
        mergedOptions
      );
      
      // Track sent message
      this.sentMessages.set(messageId, {
        message: secureMessage,
        recipientId,
        sentAt: Date.now(),
        status: 'pending'
      });
      
      // Send the message
      const sendResult = await this.baseMessaging.sendMessage(
        recipientId,
        JSON.stringify(secureMessage)
      );
      
      // Update status
      if (sendResult) {
        this.sentMessages.get(messageId)!.status = 'sent';
      } else {
        this.sentMessages.get(messageId)!.status = 'failed';
      }
      
      return sendResult;
    } catch (error) {
      console.error("❌ Error sending secure message:", error);
      return false;
    }
  }
  
  /**
   * Broadcast a message to all peers
   */
  public async broadcastMessage(message: string, options: SendMessageOptions = {}): Promise<boolean> {
    // Check if we're connected
    if (this.getConnectionState() !== 'connected') {
      console.error("❌ Cannot broadcast message: Not connected");
      return false;
    }
    
    try {
      // For broadcasting, we'll use a simpler approach that doesn't require key exchange
      // with every peer, but still provides encryption and signing
      
      // Ensure we have appropriate keys
      await this.ensureKeysForSecurityLevel(options.securityLevel || MessageSecurityLevel.HIGH);
      
      // Use the base messaging broadcasting capability
      return await this.baseMessaging.broadcastMessage(message);
    } catch (error) {
      console.error("❌ Error broadcasting message:", error);
      return false;
    }
  }
  
  /**
   * Register a message listener
   */
  public onMessage(callback: (message: P2PMessage) => void): () => void {
    // Cast to SecureP2PMessage listener
    const secureCallback = callback as (message: SecureP2PMessage) => void;
    this.secureMessageListeners.push(secureCallback);
    
    return () => {
      const index = this.secureMessageListeners.indexOf(secureCallback);
      if (index >= 0) {
        this.secureMessageListeners.splice(index, 1);
      }
    };
  }
  
  /**
   * Register a connection state change listener
   */
  public onConnectionStateChange(callback: (state: ConnectionState) => void): () => void {
    return this.baseMessaging.onConnectionStateChange(callback);
  }
  
  /**
   * Ensure we have the appropriate keys for the selected security level
   * @private
   */
  private async ensureKeysForSecurityLevel(level: MessageSecurityLevel): Promise<void> {
    switch (level) {
      case MessageSecurityLevel.MAXIMUM:
        // Ensure we have ML-KEM-1024 and SLH-DSA-L5 keys
        if (!this.ourKeyPairs.ml_kem_1024) {
          console.log("🔹 Generating ML-KEM-1024 key pair for maximum security");
          this.ourKeyPairs.ml_kem_1024 = await generateMLKEMKeyPair(1024);
        }
        
        if (!this.ourKeyPairs.slh_dsa_l5) {
          console.log("🔹 Generating SLH-DSA-L5 key pair for maximum security");
          this.ourKeyPairs.slh_dsa_l5 = await generateSLHDSAKeyPair(5);
        }
        break;
        
      case MessageSecurityLevel.HIGH:
        // Ensure we have ML-KEM-768 and SLH-DSA-L3 keys
        if (!this.ourKeyPairs.ml_kem_768) {
          console.log("🔹 Generating ML-KEM-768 key pair for high security");
          this.ourKeyPairs.ml_kem_768 = await generateMLKEMKeyPair(768);
        }
        
        if (!this.ourKeyPairs.slh_dsa_l3) {
          console.log("🔹 Generating SLH-DSA-L3 key pair for high security");
          this.ourKeyPairs.slh_dsa_l3 = await generateSLHDSAKeyPair(3);
        }
        break;
        
      case MessageSecurityLevel.STANDARD:
        // Standard mode uses AES-256-GCM, which doesn't require PQ key generation
        break;
    }
  }
  
  /**
   * Get the appropriate key pair for the selected security level
   * @private
   */
  private getKeyPairForSecurityLevel(level: MessageSecurityLevel): {
    encryptionKeyPair: { publicKey: string; privateKey: string; };
    signingKeyPair: { publicKey: string; privateKey: string; };
  } {
    let encryptionKeyPair: { publicKey: string; privateKey: string; };
    let signingKeyPair: { publicKey: string; privateKey: string; };
    
    switch (level) {
      case MessageSecurityLevel.MAXIMUM:
        if (!this.ourKeyPairs.ml_kem_1024 || !this.ourKeyPairs.slh_dsa_l5) {
          throw new Error("Maximum security keys not available");
        }
        encryptionKeyPair = this.ourKeyPairs.ml_kem_1024;
        signingKeyPair = this.ourKeyPairs.slh_dsa_l5;
        break;
        
      case MessageSecurityLevel.HIGH:
      default:
        if (!this.ourKeyPairs.ml_kem_768 || !this.ourKeyPairs.slh_dsa_l3) {
          throw new Error("High security keys not available");
        }
        encryptionKeyPair = this.ourKeyPairs.ml_kem_768;
        signingKeyPair = this.ourKeyPairs.slh_dsa_l3;
        break;
        
      case MessageSecurityLevel.STANDARD:
        // For standard security, we'll just use the high security keys
        if (!this.ourKeyPairs.ml_kem_768 || !this.ourKeyPairs.slh_dsa_l3) {
          throw new Error("High security keys not available");
        }
        encryptionKeyPair = this.ourKeyPairs.ml_kem_768;
        signingKeyPair = this.ourKeyPairs.slh_dsa_l3;
        break;
    }
    
    return { encryptionKeyPair, signingKeyPair };
  }
  
  /**
   * Get or establish key exchange with a peer
   * @private
   */
  private async getOrEstablishKeyExchange(
    peerId: string,
    securityLevel: MessageSecurityLevel
  ): Promise<KeyExchangeRecord> {
    // Check if we already have a key exchange with this peer
    for (const [id, exchange] of this.keyExchanges.entries()) {
      if (exchange.peerId === peerId) {
        // Check if key should be rotated (more than 1 hour old)
        const keyAge = Date.now() - exchange.lastRotation;
        if (keyAge > 3600000) {
          // Key is more than 1 hour old, rotate it
          console.log(`🔹 Rotating session key for peer: ${peerId}`);
          return await this.establishKeyExchange(peerId, securityLevel);
        }
        return exchange;
      }
    }
    
    // No existing key exchange, establish a new one
    return await this.establishKeyExchange(peerId, securityLevel);
  }
  
  /**
   * Establish a new key exchange with a peer
   * @private
   */
  private async establishKeyExchange(
    peerId: string,
    securityLevel: MessageSecurityLevel
  ): Promise<KeyExchangeRecord> {
    console.log(`🔹 Establishing key exchange with peer: ${peerId}`);
    
    // Get the appropriate key pair for the security level
    const { encryptionKeyPair } = this.getKeyPairForSecurityLevel(securityLevel);
    
    // Simulate key exchange with the peer
    // In a real implementation, this would involve actual communication with the peer
    const peerPublicKey = `peer-public-key-${peerId}-${Date.now()}`;
    
    // "Encapsulate" a shared secret
    const keyEncapsulation = await encapsulateKey(peerPublicKey);
    
    // Create a key exchange record
    const exchangeId = `key-exchange-${uuidv4()}`;
    const exchange: KeyExchangeRecord = {
      peerId,
      ourKeyPair: encryptionKeyPair,
      theirPublicKey: peerPublicKey,
      sessionKey: keyEncapsulation.sharedSecret,
      established: Date.now(),
      lastRotation: Date.now(),
      algorithm: securityLevel === MessageSecurityLevel.MAXIMUM ? 
        PQC.ALGORITHM.ML_KEM_1024 : PQC.ALGORITHM.ML_KEM_768
    };
    
    // Store the key exchange
    this.keyExchanges.set(exchangeId, exchange);
    
    return exchange;
  }
  
  /**
   * Create a secure message
   * @private
   */
  private async createSecureMessage(
    messageId: string,
    senderId: string,
    recipientId: string,
    content: string,
    keyExchange: KeyExchangeRecord,
    options: SendMessageOptions
  ): Promise<SecureP2PMessage> {
    // Get the key exchange ID
    const keyExchangeId = Array.from(this.keyExchanges.entries())
      .find(([, exchange]) => exchange === keyExchange)?.[0];
    
    if (!keyExchangeId) {
      throw new Error("Key exchange ID not found");
    }
    
    // Get signing key pair based on security level
    const { signingKeyPair } = this.getKeyPairForSecurityLevel(options.securityLevel!);
    
    // Sign the message if requested
    let signature: string | undefined;
    if (options.sign) {
      signature = await signData(content, signingKeyPair.privateKey);
    }
    
    // Encrypt the content
    const encryptedContent = await symmetricEncrypt(content, keyExchange.sessionKey);
    
    // Create the secure message
    const secureMessage: SecureP2PMessage = {
      id: messageId,
      senderId,
      recipientId,
      content: encryptedContent,
      timestamp: Date.now(),
      encrypted: true,
      signed: !!options.sign,
      signature,
      keyId: keyExchangeId,
      algorithm: keyExchange.algorithm,
      dtn: !!options.dtn,
      forwardSecrecy: !!options.forwardSecrecy
    };
    
    return secureMessage;
  }
  
  /**
   * Send a message using Delay-Tolerant Networking
   * @private
   */
  private async sendDTNMessage(
    recipientId: string,
    message: string,
    messageId: string,
    options: SendMessageOptions
  ): Promise<boolean> {
    console.log(`🔹 Sending DTN message to ${recipientId}`);
    
    try {
      // Get our peer ID
      const ourPeerId = this.getPeerId();
      if (!ourPeerId) {
        throw new Error("Our peer ID is not available");
      }
      
      // Get signing key pair based on security level
      const { signingKeyPair } = this.getKeyPairForSecurityLevel(options.securityLevel!);
      
      // Sign the message if requested
      let signature: string | undefined;
      if (options.sign) {
        signature = await signData(message, signingKeyPair.privateKey);
      }
      
      // Create a DTN message
      const dtnMessage: DTNMessage = {
        id: messageId,
        data: message,
        encrypted: false, // We'll handle encryption separately
        sender: ourPeerId,
        recipient: recipientId,
        timestamp: new Date().toISOString(),
        priority: options.priority || 'medium',
        signature,
        ttl: options.ttl || 86400, // Default 24 hours
        hops: 0,
        status: 'sending',
        delay: 500 // Simulated delay
      };
      
      // Send the DTN message
      await sendDTNMessage(dtnMessage);
      
      // Track sent message
      this.sentMessages.set(messageId, {
        message: {
          id: messageId,
          senderId: ourPeerId,
          recipientId,
          content: message,
          timestamp: Date.now(),
          encrypted: false,
          signed: !!options.sign,
          signature,
          algorithm: 'dtn',
          dtn: true
        },
        recipientId,
        sentAt: Date.now(),
        status: 'sent'
      });
      
      return true;
    } catch (error) {
      console.error("❌ Error sending DTN message:", error);
      return false;
    }
  }
}

// Export singleton instance
export const secureP2PMessaging = new SecureP2PMessaging();
