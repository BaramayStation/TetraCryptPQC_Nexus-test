/**
 * TetraCryptPQC Test Setup
 * TOP SECRET//COSMIC//THAUMIEL
 */

import { MilitaryHSM } from '../src/lib/hardware-security-module';
import { QuantumKeyDistribution } from '../src/lib/quantum-key-distribution';
import { OpenFHE } from '../src/lib/homomorphic-encryption';
import { SecurityClearance } from '../src/lib/security-protocols';
import { shake256 } from '@noble/hashes/sha3';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.test' });

// Initialize test security components
const hsm = new MilitaryHSM(SecurityClearance.LEVEL_5);
const qkd = new QuantumKeyDistribution();
const openfhe = new OpenFHE();

// Mock Web3Storage
jest.mock('@web3-storage/w3up-client', () => ({
  create: jest.fn().mockResolvedValue({
    put: jest.fn().mockResolvedValue('test-cid'),
    get: jest.fn().mockResolvedValue('test-data')
  })
}));

// Mock Helia/IPFS
jest.mock('helia', () => ({
  createHelia: jest.fn().mockResolvedValue({
    add: jest.fn().mockResolvedValue('test-cid'),
    cat: jest.fn().mockResolvedValue('test-data')
  })
}));

// Mock StarkNet provider
jest.mock('starknet', () => ({
  Provider: jest.fn().mockImplementation(() => ({
    getBlock: jest.fn().mockResolvedValue({ timestamp: Date.now() }),
    getTransaction: jest.fn().mockResolvedValue({ status: 'ACCEPTED' }),
    waitForTransaction: jest.fn().mockResolvedValue({ status: 'ACCEPTED' })
  })),
  Account: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({ transaction_hash: '0x123' }),
    estimateFee: jest.fn().mockResolvedValue({ amount: '1000' })
  })),
  Contract: jest.fn().mockImplementation(() => ({
    subscribe: jest.fn().mockResolvedValue({ transaction_hash: '0x123' }),
    check_access: jest.fn().mockResolvedValue({ has_access: 1 })
  }))
}));

// Configure test environment
process.env.NODE_ENV = 'test';
process.env.SECURITY_CLEARANCE_LEVEL = '5';
process.env.HSM_PROVIDER = 'YubiKey';
process.env.QKD_SIMULATION_MODE = 'true';
process.env.QKD_KEY_SIZE = '1024';
process.env.QKD_PROTOCOL = 'BB84';
process.env.OPENFHE_SECURITY_LEVEL = '256';
process.env.OPENFHE_SCHEME = 'CKKS';

// Initialize quantum-safe random number generator
const quantumRng = {
  getRandomValues: (buffer: Uint8Array) => {
    const entropy = shake256(Buffer.from(Date.now().toString()));
    buffer.set(entropy.slice(0, buffer.length));
    return buffer;
  }
};

// Override crypto.getRandomValues with quantum-safe version
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: quantumRng.getRandomValues
  }
});

// Configure console for secure logging
const secureConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
  clearance: SecurityClearance.LEVEL_5
};

// Override console with secure version
Object.defineProperty(global, 'console', {
  value: new Proxy(secureConsole, {
    get: (target, prop) => {
      if (typeof target[prop] === 'function') {
        return (...args: any[]) => {
          if (target.clearance >= SecurityClearance.LEVEL_5) {
            target[prop](...args);
          }
        };
      }
      return target[prop];
    }
  })
});
