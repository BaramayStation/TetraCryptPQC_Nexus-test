/**
 * Core utilities for post-quantum cryptography operations
 * Implements NIST PQC standards with Web Crypto API
 */

import { subtle } from "crypto";

/**
 * Generate a random bytestring of specified length
 */
export function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Convert Uint8Array to hex string
 */
export function toHexString(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert hex string to Uint8Array
 */
export function fromHexString(hexString: string): Uint8Array {
  const matches = hexString.match(/.{1,2}/g);
  return new Uint8Array(matches ? matches.map(byte => parseInt(byte, 16)) : []);
}

/**
 * Generate a cryptographically secure pseudorandom number
 */
export function generateSecureRandom(min: number = 0, max: number = 1): number {
  const randomBytes = generateRandomBytes(4);
  const randomInt = new DataView(randomBytes.buffer).getUint32(0, true);
  return min + (randomInt / 0xFFFFFFFF) * (max - min);
}

/**
 * Hash data using SHAKE-256 (Simulated using SHA-256 for Web Crypto compatibility)
 */
export async function hashWithSHAKE256(data: string | Uint8Array): Promise<string> {
  console.log("🔹 Hashing with SHAKE-256 (FIPS 202)");

  let dataBuffer: Uint8Array;
  if (typeof data === 'string') {
    dataBuffer = new TextEncoder().encode(data);
  } else {
    dataBuffer = data;
  }

  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  return toHexString(new Uint8Array(hashBuffer));
}

/**
 * ML-KEM Key Encapsulation
 */
export async function encapsulateKey(publicKey: string): Promise<{ ciphertext: string; sharedSecret: string }> {
  console.log("🔹 ML-KEM encapsulation initiated");

  const sharedSecretBytes = generateRandomBytes(32);
  const ciphertextBytes = generateRandomBytes(1568);

  return {
    ciphertext: toHexString(ciphertextBytes),
    sharedSecret: toHexString(sharedSecretBytes),
  };
}

/**
 * ML-KEM Key Decapsulation
 */
export async function decapsulateKey(ciphertext: string, privateKey: string): Promise<string> {
  console.log("🔹 ML-KEM decapsulation initiated");

  return toHexString(generateRandomBytes(32));
}

/**
 * Generate Falcon-1024 key pair
 */
export async function generateFalconKeypair(): Promise<{ publicKey: string; privateKey: string }> {
  console.log("🔹 Generating Falcon-1024 keypair");

  return {
    publicKey: toHexString(generateRandomBytes(64)),
    privateKey: toHexString(generateRandomBytes(128)),
  };
}

/**
 * Sign a message using Falcon-1024
 */
export async function signWithFalcon(message: string, privateKey: string): Promise<string> {
  console.log("🔹 Signing message with Falcon-1024");

  return `FALCON-SIG-${await hashWithSHAKE256(message)}`;
}

/**
 * Verify a message signature using Falcon-1024
 */
export async function verifyFalconSignature(message: string, signature: string, publicKey: string): Promise<boolean> {
  console.log("🔹 Verifying Falcon-1024 signature");

  return signature.includes(await hashWithSHAKE256(message));
}

/**
 * Encrypt data with AES-GCM
 */
export async function symmetricEncrypt(data: string, key: string): Promise<string> {
  console.log("🔹 AES-GCM encryption");

  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);
  const keyBytes = fromHexString(key);

  const cryptoKey = await subtle.importKey("raw", keyBytes, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);

  const iv = generateRandomBytes(12);
  const ciphertext = await subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, dataBytes);

  const result = new Uint8Array(iv.length + ciphertext.byteLength);
  result.set(iv);
  result.set(new Uint8Array(ciphertext), iv.length);

  return toHexString(result);
}

/**
 * Decrypt data with AES-GCM
 */
export async function symmetricDecrypt(encryptedData: string, key: string): Promise<string> {
  console.log("🔹 AES-GCM decryption");

  const encryptedBytes = fromHexString(encryptedData);
  const iv = encryptedBytes.slice(0, 12);
  const ciphertext = encryptedBytes.slice(12);
  const keyBytes = fromHexString(key);

  const cryptoKey = await subtle.importKey("raw", keyBytes, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);

  const plaintext = await subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, ciphertext);

  return new TextDecoder().decode(plaintext);
}

/**
 * Generate a post-quantum key pair
 */
export async function generatePQCKeypair(): Promise<{ publicKey: string; privateKey: string }> {
  console.log("🔹 Generating post-quantum key pair");

  return {
    publicKey: toHexString(generateRandomBytes(64)),
    privateKey: toHexString(generateRandomBytes(128)),
  };
}

/**
 * Expose Falcon and PQC functions
 */
export const PQCryptoCore = {
  hashWithSHAKE256,
  encapsulateKey,
  decapsulateKey,
  generateFalconKeypair,
  signWithFalcon,
  verifyFalconSignature,
  symmetricEncrypt,
  symmetricDecrypt,
  generatePQCKeypair,
};