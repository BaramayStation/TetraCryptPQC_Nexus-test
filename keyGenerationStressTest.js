import loadtest from 'loadtest';
import { generateKyberKeypair, generateFalconKeypair } from '../src/backend/crypto.js';

const options = {
  concurrency: 10, // Number of concurrent requests
  maxRequests: 100, // Total number of requests
  requestGenerator: async (params, options, client, callback) => {
    try {
      // Alternate between Kyber and Falcon key generation
      if (Math.random() < 0.5) {
        await generateKyberKeypair();
      } else {
        await generateFalconKeypair();
      }
      callback(null, { status: 'success' });
    } catch (error) {
      callback(error);
    }
  },
};

loadtest.loadTest(options, (error, results) => {
  if (error) {
    console.error('Stress test failed:', error);
  } else {
    console.log('Stress test results:', results);
  }
});
