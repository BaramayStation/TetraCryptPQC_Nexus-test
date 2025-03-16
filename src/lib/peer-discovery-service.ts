/**
 * TetraCryptPQC Peer Discovery Service
 * 
 * Implements peer discovery, network latency monitoring, and connection
 * management for the secure P2P messaging system.
 */

import { v4 as uuidv4 } from 'uuid';
import { ConnectionState } from './p2p-messaging';
import { secureP2PMessaging, MessageSecurityLevel } from './secure-p2p-messaging';

/**
 * Peer information
 */
export interface PeerInfo {
  id: string;
  publicKey: string;
  publicSigningKey: string;
  lastSeen: string;
  connectionQuality: 'poor' | 'fair' | 'good' | 'excellent';
  latency: number;
  version: string;
  capabilities: string[];
  address?: string;
  metadata?: Record<string, any>;
}

/**
 * Peer discovery options
 */
export interface PeerDiscoveryOptions {
  autoConnect: boolean;
  maxPeers: number;
  pingInterval: number; // in milliseconds
  pingTimeout: number; // in milliseconds
  peerTimeoutMinutes: number;
  securityLevel: MessageSecurityLevel;
  trackerUrls?: string[];
}

/**
 * Default peer discovery options
 */
const DEFAULT_OPTIONS: PeerDiscoveryOptions = {
  autoConnect: true,
  maxPeers: 25,
  pingInterval: 30000, // 30 seconds
  pingTimeout: 5000, // 5 seconds
  peerTimeoutMinutes: 10, // Consider peer disconnected after 10 minutes
  securityLevel: MessageSecurityLevel.HIGH
};

/**
 * Network statistics
 */
export interface NetworkStats {
  connectedPeers: number;
  avgLatency: number;
  maxLatency: number;
  minLatency: number;
  connectionQuality: 'poor' | 'fair' | 'good' | 'excellent';
  uptime: number; // in seconds
  messagesSent: number;
  messagesReceived: number;
  lastUpdated: string;
}

/**
 * Peer connection event
 */
export interface PeerConnectionEvent {
  type: 'connected' | 'disconnected' | 'timeout' | 'error';
  peerId: string;
  timestamp: string;
  details?: any;
}

/**
 * Peer Discovery Service
 */
export class PeerDiscoveryService {
  // Configuration
  private options: PeerDiscoveryOptions;
  
  // Peer information
  private peers: Map<string, PeerInfo> = new Map();
  
  // Connection state
  private connectionState: ConnectionState = 'disconnected';
  
  // Start time
  private startTime: number = 0;
  
  // Message counts
  private messagesSent: number = 0;
  private messagesReceived: number = 0;
  
  // Connection events
  private connectionEvents: PeerConnectionEvent[] = [];
  
  // Ping interval ID
  private pingIntervalId: NodeJS.Timeout | null = null;
  
  // Event listeners
  private eventListeners: {
    peerConnected: ((peer: PeerInfo) => void)[];
    peerDisconnected: ((peerId: string) => void)[];
    peerUpdated: ((peer: PeerInfo) => void)[];
    connectionStateChanged: ((state: ConnectionState) => void)[];
  } = {
    peerConnected: [],
    peerDisconnected: [],
    peerUpdated: [],
    connectionStateChanged: []
  };
  
  /**
   * Constructor
   */
  constructor(options: Partial<PeerDiscoveryOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.setupConnectionListeners();
  }
  
  /**
   * Initialize the peer discovery service
   */
  public async initialize(): Promise<void> {
    console.log("🔹 Initializing Peer Discovery Service");
    
    // Initialize secure messaging if not already initialized
    if (!secureP2PMessaging.isInitialized()) {
      await secureP2PMessaging.initialize();
    }
    
    // Record start time
    this.startTime = Date.now();
    
    // Start auto-connection if enabled
    if (this.options.autoConnect) {
      this.connect();
    }
    
    console.log("✅ Peer Discovery Service initialized");
  }
  
  /**
   * Set up connection listeners
   * @private
   */
  private setupConnectionListeners(): void {
    // Listen for connection state changes
    secureP2PMessaging.onConnectionStateChange((state) => {
      this.connectionState = state;
      this.notifyConnectionStateChanged(state);
    });
    
    // Listen for messages to track received count
    secureP2PMessaging.onMessage(() => {
      this.messagesReceived++;
    });
  }
  
