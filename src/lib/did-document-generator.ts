/**
 * TetraCryptPQC DID Document Generator
 * 
 * Implements a robust DID document generator that leverages post-quantum
 * cryptography to create secure, verifiable decentralized identities.
 */

import { v4 as uuidv4 } from 'uuid';
import { starknet } from 'starknet';
import { toHexString, fromHexString, generateMLKEMKeyPair, generateSLHDSAKeyPair } from './pqcrypto-core';
import { 
  DIDMethod, 
  DIDDocument, 
  StarkNetDIDConfig,
  SecurityLevel 
} from './decentralized-identity-verification';
import { autonomousKeyManager, KeyType } from './autonomous-key-management';
import { hashWithSHA3 } from './pqcrypto-core';

// Multicodec code points for key types
const MULTICODEC = {
  ML_KEM_768: 'mh1',
  ML_KEM_1024: 'mh2',
  SLH_DSA_L3: 'sd3',
  SLH_DSA_L5: 'sd5'
};

/**
 * Convert a public key to multibase format
 * @param publicKey The public key in hex format
 * @param codec The multicodec prefix
 * @returns Multibase formatted public key
 */
function toMultibase(publicKey: string, codec: string): string {
  return `z${codec}${publicKey}`;
}

/**
 * DID Document Generator configuration
 */
export interface DIDDocumentConfig {
  method: DIDMethod;
  controller: string;
  useZkProofs: boolean;
  securityLevel: SecurityLevel;
  starkNetConfig?: StarkNetDIDConfig;
  useHardwareSecurity: boolean;
}

/**
 * Default DID Document Generator configuration
 */
const DEFAULT_CONFIG: DIDDocumentConfig = {
  method: DIDMethod.STARKNET,
  controller: '',
  useZkProofs: true,
  securityLevel: SecurityLevel.L3,
  useHardwareSecurity: true
};

/**
 * Key material for DID document
 */
export interface DIDKeyMaterial {
  encryptionKeyPair: {
    publicKey: string;
    privateKey: string;
  };
  signingKeyPair: {
    publicKey: string;
    privateKey: string;
  };
  controller: string;
}

/**
 * DID Document Generator
 */
export class DIDDocumentGenerator {
  private config: DIDDocumentConfig;
  
  /**
   * Constructor
   */
  constructor(config: Partial<DIDDocumentConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Generate key material for DID document
   */
  public async generateKeyMaterial(): Promise<DIDKeyMaterial> {
    console.log(`🔹 Generating key material for DID document with security level ${this.config.securityLevel}`);
    
    // Generate ML-KEM key pair for encryption/key agreement
    const mlKemSecurityLevel = this.config.securityLevel === SecurityLevel.L5 ? 1024 : 768;
    const encryptionKeyPair = await generateMLKEMKeyPair(mlKemSecurityLevel as 768 | 1024);
    
    // Generate SLH-DSA key pair for signatures
    const slhDsaSecurityLevel = this.config.securityLevel === SecurityLevel.L5 ? 5 : 3;
    const signingKeyPair = await generateSLHDSAKeyPair(slhDsaSecurityLevel as 3 | 5);
    
    // Set controller if not already set
    let controller = this.config.controller;
    if (!controller) {
      // Generate a random controller ID if not provided
      controller = `did:${this.config.method}:${uuidv4()}`;
    }
    
    return {
      encryptionKeyPair,
      signingKeyPair,
      controller
    };
  }
  
  /**
   * Generate a DID document
   */
  public async generateDIDDocument(keyMaterial?: DIDKeyMaterial): Promise<DIDDocument> {
    // Generate key material if not provided
    const keys = keyMaterial || await this.generateKeyMaterial();
    
    // Get current timestamp
    const timestamp = new Date().toISOString();
    
    // Generate DID
    const didId = keys.controller || `did:${this.config.method}:${uuidv4()}`;
    
    // Select appropriate multicodec prefixes based on security level
    const encryptionCodec = this.config.securityLevel === SecurityLevel.L5 ? 
      MULTICODEC.ML_KEM_1024 : MULTICODEC.ML_KEM_768;
    
    const signingCodec = this.config.securityLevel === SecurityLevel.L5 ? 
      MULTICODEC.SLH_DSA_L5 : MULTICODEC.SLH_DSA_L3;
    
    // Create verification methods
    const encryptionKeyId = `${didId}#key-1`;
    const signingKeyId = `${didId}#key-2`;
    
    // Create DID document
    const didDocument: DIDDocument = {
      id: didId,
      controller: [didId],
      verificationMethod: [
        {
          id: encryptionKeyId,
          type: this.config.securityLevel === SecurityLevel.L5 ? 'ML-KEM-1024Key2023' : 'ML-KEM-768Key2023',
          controller: didId,
          publicKeyMultibase: toMultibase(keys.encryptionKeyPair.publicKey, encryptionCodec)
        },
        {
          id: signingKeyId,
          type: this.config.securityLevel === SecurityLevel.L5 ? 'SLH-DSA-L5Key2023' : 'SLH-DSA-L3Key2023',
          controller: didId,
          publicKeyMultibase: toMultibase(keys.signingKeyPair.publicKey, signingCodec)
        }
      ],
      authentication: [signingKeyId],
      assertionMethod: [signingKeyId],
      keyAgreement: [encryptionKeyId],
      capabilityInvocation: [signingKeyId],
      capabilityDelegation: [signingKeyId],
      created: timestamp,
      updated: timestamp,
      metadata: {
        algorithm: this.config.securityLevel === SecurityLevel.L5 ? 'ML-KEM-1024+SLH-DSA-L5' : 'ML-KEM-768+SLH-DSA-L3',
        securityLevel: this.config.securityLevel,
        pqcProtected: true,
        zkProofSupport: this.config.useZkProofs,
      }
    };
    
    console.log(`✅ Generated DID document: ${didDocument.id}`);
    
    return didDocument;
  }
  
  /**
   * Register a DID document on StarkNet
   * This is a simulated implementation
   */
  public async registerDIDOnStarkNet(didDocument: DIDDocument): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    console.log(`🔹 Registering DID document on StarkNet: ${didDocument.id}`);
    
    try {
      // In a real implementation, this would interact with a StarkNet contract
      // For simulation, we'll just create a mock transaction hash
      
      // Hash the DID document
      const documentJson = JSON.stringify(didDocument);
      const documentHash = await hashWithSHA3(documentJson);
      
      // Simulate successful registration (90% success rate)
      const isSuccess = Math.random() > 0.1;
      
      if (isSuccess) {
        const txHash = `0x${documentHash.substring(0, 64)}`;
        console.log(`✅ DID document registered on StarkNet. Transaction hash: ${txHash}`);
        
        return {
          success: true,
          transactionHash: txHash
        };
      } else {
        throw new Error("StarkNet transaction failed");
      }
    } catch (error) {
      console.error("❌ Failed to register DID document on StarkNet:", error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error registering DID on StarkNet"
      };
    }
  }
  
