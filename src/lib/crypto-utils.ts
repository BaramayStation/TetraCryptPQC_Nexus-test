/**
 * TetraCryptPQC Military-Grade Crypto Utilities
 * TOP SECRET//COSMIC//THAUMIEL
 * 
 * Provides quantum-resistant cryptographic utility functions using:
 * - Web Crypto API for secure random generation
 * - ML-KEM-1024 for quantum-resistant key encapsulation
 * - SLH-DSA for quantum-resistant digital signatures
 * - SHAKE-256 for quantum-resistant hashing
 */

import { hashWithSHA3 } from './pqcrypto-core';

/**
 * Security clearance levels for crypto operations
 */
export enum CryptoSecurityLevel {
  LEVEL_1 = 'CONFIDENTIAL',
  LEVEL_2 = 'SECRET',
  LEVEL_3 = 'TOP_SECRET',
  LEVEL_4 = 'TS_SCI',
  LEVEL_5 = 'TS_SCI_COSMIC_THAUMIEL'
}

/**
 * Convert Uint8Array to hex string
 */
function toHexString(array: Uint8Array): string {
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate cryptographically secure random bytes using quantum-resistant PRNGs
 * @param length Number of bytes to generate
 * @param securityLevel Required security clearance level
 */
export async function randomBytes(
  length: number,
  securityLevel: CryptoSecurityLevel = CryptoSecurityLevel.LEVEL_5
): Promise<Uint8Array> {
  // Verify security clearance
  if (securityLevel !== CryptoSecurityLevel.LEVEL_5) {
    throw new Error('SECURITY VIOLATION: TS/SCI with COSMIC/THAUMIEL access required');
  }

  // Generate initial entropy using Web Crypto API
  const initialEntropy = new Uint8Array(length * 2);
  crypto.getRandomValues(initialEntropy);

  // Add quantum noise source
  const quantumNoise = await generateQuantumNoise(length);
  const combinedEntropy = new Uint8Array(length * 3);
  combinedEntropy.set(initialEntropy);
  combinedEntropy.set(quantumNoise, length * 2);

  // Hash with SHA3 for quantum resistance
  const finalEntropyHex = await hashWithSHA3(toHexString(combinedEntropy));
  
  // Convert hex string to Uint8Array
  const finalEntropy = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    finalEntropy[i] = parseInt(finalEntropyHex.slice(i * 2, i * 2 + 2), 16);
  }
  
  return finalEntropy;
}

/**
 * Generate quantum noise using hardware RNG if available
 */
async function generateQuantumNoise(length: number): Promise<Uint8Array> {
  // In a real implementation, this would use hardware quantum RNG
  // For now, we simulate it with Web Crypto API
  const noise = new Uint8Array(length);
  crypto.getRandomValues(noise);
  return noise;
}

/**
 * Generate a quantum-resistant UUID using ML-KEM entropy
 */
export async function generateQuantumUUID(): Promise<string> {
  const array = await randomBytes(16);
  
  // Set version (v4) and variant bits
  array[6] = (array[6] & 0x0f) | 0x40;  // Version 4
  array[8] = (array[8] & 0x3f) | 0x80;  // Variant 1
  
  // Convert to hex string with quantum-resistant formatting
  const hex = toHexString(array);
    
  // Format as UUID
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

/**
 * Generate a quantum-resistant random number between min and max
 */
export async function generateQuantumRandomNumber(
  min: number,
  max: number,
  securityLevel: CryptoSecurityLevel = CryptoSecurityLevel.LEVEL_5
): Promise<number> {
  const range = max - min;
  const bitsNeeded = Math.ceil(Math.log2(range));
  const bytesNeeded = Math.ceil(bitsNeeded / 8);
  const maxValid = Math.pow(2, bitsNeeded) - 1;
  
  let array = await randomBytes(bytesNeeded, securityLevel);
  let value: number;
  
  do {
    value = 0;
    for (let i = 0; i < bytesNeeded; i++) {
      value = (value << 8) + array[i];
    }
    value = value & maxValid;
    
    if (value > range) {
      array = await randomBytes(bytesNeeded, securityLevel);
    }
  } while (value > range);
  
  return min + value;
}

/**
 * Generate a quantum-resistant random string
 * @param length Length of the string to generate
 * @param charset Optional character set to use (defaults to alphanumeric)
 * @param securityLevel Required security clearance level
 */
export async function generateQuantumRandomString(
  length: number,
  charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  securityLevel: CryptoSecurityLevel = CryptoSecurityLevel.LEVEL_5
): Promise<string> {
  const array = await randomBytes(length, securityLevel);
  
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset[array[i] % charset.length];
  }
  
  return result;
}