  /**
   * Connect to the P2P network
   */
  public connect(): void {
    console.log("🔹 Connecting to P2P network");
    
    if (this.connectionState === 'disconnected') {
      secureP2PMessaging.connect();
      
      // Start periodic pinging
      this.startPingInterval();
    }
  }
  
  /**
   * Disconnect from the P2P network
   */
  public disconnect(): void {
    console.log("🔹 Disconnecting from P2P network");
    
    // Stop ping interval
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
    
    secureP2PMessaging.disconnect();
  }
  
  /**
   * Start the ping interval
   * @private
   */
  private startPingInterval(): void {
    // Clear any existing interval
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
    }
    
    // Set up new interval
    this.pingIntervalId = setInterval(() => {
      this.pingAllPeers();
    }, this.options.pingInterval);
  }
  
  /**
   * Ping all connected peers
   * @private
   */
  private async pingAllPeers(): Promise<void> {
    // Only ping if connected
    if (this.connectionState !== 'connected') {
      return;
    }
    
    // Get current timestamp
    const now = Date.now();
    
    // Check for timed-out peers
    this.checkForTimedOutPeers(now);
    
    // Ping each peer
    for (const [peerId, peer] of this.peers.entries()) {
      this.pingPeer(peerId);
    }
  }
  
  /**
   * Check for timed-out peers
   * @private
   */
  private checkForTimedOutPeers(now: number): void {
    const timeoutMs = this.options.peerTimeoutMinutes * 60 * 1000;
    
    for (const [peerId, peer] of this.peers.entries()) {
      const lastSeen = new Date(peer.lastSeen).getTime();
      
      if (now - lastSeen > timeoutMs) {
        console.log(`⚠️ Peer timed out: ${peerId}`);
        
        // Record connection event
        this.recordConnectionEvent({
          type: 'timeout',
          peerId,
          timestamp: new Date().toISOString()
        });
        
        // Remove peer
        this.peers.delete(peerId);
        
        // Notify listeners
        this.notifyPeerDisconnected(peerId);
      }
    }
  }
  
  /**
   * Ping a specific peer
   * @private
   */
  private async pingPeer(peerId: string): Promise<void> {
    try {
      // Create ping message with timestamp
      const pingData = {
        type: 'ping',
        timestamp: Date.now(),
        id: uuidv4()
      };
      
      // Send ping message
      const pingStart = Date.now();
      const success = await secureP2PMessaging.sendMessage(
        peerId,
        JSON.stringify(pingData),
        {
          securityLevel: this.options.securityLevel,
          sign: true,
          deliveryTimeout: this.options.pingTimeout
        }
      );
      
      if (success) {
        // Update latency - in a real implementation, we would wait for a pong response
        // This is simplified to use the message send time
        const latency = Date.now() - pingStart;
        
        // Get the peer
        const peer = this.peers.get(peerId);
        if (peer) {
          // Update peer information
          const updatedPeer: PeerInfo = {
            ...peer,
            lastSeen: new Date().toISOString(),
            latency,
            connectionQuality: this.getConnectionQuality(latency)
          };
          
          // Store updated peer
          this.peers.set(peerId, updatedPeer);
          
          // Notify listeners
          this.notifyPeerUpdated(updatedPeer);
        }
        
        this.messagesSent++;
      } else {
        console.warn(`⚠️ Failed to ping peer: ${peerId}`);
      }
    } catch (error) {
      console.error(`❌ Error pinging peer ${peerId}:`, error);
    }
  }
  
  /**
   * Get connection quality based on latency
   * @private
   */
  private getConnectionQuality(latency: number): 'poor' | 'fair' | 'good' | 'excellent' {
    if (latency < 100) {
      return 'excellent';
    } else if (latency < 200) {
      return 'good';
    } else if (latency < 500) {
      return 'fair';
    } else {
      return 'poor';
    }
  }
  
  /**
   * Record a connection event
   * @private
   */
  private recordConnectionEvent(event: PeerConnectionEvent): void {
    // Add to connection events, limited to 100 events
    this.connectionEvents.unshift(event);
    
    if (this.connectionEvents.length > 100) {
      this.connectionEvents.pop();
    }
  }
  
  /**
   * Get all known peers
   */
  public getPeers(): PeerInfo[] {
    return Array.from(this.peers.values());
  }
  
  /**
   * Get a specific peer by ID
   */
  public getPeer(peerId: string): PeerInfo | undefined {
    return this.peers.get(peerId);
  }
  
  /**
   * Get network statistics
   */
  public getNetworkStats(): NetworkStats {
    const peers = this.getPeers();
    const latencies = peers.map(p => p.latency).filter(l => l > 0);
    
    const avgLatency = latencies.length > 0 
      ? latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length 
      : 0;
    
    const minLatency = latencies.length > 0 
      ? Math.min(...latencies) 
      : 0;
    
    const maxLatency = latencies.length > 0 
      ? Math.max(...latencies) 
      : 0;
    
    return {
      connectedPeers: peers.length,
      avgLatency,
      minLatency,
      maxLatency,
      connectionQuality: this.getConnectionQuality(avgLatency),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      messagesSent: this.messagesSent,
      messagesReceived: this.messagesReceived,
      lastUpdated: new Date().toISOString()
    };
  }
  
  /**
   * Get connection events
   */
  public getConnectionEvents(): PeerConnectionEvent[] {
    return [...this.connectionEvents];
  }
  
  /**
   * Get the current connection state
   */
  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }
  
  /**
   * Discover peers manually
   */
  public async discoverPeers(): Promise<number> {
    console.log("🔹 Manually discovering peers");
    
    // In a real implementation, this would query trackers or DHT
    // For simulation, we'll just create some fake peers
    
    const numberOfNewPeers = Math.floor(Math.random() * 5) + 1;
    
    for (let i = 0; i < numberOfNewPeers; i++) {
      // Only add if we're under max peers
      if (this.peers.size >= this.options.maxPeers) {
        break;
      }
      
      const peerId = `peer-${uuidv4()}`;
      
      // Create peer info
      const peer: PeerInfo = {
        id: peerId,
        publicKey: `pk-${peerId.substring(0, 8)}`,
        publicSigningKey: `spk-${peerId.substring(0, 8)}`,
        lastSeen: new Date().toISOString(),
        connectionQuality: 'good',
        latency: Math.floor(Math.random() * 200) + 50,
        version: '1.0.0',
        capabilities: ['messaging', 'discovery']
      };
      
      // Add peer
      this.peers.set(peerId, peer);
      
      // Record connection event
      this.recordConnectionEvent({
        type: 'connected',
        peerId,
        timestamp: new Date().toISOString()
      });
      
      // Notify listeners
      this.notifyPeerConnected(peer);
    }
    
    return numberOfNewPeers;
  }
  
  /**
   * Register event listeners
   */
  public on(
    event: 'peerConnected' | 'peerDisconnected' | 'peerUpdated' | 'connectionStateChanged',
    callback: any
  ): void {
    this.eventListeners[event].push(callback);
  }
  
  /**
   * Unregister event listeners
   */
  public off(
    event: 'peerConnected' | 'peerDisconnected' | 'peerUpdated' | 'connectionStateChanged',
    callback: any
  ): void {
    const index = this.eventListeners[event].indexOf(callback);
    if (index >= 0) {
      this.eventListeners[event].splice(index, 1);
    }
  }
  
  /**
   * Notify peer connected listeners
   * @private
   */
  private notifyPeerConnected(peer: PeerInfo): void {
    this.eventListeners.peerConnected.forEach(listener => listener(peer));
  }
  
  /**
   * Notify peer disconnected listeners
   * @private
   */
  private notifyPeerDisconnected(peerId: string): void {
    this.eventListeners.peerDisconnected.forEach(listener => listener(peerId));
  }
  
  /**
   * Notify peer updated listeners
   * @private
   */
  private notifyPeerUpdated(peer: PeerInfo): void {
    this.eventListeners.peerUpdated.forEach(listener => listener(peer));
  }
  
  /**
   * Notify connection state changed listeners
   * @private
   */
  private notifyConnectionStateChanged(state: ConnectionState): void {
    this.eventListeners.connectionStateChanged.forEach(listener => listener(state));
  }
}

// Export singleton instance
export const peerDiscoveryService = new PeerDiscoveryService();
