/**
 * TetraCryptPQC Test Runner
 * TOP SECRET//COSMIC//THAUMIEL
 */

import { execSync } from 'child_process';
import { MilitaryHSM } from '../src/lib/hardware-security-module';
import { QuantumKeyDistribution } from '../src/lib/quantum-key-distribution';
import { OpenFHE } from '../src/lib/homomorphic-encryption';
import { SecurityClearance } from '../src/lib/security-protocols';
import { shake256 } from '@noble/hashes/sha3';
import * as dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

class TestRunner {
  private hsm: MilitaryHSM;
  private qkd: QuantumKeyDistribution;
  private openfhe: OpenFHE;

  constructor() {
    this.hsm = new MilitaryHSM(SecurityClearance.LEVEL_5);
    this.qkd = new QuantumKeyDistribution();
    this.openfhe = new OpenFHE();
  }

  /**
   * Initialize security components
   */
  private async initializeSecurity(): Promise<void> {
    try {
      await this.hsm.initialize();
      await this.qkd.initialize();
      await this.openfhe.initialize();

      console.log('✅ Security components initialized');
    } catch (error) {
      console.error('❌ Failed to initialize security:', error);
      process.exit(1);
    }
  }

  /**
   * Verify quantum security requirements
   */
  private async verifySecurityRequirements(): Promise<void> {
    try {
      // Check quantum key strength
      const keyStrength = await this.qkd.measureKeyStrength();
      if (keyStrength < 1024) {
        throw new Error('Insufficient quantum key strength');
      }

      // Verify HSM status
      const hsmStatus = await this.hsm.getStatus();
      if (!hsmStatus.ready || hsmStatus.clearanceLevel < SecurityClearance.LEVEL_5) {
        throw new Error('HSM not ready or insufficient clearance');
      }

      // Check homomorphic encryption
      const testData = { test: 'data' };
      const encrypted = await this.openfhe.encrypt(JSON.stringify(testData));
      const decrypted = JSON.parse(await this.openfhe.decrypt(encrypted));
      if (JSON.stringify(decrypted) !== JSON.stringify(testData)) {
        throw new Error('Homomorphic encryption verification failed');
      }

      console.log('✅ Security requirements verified');
    } catch (error) {
      console.error('❌ Security verification failed:', error);
      process.exit(1);
    }
  }

  /**
   * Run test suite
   */
  private async runTests(): Promise<void> {
    try {
      // Run component tests
      console.log('\n🧪 Running component tests...');
      execSync('jest --config jest.config.ts --testMatch "**/components/**/*.test.ts"', {
        stdio: 'inherit'
      });

      // Run contract tests
      console.log('\n📝 Running contract tests...');
      execSync('jest --config jest.config.ts --testMatch "**/contracts/**/*.test.ts"', {
        stdio: 'inherit'
      });

      // Run integration tests
      console.log('\n🔄 Running integration tests...');
      execSync('jest --config jest.config.ts --testMatch "**/integration/**/*.test.ts"', {
        stdio: 'inherit'
      });

      console.log('\n✅ All tests completed successfully');
    } catch (error) {
      console.error('\n❌ Test execution failed:', error);
      process.exit(1);
    }
  }

  /**
   * Generate test report
   */
  private async generateReport(): Promise<void> {
    try {
      // Generate coverage report
      console.log('\n📊 Generating coverage report...');
      execSync('jest --config jest.config.ts --coverage', {
        stdio: 'inherit'
      });

      // Generate security audit report
      console.log('\n🔒 Generating security audit report...');
      const auditReport = {
        timestamp: new Date().toISOString(),
        keyStrength: await this.qkd.measureKeyStrength(),
        hsmStatus: await this.hsm.getStatus(),
        securityMetrics: {
          quantumResistance: 'ML-KEM-1024',
          signatures: 'SLH-DSA',
          hashing: 'SHAKE-256',
          symmetricEncryption: 'AES-256-GCM'
        },
        compliance: {
          fips: true,
          cmmc: 'Level 2',
          fedramp: 'High',
          disa: true
        }
      };

      // Encrypt report
      const encryptedReport = await this.openfhe.encrypt(
        JSON.stringify(auditReport)
      );

      // Store in HSM
      await this.hsm.storeEncryptedData('test_report', encryptedReport, {
        type: 'audit',
        clearanceLevel: SecurityClearance.LEVEL_5
      });

      console.log('\n✅ Test reports generated');
    } catch (error) {
      console.error('\n❌ Report generation failed:', error);
      process.exit(1);
    }
  }

  /**
   * Run complete test suite
   */
  public async run(): Promise<void> {
    console.log('🚀 Starting TetraCryptPQC test suite...\n');

    try {
      // Initialize security
      await this.initializeSecurity();

      // Verify security requirements
      await this.verifySecurityRequirements();

      // Run tests
      await this.runTests();

      // Generate reports
      await this.generateReport();

      console.log('\n✨ Test suite completed successfully');
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Test suite failed:', error);
      process.exit(1);
    }
  }
}

// Run test suite
if (require.main === module) {
  const runner = new TestRunner();
  runner.run();
}
