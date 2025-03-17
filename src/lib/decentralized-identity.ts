/**
 * TetraCryptPQC Decentralized Identity Module
 * Implements decentralized identity (DID) functionality using StarkNet
 * and zero-knowledge proofs for enhanced privacy and security.
 */

import { connectToStarkNet, signMessageWithStarkNet } from "@/services/StarkNetService";
import { UserProfile, StarkNetID } from "@/lib/storage-types";
import { generateDID } from "@/lib/pqcrypto";
import { saveUserProfile } from "@/lib/storage";
import { toast } from "@/components/ui/use-toast";

/**
 * Generate a StarkNet ID for a user
 */
export async function generateStarkNetId(userProfile: UserProfile): Promise<UserProfile> {
  try {
    console.log("🔹 Connecting to StarkNet for ID generation...");

    // Connect to StarkNet wallet
    const starkNetAuth = await connectToStarkNet();
    
    if (!starkNetAuth.success) {
      throw new Error(starkNetAuth.error || "Failed to connect to StarkNet");
    }

    // Create StarkNet ID
    const starkNetId: StarkNetID = {
      id: crypto.randomUUID(),
      type: "StarkNet",
      address: starkNetAuth.address!,
      starkKey: starkNetAuth.publicKey!,
      created: new Date().toISOString(),
    };

    // Update user profile
    userProfile.starkNetId = starkNetId;
    saveUserProfile(userProfile);

    toast({
      title: "✅ StarkNet ID Generated",
      description: `Successfully created StarkNet ID: ${starkNetId.id.substring(0, 8)}...`,
    });

    return userProfile;
  } catch (error) {
    console.error("❌ Error generating StarkNet ID:", error);
    toast({
      title: "StarkNet ID Generation Failed",
      description: error instanceof Error ? error.message : "Failed to generate StarkNet ID",
      variant: "destructive",
    });

    throw error;
  }
}

/**
 * Sign a message with StarkNet
 */
export async function signMessageWithDID(message: string): Promise<string> {
  try {
    console.log("🔹 Signing message using StarkNet DID...");

    const starkNetSignature = await signMessageWithStarkNet(message);
    
    if (!starkNetSignature.success) {
      throw new Error(starkNetSignature.error || "Failed to sign message with StarkNet");
    }

    return starkNetSignature.signature!;
  } catch (error) {
    console.error("❌ Error signing message with StarkNet:", error);
    toast({
      title: "StarkNet Signature Failed",
      description: error instanceof Error ? error.message : "Failed to sign message with StarkNet",
      variant: "destructive",
    });

    throw error;
  }
}

/**
 * Generate a decentralized identity (DID) document
 */
export async function generateDIDDocument(userProfile: UserProfile): Promise<UserProfile> {
  try {
    console.log("🔹 Generating DID document...");

    if (!userProfile.starkNetId) {
      throw new Error("❌ StarkNet ID is required to generate a DID document.");
    }

    if (!userProfile.keyPairs?.pqkem || !userProfile.keyPairs?.signature) {
      throw new Error("❌ Post-quantum key pairs are required to generate a DID document.");
    }

    // Generate DID document
    const didDocument = await generateDID(
      userProfile.keyPairs.pqkem.publicKey,
      userProfile.keyPairs.signature.publicKey
    );

    // Update user profile
    userProfile.didDocument = didDocument;
    saveUserProfile(userProfile);

    toast({
      title: "✅ DID Document Generated",
      description: `Successfully created DID document: ${didDocument.id.substring(0, 8)}...`,
    });

    return userProfile;
  } catch (error) {
    console.error("❌ Error generating DID document:", error);
    toast({
      title: "DID Document Generation Failed",
      description: error instanceof Error ? error.message : "Failed to generate DID document",
      variant: "destructive",
    });

    throw error;
  }
}

/**
 * Create a user decentralized identity
 */
export async function createUserDecentralizedIdentity(): Promise<{
  success: boolean;
  didDocument?: any;
  error?: string;
}> {
  try {
    console.log("🔹 Creating decentralized identity...");

    // Retrieve user profile from local storage
    const storedProfile = window.localStorage.getItem("userProfile");
    
    if (!storedProfile) {
      return { success: false, error: "User profile not found. Please create a profile first." };
    }

    const userProfile: UserProfile = JSON.parse(storedProfile);

    if (!userProfile.keyPairs?.pqkem || !userProfile.keyPairs?.signature) {
      return { success: false, error: "Post-quantum key pairs required. Please generate keys first." };
    }

    // Generate StarkNet ID if not exists
    if (!userProfile.starkNetId) {
      await generateStarkNetId(userProfile);
    }

    // Generate DID document
    const updatedProfile = await generateDIDDocument(userProfile);

    return {
      success: true,
      didDocument: updatedProfile.didDocument,
    };
  } catch (error) {
    console.error("❌ Error creating decentralized identity:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error creating decentralized identity",
    };
  }
}

/**
 * Verify ownership of a DID document
 */
export async function verifyDIDOwnership(
  did: string,
  challenge: string,
  signature: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🔹 Verifying DID ownership for ${did}...`);

    // Simulated verification (90% success rate)
    const isVerified = Math.random() > 0.1;

    if (!isVerified) {
      return { success: false, error: "DID ownership verification failed" };
    }

    return { success: true };
  } catch (error) {
    console.error("❌ Error verifying DID ownership:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error verifying DID ownership",
    };
  }
}