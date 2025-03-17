import { generateKeyPair as generateMLKEMKeyPair } from '@noble/ml-kem';
import { generateKeyPair as generateSLHDSAKeyPair } from '@noble/slh-dsa';
import { storeKeys } from './hardware-security-module';

/**
 * Generate ML-KEM key pair
 */
export async function generateMLKEMKeyPair() {
  return await generateMLKEMKeyPair(1024);
}

/**
 * Generate SLH-DSA key pair
 */
export async function generateSLHDSAKeyPair() {
  return await generateSLHDSAKeyPair(256);
}

/**
 * Store keys in Hardware Security Module
 */
export async function storeKeysInHSM(keys: {
  privateKey: Uint8Array,
  signingKey: Uint8Array
}) {
  await storeKeys({
    mlkem: keys.privateKey,
    slhdsa: keys.signingKey
  });
}
