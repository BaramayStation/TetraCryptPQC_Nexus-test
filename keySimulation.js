import { webcrypto } from 'node:crypto';

async function simulateKeyIssues() {
  // Key generation
  const keyPair = await webcrypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256'
    },
    true,
    ['sign', 'verify']
  );

  // Simulate storage
  const exportedPublicKey = await webcrypto.subtle.exportKey('spki', keyPair.publicKey);
  const exportedPrivateKey = await webcrypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  // Test encryption/decryption
  const data = new TextEncoder().encode('Test message');
  const signature = await webcrypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-256' }
    },
    keyPair.privateKey,
    data
  );

  const isValid = await webcrypto.subtle.verify(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-256' }
    },
    keyPair.publicKey,
    signature,
    data
  );

  console.log('Key simulation completed. Signature valid:', isValid);
}

simulateKeyIssues().catch(console.error);
