/**
 * TetraCryptPQC StarkNet Deployment Script
 * TOP SECRET//COSMIC//THAUMIEL
 * 
 * Deploys and configures the TetraVaultPayments smart contract
 */

import { Provider, Account, Contract, ec, json } from 'starknet';
import { SecurityClearance } from '../src/lib/security-protocols';
import { MilitaryHSM } from '../src/lib/hardware-security-module';
import { SecurityZone } from '../src/lib/security-zone-manager';
import { QuantumKeyDistribution } from '../src/lib/quantum-key-distribution';
import { OpenFHE } from '../src/lib/homomorphic-encryption';
import { shake256 } from '@noble/hashes/sha3';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Contract configuration
 */
interface ContractConfig {
  network: 'testnet' | 'mainnet';
  adminAddress: string;
  privateKey: string;
}

/**
 * Deployment result
 */
interface DeploymentResult {
  success: boolean;
  contractAddress?: string;
  transactionHash?: string;
  error?: string;
}

/**
 * StarkNet deployment implementation
 */
export class StarkNetDeployment {
  private provider: Provider;
  private account: Account;
  private hsm: MilitaryHSM;
  private qkd: QuantumKeyDistribution;
  private openfhe: OpenFHE;
  private initialized: boolean = false;

  constructor() {
    this.hsm = new MilitaryHSM(SecurityClearance.LEVEL_5);
    this.qkd = new QuantumKeyDistribution();
    this.openfhe = new OpenFHE();
  }

  /**
   * Initialize deployment
   */
  public async initialize(config: ContractConfig): Promise<void> {
    console.log("🔒 Initializing StarkNet Deployment");

    try {
      // Initialize provider
      this.provider = new Provider({
        sequencer: {
          network: config.network === 'mainnet' ? 'mainnet-alpha' : 'goerli-alpha'
        }
      });

      // Initialize account
      const privateKeyPair = ec.getKeyPair(config.privateKey);
      this.account = new Account(
        this.provider,
        config.adminAddress,
        privateKeyPair
      );

      // Initialize HSM
      await this.hsm.initialize();

      // Initialize QKD
      await this.qkd.initialize();

      // Initialize OpenFHE
      await this.openfhe.initialize();

      this.initialized = true;
      console.log("✅ StarkNet Deployment initialized");
    } catch (error) {
      console.error("❌ Failed to initialize StarkNet Deployment:", error);
      throw error;
    }
  }

  /**
   * Deploy contract
   */
  public async deploy(config: ContractConfig): Promise<DeploymentResult> {
    if (!this.initialized) {
      throw new Error("StarkNet Deployment not initialized");
    }

    try {
      console.log("🚀 Deploying TetraVaultPayments contract");

      // Generate quantum key pair
      const { publicKey, privateKey } = await this.qkd.generateKeyPair();

      // Compile contract
      console.log("📝 Compiling contract...");
      const compiledContract = json.parse(
        require('../src/contracts/TetraVaultPayments.json')
      );

      // Deploy contract
      console.log("🌟 Deploying contract...");
      const { contract_address, transaction_hash } = await this.account.deploy({
        contract: compiledContract,
        constructorCalldata: [config.adminAddress]
      });

      // Store deployment key in HSM
      await this.hsm.storeKey(privateKey, {
        type: 'quantum',
        usage: ['sign'],
        extractable: false,
        metadata: {
          contractAddress: contract_address,
          network: config.network
        }
      });

      console.log("✅ Contract deployed successfully!");
      console.log("📍 Contract address:", contract_address);
      console.log("🔗 Transaction hash:", transaction_hash);

      return {
        success: true,
        contractAddress: contract_address,
        transactionHash: transaction_hash
      };
    } catch (error) {
      console.error("❌ Failed to deploy contract:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Verify contract
   */
  public async verifyContract(
    contractAddress: string,
    config: ContractConfig
  ): Promise<boolean> {
    if (!this.initialized) {
      throw new Error("StarkNet Deployment not initialized");
    }

    try {
      console.log("🔍 Verifying contract deployment");

      // Create contract instance
      const contract = new Contract(
        require('../src/contracts/TetraVaultPayments.json').abi,
        contractAddress,
        this.provider
      );

      // Verify admin address
      const admin = await contract.get_admin();
      if (admin.toString() !== config.adminAddress) {
        throw new Error("Admin address mismatch");
      }

      // Verify contract is not paused
      const paused = await contract.is_contract_paused();
      if (paused.toNumber() !== 0) {
        throw new Error("Contract is paused");
      }

      // Verify tier prices
      const tiers = [1, 2, 3, 4];
      for (const tier of tiers) {
        const price = await contract.get_tier_price(tier);
        if (price.toNumber() === 0) {
          throw new Error(`Tier ${tier} price not set`);
        }
      }

      console.log("✅ Contract verification successful!");
      return true;
    } catch (error) {
      console.error("❌ Contract verification failed:", error);
      return false;
    }
  }

  /**
   * Check if initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
}

// Main deployment script
async function main() {
  try {
    // Load configuration
    const config: ContractConfig = {
      network: process.env.STARKNET_NETWORK as 'testnet' | 'mainnet',
      adminAddress: process.env.STARKNET_ADMIN_ADDRESS!,
      privateKey: process.env.STARKNET_PRIVATE_KEY!
    };

    // Create deployment instance
    const deployment = new StarkNetDeployment();

    // Initialize deployment
    await deployment.initialize(config);

    // Deploy contract
    const result = await deployment.deploy(config);
    if (!result.success || !result.contractAddress) {
      throw new Error("Deployment failed");
    }

    // Verify contract
    const verified = await deployment.verifyContract(result.contractAddress, config);
    if (!verified) {
      throw new Error("Verification failed");
    }

    console.log("🎉 Deployment completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

// Run deployment
if (require.main === module) {
  main();
}