  /**
   * Generate a proof for a DID document
   * This creates a zero-knowledge proof of ownership
   */
  public async generateDIDProof(
    didDocument: DIDDocument, 
    privateKey: string,
    challenge: string
  ): Promise<{
    type: string;
    created: string;
    verificationMethod: string;
    challenge: string;
    proofValue: string;
  }> {
    console.log(`🔹 Generating proof for DID document: ${didDocument.id}`);
    
    // Get the signing verification method
    const signingMethod = didDocument.verificationMethod.find(
      vm => didDocument.authentication.includes(vm.id)
    );
    
    if (!signingMethod) {
      throw new Error("No valid authentication method found in DID document");
    }
    
    // In a real implementation, this would create a proper ZK proof
    // For simulation, we'll create a signature-based proof
    
    // Create proof
    const proofData = {
      did: didDocument.id,
      challenge,
      timestamp: new Date().toISOString()
    };
    
    // Convert to string
    const proofDataString = JSON.stringify(proofData);
    
    // Create a signature using SLH-DSA
    const { signData } = await import('./pqcrypto-core');
    const signature = await signData(proofDataString, privateKey);
    
    return {
      type: 'SLH-DSASignature2023',
      created: new Date().toISOString(),
      verificationMethod: signingMethod.id,
      challenge,
      proofValue: signature
    };
  }
  
  /**
   * Verify a DID proof
   */
  public async verifyDIDProof(
    didDocument: DIDDocument,
    proof: {
      type: string;
      created: string;
      verificationMethod: string;
      challenge: string;
      proofValue: string;
    }
  ): Promise<boolean> {
    console.log(`🔹 Verifying proof for DID document: ${didDocument.id}`);
    
    // Find the verification method
    const verificationMethod = didDocument.verificationMethod.find(
      vm => vm.id === proof.verificationMethod
    );
    
    if (!verificationMethod) {
      console.error(`❌ Verification method not found: ${proof.verificationMethod}`);
      return false;
    }
    
    // Extract public key
    let publicKey: string;
    if (verificationMethod.publicKeyMultibase) {
      // Remove multibase prefix (z + codec)
      publicKey = verificationMethod.publicKeyMultibase.substring(4);
    } else if (verificationMethod.publicKeyJwk) {
      // In a real implementation, this would extract the public key from JWK
      console.error("❌ JWK public key extraction not implemented");
      return false;
    } else {
      console.error("❌ No public key found in verification method");
      return false;
    }
    
    // In a real implementation, this would verify the ZK proof
    // For simulation, we'll verify a signature-based proof
    
    if (proof.type === 'SLH-DSASignature2023') {
      // Recreate the proof data
      const proofData = {
        did: didDocument.id,
        challenge: proof.challenge,
        timestamp: proof.created
      };
      
      // Convert to string
      const proofDataString = JSON.stringify(proofData);
      
      // Verify the signature
      const { verifySignature } = await import('./pqcrypto-core');
      return await verifySignature(proofDataString, proof.proofValue, publicKey);
    } else {
      console.error(`❌ Unsupported proof type: ${proof.type}`);
      return false;
    }
  }
}

// Export a singleton instance
export const didDocumentGenerator = new DIDDocumentGenerator();
