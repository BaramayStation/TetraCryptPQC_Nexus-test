const { webcrypto } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const { createServer } = require('node:http');

// Test parameters
const ITERATIONS = 1000;
const CONCURRENT_REQUESTS = 100;
const LARGE_DATA_SIZE = 1024 * 1024 * 100; // 100MB

async function stressTest() {
  try {
    console.log('Starting stress test...');

    // Test 1: Cryptographic operations
    const cryptoStart = performance.now();
    await testCryptoOperations();
    const cryptoEnd = performance.now();
    console.log(`Crypto operations completed in ${(cryptoEnd - cryptoStart).toFixed(2)}ms`);

    // Test 2: Network stress
    const networkStart = performance.now();
    await testNetworkOperations();
    const networkEnd = performance.now();
    console.log(`Network operations completed in ${(networkEnd - networkStart).toFixed(2)}ms`);

    // Test 3: Memory stress
    const memoryStart = performance.now();
    await testMemoryOperations();
    const memoryEnd = performance.now();
    console.log(`Memory operations completed in ${(memoryEnd - memoryStart).toFixed(2)}ms`);

    console.log('All stress tests completed successfully!');
  } catch (error) {
    console.error('Stress test failed:', error);
  }
}

async function testCryptoOperations() {
  // Generate keys
  const keyPair = await webcrypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256'
    },
    true,
    ['sign', 'verify']
  );

  // Test signing/verification
  const data = new TextEncoder().encode('Test message');
  for (let i = 0; i < ITERATIONS; i++) {
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

    if (!isValid) {
      throw new Error('Signature verification failed');
    }
  }
}

async function testNetworkOperations() {
  // Create test server
  const server = createServer((req, res) => {
    res.end('OK');
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    // Make concurrent requests
    const requests = Array.from({ length: CONCURRENT_REQUESTS }, async () => {
      const response = await fetch(`http://localhost:${port}`);
      if (response.status !== 200) {
        throw new Error('Network request failed');
      }
    });

    await Promise.all(requests);
  } finally {
    server.close();
  }
}

async function testMemoryOperations() {
  // Test large data handling
  const largeData = new Uint8Array(LARGE_DATA_SIZE);
  for (let i = 0; i < ITERATIONS; i++) {
    const copy = new Uint8Array(largeData);
    if (copy.length !== largeData.length) {
      throw new Error('Memory copy failed');
    }
  }
}

stressTest().catch(console.error);
