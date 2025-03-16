/**
 * TetraCryptPQC Decentralized Storage Module
 * 
 * Implements decentralized storage capabilities with:
 * - Helia (IPFS) and Filecoin integration
 * - Quantum-safe encryption
 * - Homomorphic encryption
 * - Redundant storage mechanisms
 */

import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';
import { Web3Storage } from 'web3.storage';
import { SecurityClearance } from './security-protocols';
import { MilitaryHSM } from './hardware-security-module';
import { SecurityZone } from './security-zone-manager';
import { QuantumKeyDistribution } from './quantum-key-distribution';
import { OpenFHE } from './homomorphic-encryption';
import { shake256 } from '@noble/hashes/sha3';

/**
 * Storage options
 */
export interface StorageOptions {
  encryption: 'ML-KEM-1024' | 'KYBER-1024' | 'AES-256-GCM';
  redundancy: number; // Number of backup copies
  quantumResistant: boolean;
  homomorphicEnabled: boolean;
  forwardSecrecy: boolean;
}

/**
 * Storage status
 */
export enum StorageStatus {
  PENDING = 'PENDING',
  STORED = 'STORED',
  BACKED_UP = 'BACKED_UP',
  FAILED = 'FAILED'
}

/**
 * Decentralized storage implementation
 */
export class DecentralizedStorage {
  private helia: any;
  private fs: any;
  private web3Storage: Web3Storage;
  private hsm: MilitaryHSM;
  private qkd: QuantumKeyDistribution;
  private openfhe: OpenFHE;
  private initialized: boolean = false;

  constructor() {
    this.hsm = new MilitaryHSM(SecurityClearance.LEVEL_5);
    this.qkd = new QuantumKeyDistribution();
    this.openfhe = new OpenFHE();
  }

  /**
   * Initialize storage
   */
  public async initialize(): Promise<void> {
    console.log("🔒 Initializing Decentralized Storage");

    try {
      // Initialize Helia
      this.helia = await createHelia();
      this.fs = unixfs(this.helia);

      // Initialize Web3.Storage
      this.web3Storage = new Web3Storage({ token: process.env.WEB3_STORAGE_TOKEN! });

      // Initialize HSM
      await this.hsm.initialize();

      // Initialize QKD
      await this.qkd.initialize();

      // Initialize OpenFHE
      await this.openfhe.initialize();

      this.initialized = true;
      console.log("✅ Decentralized Storage initialized");
    } catch (error) {
      console.error("❌ Failed to initialize Decentralized Storage:", error);
      throw error;
    }
  }

  /**
   * Store file in Helia (IPFS)
   */
  public async storeFile(
    file: Uint8Array,
    options: StorageOptions
  ): Promise<{
    cid: string;
    status: StorageStatus;
    backupCid?: string;
  }> {
    if (!this.initialized) {
      throw new Error("Decentralized Storage not initialized");
    }

    try {
      // Generate quantum key pair
      const { publicKey, privateKey } = await this.qkd.generateKeyPair();

      // Encrypt file
      const encryptedFile = await this.encryptFile(file, publicKey, options);

      // Store in Helia
      const cid = await this.fs.add(encryptedFile);
      console.log("📦 File stored in Helia:", cid);

      // Backup to Filecoin if redundancy > 0
      let backupCid: string | undefined;
      if (options.redundancy > 0) {
        backupCid = await this.backupToFilecoin(encryptedFile);
        console.log("💾 File backed up to Filecoin:", backupCid);
      }

      // Store private key in HSM
      await this.hsm.storeKey(privateKey, {
        type: 'quantum',
        usage: ['decrypt'],
        extractable: false
      });

      return {
        cid: cid.toString(),
        status: backupCid ? StorageStatus.BACKED_UP : StorageStatus.STORED,
        backupCid
      };
    } catch (error) {
      console.error("❌ Failed to store file:", error);
      throw error;
    }
  }

  /**
   * Retrieve file from Helia (IPFS)
   */
  public async retrieveFile(
    cid: string,
    options: StorageOptions
  ): Promise<Uint8Array> {
    if (!this.initialized) {
      throw new Error("Decentralized Storage not initialized");
    }

    try {
      // Try to get from Helia first
      let encryptedFile: Uint8Array;
      try {
        encryptedFile = await this.fs.cat(cid);
      } catch (error) {
        // If Helia fails, try Filecoin backup
        console.log("⚠️ Helia retrieval failed, trying Filecoin backup");
        encryptedFile = await this.retrieveFromFilecoin(cid);
      }

      // Get private key from HSM
      const privateKey = await this.hsm.getKey(cid);

      // Decrypt file
      const decryptedFile = await this.decryptFile(encryptedFile, privateKey, options);

      return decryptedFile;
    } catch (error) {
      console.error("❌ Failed to retrieve file:", error);
      throw error;
    }
  }

  /**
   * Backup file to Filecoin
   */
  private async backupToFilecoin(file: Uint8Array): Promise<string> {
    // Create a File object from the Uint8Array
    const blob = new Blob([file]);
    const backupFile = new File([blob], 'backup', { type: 'application/octet-stream' });

    // Store in Web3.Storage (Filecoin)
    const cid = await this.web3Storage.put([backupFile], {
      name: 'backup',
      maxRetries: 3
    });

    return cid;
  }

  /**
   * Retrieve file from Filecoin
   */
  private async retrieveFromFilecoin(cid: string): Promise<Uint8Array> {
    const res = await this.web3Storage.get(cid);
    if (!res?.ok) {
      throw new Error("Failed to retrieve from Filecoin");
    }

    const files = await res.files();
    const file = files[0];
    const arrayBuffer = await file.arrayBuffer();

    return new Uint8Array(arrayBuffer);
  }

  /**
   * Encrypt file
   */
  private async encryptFile(
    file: Uint8Array,
    publicKey: Uint8Array,
    options: StorageOptions
  ): Promise<Uint8Array> {
    if (options.homomorphicEnabled) {
      // Use homomorphic encryption
      return await this.openfhe.encrypt(file, publicKey);
    } else {
      // Use standard PQC encryption
      switch (options.encryption) {
        case 'ML-KEM-1024':
          return await this.qkd.encrypt(file, publicKey);
        case 'KYBER-1024':
          return await this.qkd.encryptKyber(file, publicKey);
        case 'AES-256-GCM':
          return await this.qkd.encryptAES(file, publicKey);
        default:
          throw new Error("Unsupported encryption algorithm");
      }
    }
  }

  /**
   * Decrypt file
   */
  private async decryptFile(
    file: Uint8Array,
    privateKey: Uint8Array,
    options: StorageOptions
  ): Promise<Uint8Array> {
    if (options.homomorphicEnabled) {
      // Use homomorphic decryption
      return await this.openfhe.decrypt(file, privateKey);
    } else {
      // Use standard PQC decryption
      switch (options.encryption) {
        case 'ML-KEM-1024':
          return await this.qkd.decrypt(file, privateKey);
        case 'KYBER-1024':
          return await this.qkd.decryptKyber(file, privateKey);
        case 'AES-256-GCM':
          return await this.qkd.decryptAES(file, privateKey);
        default:
          throw new Error("Unsupported encryption algorithm");
      }
    }
  }

  /**
   * Check if initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const storage = new DecentralizedStorage();
