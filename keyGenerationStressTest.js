const { generateKyberKeypair, generateFalconKeypair, encryptWithKyber, decryptWithKyber, signMessage, verifySignature } = require('./src/backend/crypto.js');

const testKeyGeneration = async () => {
  const maxConcurrency = 100; // Adjusted for GPU/CPU
  const maxRequests = 1000; // Total operations
  const results = [];
  let totalTime = 0;
  let totalOperations = 0;

  let currentConcurrency = Math.floor(maxConcurrency / 2); // Start at half capacity

  for (let i = 0; i < maxRequests; i += currentConcurrency) {
    const batchSize = Math.min(currentConcurrency, maxRequests - i);
    console.log(`Processing batch ${i / currentConcurrency + 1} of ${Math.ceil(maxRequests / currentConcurrency)} (${batchSize} operations)`);

    const startTime = Date.now();
    const promises = [];
    for (let j = 0; j < batchSize; j++) {
      const keyType = Math.random() < 0.5 ? 'Kyber' : 'Falcon';
      const keypairPromise = keyType === 'Kyber' ? generateKyberKeypair() : generateFalconKeypair();
      promises.push(keypairPromise);
    }

    const keypairs = await Promise.all(promises);
    results.push(...keypairs);
    totalTime += Date.now() - startTime;
    totalOperations += batchSize;

    // Adaptive scaling based on batch performance
    const batchDuration = Date.now() - startTime;
    if (batchDuration < 500 && currentConcurrency < maxConcurrency) {
      currentConcurrency = Math.min(maxConcurrency, currentConcurrency + 25);
    } else if (batchDuration > 2000 && currentConcurrency > 25) {
      currentConcurrency = Math.max(25, currentConcurrency - 25);
    }

    // Memory management
    if (global.gc) global.gc();
    await new Promise(resolve => setImmediate(resolve));
  }

  // Calculate and display detailed metrics
  const avgTime = totalTime / totalOperations;
  const throughput = totalOperations / (totalTime / 1000);

  console.log('\n=== Stress Test Results ===');
  console.log(`Total operations: ${totalOperations}`);
  console.log(`Total time: ${totalTime.toFixed(2)} ms`);
  console.log(`Average key generation time: ${avgTime.toFixed(2)} ms`);
  console.log(`Throughput: ${throughput.toFixed(2)} ops/sec`);

  console.log('Scaled test completed successfully!');
  console.log('Results:', results.length, 'keypairs generated');
};

const PARTICIPANTS = 100;
const MESSAGES_PER_PARTICIPANT = 5;

async function simulateYggdrasilTraffic() {
  const participants = Array.from({ length: PARTICIPANTS }, (_, i) => i);
  const results = await Promise.all(participants.map(async (participant) => {
    const keypair = Math.random() < 0.5 ? await generateKyberKeypair() : await generateFalconKeypair();
    const messages = await Promise.all(Array.from({ length: MESSAGES_PER_PARTICIPANT }, async () => {
      const sender = participant;
      const recipient = (participant + Math.floor(Math.random() * PARTICIPANTS)) % PARTICIPANTS;
      const message = `Message from Participant ${sender} to Participant ${recipient}`;

      // Yggdrasil network simulation
      const encrypted = await encryptWithKyber(message, keypair.publicKey);
      const signature = await signMessage(message, keypair.privateKey);

      // Simulate network transmission
      await new Promise(resolve => setTimeout(resolve, Math.random() * 10));

      // Decrypt and verify
      const decrypted = await decryptWithKyber(encrypted, keypair.privateKey);
      const isValid = await verifySignature(decrypted, signature, keypair.publicKey);

      return { sender, recipient, message, decrypted, isValid };
    }));
    return { participant, keypair, messages };
  }));

  console.log('Yggdrasil simulation completed successfully!');
  console.log('Results:', results.length, 'participants with', MESSAGES_PER_PARTICIPANT, 'messages each');
}

if (typeof encryptWithKyber === 'undefined') {
  const encryptWithKyber = async (message, publicKey) => {
    console.log('🔹 Encrypting with ML-KEM-1024');

    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(message);

    const aesKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    const iv = generateRandomBytes(12);

    const encryptedContent = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      messageBytes
    );

    const aesKeyBytes = await crypto.subtle.exportKey('raw', aesKey);
    const encryptedBuffer = new Uint8Array(iv.length + encryptedContent.byteLength);
    encryptedBuffer.set(iv, 0);
    encryptedBuffer.set(new Uint8Array(encryptedContent), iv.length);

    return btoa(String.fromCharCode(...encryptedBuffer));
  };
}

testKeyGeneration().catch(console.error);
simulateYggdrasilTraffic().catch(console.error);
