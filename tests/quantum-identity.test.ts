import { generateMLKEMKeyPair, generateSLHDSAKeyPair } from '@/lib/quantum-identity';

describe('Quantum Identity', () => {
  test('should generate ML-KEM key pair', async () => {
    const { publicKey, privateKey } = await generateMLKEMKeyPair();
    expect(publicKey).toBeDefined();
    expect(privateKey).toBeDefined();
    expect(publicKey.length).toBeGreaterThan(0);
    expect(privateKey.length).toBeGreaterThan(0);
  });

  test('should generate SLH-DSA key pair', async () => {
    const { signingKey, verificationKey } = await generateSLHDSAKeyPair();
    expect(signingKey).toBeDefined();
    expect(verificationKey).toBeDefined();
    expect(signingKey.length).toBeGreaterThan(0);
    expect(verificationKey.length).toBeGreaterThan(0);
  });
});
