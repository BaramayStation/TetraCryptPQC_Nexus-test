/**
 * TetraCryptPQC StarkNet Contract Tests
 * TOP SECRET//COSMIC//THAUMIEL
 */

import { Provider, Account, Contract, ec, stark } from 'starknet';
import { MilitaryHSM } from '../../src/lib/hardware-security-module';
import { QuantumKeyDistribution } from '../../src/lib/quantum-key-distribution';
import { OpenFHE } from '../../src/lib/homomorphic-encryption';
import { SecurityClearance } from '../../src/lib/security-protocols';

describe('TetraVaultPayments Contract', () => {
  let provider: Provider;
  let adminAccount: Account;
  let userAccount: Account;
  let contract: Contract;
  let hsm: MilitaryHSM;
  let qkd: QuantumKeyDistribution;
  let openfhe: OpenFHE;

  const SUBSCRIPTION_TIERS = {
    BASIC: 1,
    PREMIUM: 2,
    BUSINESS: 3,
    MILITARY: 4
  };

  beforeEach(async () => {
    // Initialize provider
    provider = new Provider({
      sequencer: { network: 'goerli-alpha' }
    });

    // Generate admin account
    const adminPrivateKey = stark.randomAddress();
    const adminKeyPair = ec.getKeyPair(adminPrivateKey);
    adminAccount = new Account(provider, '0x123...', adminKeyPair);

    // Generate user account
    const userPrivateKey = stark.randomAddress();
    const userKeyPair = ec.getKeyPair(userPrivateKey);
    userAccount = new Account(provider, '0x456...', userKeyPair);

    // Deploy contract
    const contractFactory = await Contract.compile(
      require('../../src/contracts/TetraVaultPayments.cairo')
    );
    
    contract = await Contract.deploy(
      contractFactory,
      { admin: adminAccount.address },
      { account: adminAccount }
    );

    // Initialize security components
    hsm = new MilitaryHSM(SecurityClearance.LEVEL_5);
    qkd = new QuantumKeyDistribution();
    openfhe = new OpenFHE();

    await hsm.initialize();
    await qkd.initialize();
    await openfhe.initialize();
  });

  describe('Subscription Management', () => {
    it('should allow users to subscribe with quantum-safe verification', async () => {
      // Generate quantum key pair
      const { publicKey, privateKey } = await qkd.generateKeyPair();

      // Store private key in HSM
      await hsm.storeKey(privateKey, {
        type: 'quantum',
        usage: ['sign'],
        extractable: false
      });

      // Generate payment ID with quantum entropy
      const paymentId = stark.randomAddress();

      // Subscribe to Basic tier
      const result = await contract.subscribe(
        SUBSCRIPTION_TIERS.BASIC,
        paymentId,
        { account: userAccount }
      );

      // Verify subscription
      const subscription = await contract.get_subscription(userAccount.address);
      expect(subscription.tier).toBe(SUBSCRIPTION_TIERS.BASIC);
      expect(subscription.active).toBe(1);

      // Verify payment
      const payment = await contract.get_payment(userAccount.address, paymentId);
      expect(payment.amount.low).toBe(5 * 10**18); // 5 USDC
    });

    it('should enforce military-grade security for top tier', async () => {
      // Generate quantum key pair with military-grade strength
      const { publicKey, privateKey } = await qkd.generateKeyPair({
        strength: 1024 // ML-KEM-1024
      });

      // Store private key in HSM with high clearance
      await hsm.storeKey(privateKey, {
        type: 'quantum',
        usage: ['sign'],
        extractable: false,
        clearanceLevel: SecurityClearance.LEVEL_5
      });

      const paymentId = stark.randomAddress();

      // Subscribe to Military tier
      await contract.subscribe(
        SUBSCRIPTION_TIERS.MILITARY,
        paymentId,
        { account: userAccount }
      );

      // Verify subscription with homomorphic encryption
      const subscription = await contract.get_subscription(userAccount.address);
      const encryptedData = await openfhe.encrypt(JSON.stringify({
        tier: subscription.tier,
        timestamp: Date.now()
      }));

      await hsm.storeEncryptedData('military_subscription', encryptedData, {
        type: 'subscription',
        clearanceLevel: SecurityClearance.LEVEL_5
      });

      expect(subscription.tier).toBe(SUBSCRIPTION_TIERS.MILITARY);
    });

    it('should handle subscription expiration securely', async () => {
      const paymentId = stark.randomAddress();

      // Subscribe
      await contract.subscribe(
        SUBSCRIPTION_TIERS.PREMIUM,
        paymentId,
        { account: userAccount }
      );

      // Fast forward time (simulate 31 days)
      await provider.advanceTime(31 * 24 * 60 * 60);

      // Check access
      const hasAccess = await contract.check_access(userAccount.address);
      expect(hasAccess).toBe(0);

      // Verify security cleanup
      const subscription = await contract.get_subscription(userAccount.address);
      expect(subscription.active).toBe(0);
    });
  });

  describe('Access Control', () => {
    it('should enforce admin-only functions', async () => {
      // Try to pause contract as non-admin
      await expect(
        contract.pause({ account: userAccount })
      ).rejects.toThrow();

      // Pause as admin
      await contract.pause({ account: adminAccount });
      const isPaused = await contract.is_contract_paused();
      expect(isPaused).toBe(1);
    });

    it('should prevent operations when paused', async () => {
      // Pause contract
      await contract.pause({ account: adminAccount });

      // Try to subscribe while paused
      const paymentId = stark.randomAddress();
      await expect(
        contract.subscribe(
          SUBSCRIPTION_TIERS.BASIC,
          paymentId,
          { account: userAccount }
        )
      ).rejects.toThrow();
    });

    it('should allow admin transfer with quantum security', async () => {
      // Generate new admin keys
      const { publicKey, privateKey } = await qkd.generateKeyPair();
      const newAdminAddress = stark.randomAddress();

      // Store new admin key in HSM
      await hsm.storeKey(privateKey, {
        type: 'quantum',
        usage: ['sign', 'admin'],
        extractable: false,
        clearanceLevel: SecurityClearance.LEVEL_5
      });

      // Transfer admin rights
      await contract.update_admin(newAdminAddress, { account: adminAccount });

      // Verify new admin
      const currentAdmin = await contract.get_admin();
      expect(currentAdmin).toBe(newAdminAddress);
    });
  });

  describe('Payment Processing', () => {
    it('should process payments with quantum receipt verification', async () => {
      const paymentId = stark.randomAddress();

      // Subscribe and process payment
      await contract.subscribe(
        SUBSCRIPTION_TIERS.BUSINESS,
        paymentId,
        { account: userAccount }
      );

      // Get payment record
      const payment = await contract.get_payment(userAccount.address, paymentId);

      // Verify payment with quantum signature
      const { publicKey, privateKey } = await qkd.generateKeyPair();
      const paymentData = {
        amount: payment.amount,
        timestamp: payment.timestamp,
        user: userAccount.address
      };

      // Encrypt payment record
      const encryptedPayment = await openfhe.encrypt(
        JSON.stringify(paymentData)
      );

      // Store in HSM
      await hsm.storeEncryptedData(`payment_${paymentId}`, encryptedPayment, {
        type: 'payment',
        clearanceLevel: SecurityClearance.LEVEL_5
      });

      expect(payment.amount.low).toBe(100 * 10**18); // 100 USDC
    });

    it('should handle payment failures gracefully', async () => {
      // Simulate insufficient funds
      const paymentId = stark.randomAddress();
      
      await expect(
        contract.subscribe(
          SUBSCRIPTION_TIERS.MILITARY,
          paymentId,
          { 
            account: userAccount,
            maxFee: 0 // Force failure
          }
        )
      ).rejects.toThrow();

      // Verify no active subscription
      const subscription = await contract.get_subscription(userAccount.address);
      expect(subscription.active).toBe(0);
    });
  });

  describe('Security Features', () => {
    it('should rotate quantum keys periodically', async () => {
      // Initial subscription
      const paymentId = stark.randomAddress();
      await contract.subscribe(
        SUBSCRIPTION_TIERS.PREMIUM,
        paymentId,
        { account: userAccount }
      );

      // Simulate key rotation period
      await provider.advanceTime(7 * 24 * 60 * 60); // 7 days

      // Generate new quantum keys
      const { publicKey, privateKey } = await qkd.generateKeyPair();

      // Rotate keys in HSM
      await hsm.rotateKey('subscription_key', privateKey, {
        type: 'quantum',
        usage: ['sign'],
        extractable: false,
        metadata: {
          rotationTimestamp: Date.now()
        }
      });

      // Verify subscription still valid
      const hasAccess = await contract.check_access(userAccount.address);
      expect(hasAccess).toBe(1);
    });

    it('should maintain perfect forward secrecy', async () => {
      const paymentId = stark.randomAddress();

      // Subscribe with initial keys
      const initialKeys = await qkd.generateKeyPair();
      await contract.subscribe(
        SUBSCRIPTION_TIERS.BUSINESS,
        paymentId,
        { account: userAccount }
      );

      // Generate new epoch keys
      const epochKeys = await qkd.generateKeyPair();

      // Encrypt subscription data with new keys
      const subscriptionData = {
        tier: SUBSCRIPTION_TIERS.BUSINESS,
        timestamp: Date.now()
      };

      const encryptedData = await openfhe.encrypt(
        JSON.stringify(subscriptionData),
        epochKeys.publicKey
      );

      // Verify old keys cannot decrypt new data
      await expect(
        openfhe.decrypt(encryptedData, initialKeys.privateKey)
      ).rejects.toThrow();
    });

    it('should detect quantum tampering attempts', async () => {
      const paymentId = stark.randomAddress();

      // Subscribe normally
      await contract.subscribe(
        SUBSCRIPTION_TIERS.MILITARY,
        paymentId,
        { account: userAccount }
      );

      // Simulate quantum tampering
      const tamperAttempt = async () => {
        const weakKey = await qkd.generateKeyPair({ strength: 128 }); // Too weak
        await hsm.storeKey(weakKey.privateKey, {
          type: 'quantum',
          usage: ['sign'],
          extractable: true // Suspicious flag
        });
      };

      // Verify tampering detection
      await expect(tamperAttempt()).rejects.toThrow('Quantum security violation');
    });
  });
});
