/**
 * TetraCryptPQC PaymentFlow Tests
 * TOP SECRET//COSMIC//THAUMIEL
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import { PaymentFlow } from '../../src/components/PaymentFlow';
import { MilitaryHSM } from '../../src/lib/hardware-security-module';
import { QuantumKeyDistribution } from '../../src/lib/quantum-key-distribution';
import { OpenFHE } from '../../src/lib/homomorphic-encryption';
import { starknet } from '../../src/lib/starknet-integration';
import { SecurityClearance } from '../../src/lib/security-protocols';
import { PaymentStatus } from '../../src/lib/starknet-integration';

// Mock StarkNet dependencies
jest.mock('@starknet-react/core', () => ({
  useAccount: () => ({
    account: {
      address: '0x123...',
      provider: {}
    }
  })
}));

// Mock security components
jest.mock('../../src/lib/hardware-security-module');
jest.mock('../../src/lib/quantum-key-distribution');
jest.mock('../../src/lib/homomorphic-encryption');
jest.mock('../../src/lib/starknet-integration');

describe('PaymentFlow Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock implementations
    (MilitaryHSM as jest.Mock).mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      storeKey: jest.fn().mockResolvedValue(undefined),
      storeEncryptedData: jest.fn().mockResolvedValue(undefined),
      getEncryptedData: jest.fn().mockResolvedValue('encrypted-subscription-data')
    }));

    (QuantumKeyDistribution as jest.Mock).mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      generateKeyPair: jest.fn().mockResolvedValue({
        publicKey: 'mock-public-key',
        privateKey: 'mock-private-key'
      })
    }));

    (OpenFHE as jest.Mock).mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      encrypt: jest.fn().mockResolvedValue('encrypted-data'),
      decrypt: jest.fn().mockResolvedValue(JSON.stringify({
        tier: 1,
        timestamp: Date.now()
      }))
    }));

    (starknet.processPayment as jest.Mock).mockResolvedValue({
      status: PaymentStatus.COMPLETED,
      transactionHash: '0xabc...'
    });

    (starknet.checkAccess as jest.Mock).mockResolvedValue({
      hasAccess: true,
      tier: 1,
      expiration: Date.now() + 30 * 24 * 60 * 60 * 1000
    });
  });

  it('should initialize security components and load subscription data', async () => {
    await act(async () => {
      render(<PaymentFlow />);
    });

    const hsm = new MilitaryHSM(SecurityClearance.LEVEL_5);
    const qkd = new QuantumKeyDistribution();
    const openfhe = new OpenFHE();

    expect(hsm.initialize).toHaveBeenCalled();
    expect(qkd.initialize).toHaveBeenCalled();
    expect(openfhe.initialize).toHaveBeenCalled();
    expect(starknet.checkAccess).toHaveBeenCalledWith('0x123...');
  });

  it('should handle tier selection with quantum security', async () => {
    await act(async () => {
      render(<PaymentFlow />);
    });

    // Select Military tier
    const militaryTier = screen.getByText('Military');
    await act(async () => {
      fireEvent.click(militaryTier);
    });

    expect(screen.getByText('$1000 USDC')).toBeInTheDocument();
    expect(screen.getByText('Top Secret Clearance')).toBeInTheDocument();
    expect(screen.getByText('Quantum Key Distribution')).toBeInTheDocument();
  });

  it('should process payment with quantum-safe encryption', async () => {
    await act(async () => {
      render(<PaymentFlow />);
    });

    // Select Premium tier
    const premiumTier = screen.getByText('Premium');
    await act(async () => {
      fireEvent.click(premiumTier);
    });

    // Process payment
    const subscribeButton = screen.getByText(/Subscribe to Premium/);
    await act(async () => {
      fireEvent.click(subscribeButton);
    });

    const qkd = new QuantumKeyDistribution();
    const hsm = new MilitaryHSM(SecurityClearance.LEVEL_5);
    const openfhe = new OpenFHE();

    expect(qkd.generateKeyPair).toHaveBeenCalled();
    expect(hsm.storeKey).toHaveBeenCalledWith(
      'mock-private-key',
      expect.objectContaining({
        type: 'quantum',
        usage: ['sign'],
        extractable: false
      })
    );
    expect(starknet.processPayment).toHaveBeenCalledWith(
      '0x123...',
      2,
      '10'
    );
    expect(openfhe.encrypt).toHaveBeenCalled();
    expect(hsm.storeEncryptedData).toHaveBeenCalledWith(
      'subscription_data',
      'encrypted-data',
      expect.objectContaining({
        type: 'subscription',
        clearanceLevel: SecurityClearance.LEVEL_2
      })
    );
  });

  it('should handle payment failures securely', async () => {
    // Mock payment failure
    (starknet.processPayment as jest.Mock).mockResolvedValue({
      status: PaymentStatus.FAILED,
      error: 'Quantum verification failed'
    });

    await act(async () => {
      render(<PaymentFlow />);
    });

    // Select Basic tier
    const basicTier = screen.getByText('Basic');
    await act(async () => {
      fireEvent.click(basicTier);
    });

    // Attempt payment
    const subscribeButton = screen.getByText(/Subscribe to Basic/);
    await act(async () => {
      fireEvent.click(subscribeButton);
    });

    expect(screen.getByText('Quantum verification failed')).toBeInTheDocument();
  });

  it('should enforce military-grade security for high-tier subscriptions', async () => {
    await act(async () => {
      render(<PaymentFlow />);
    });

    // Select Military tier
    const militaryTier = screen.getByText('Military');
    await act(async () => {
      fireEvent.click(militaryTier);
    });

    // Process payment
    const subscribeButton = screen.getByText(/Subscribe to Military/);
    await act(async () => {
      fireEvent.click(subscribeButton);
    });

    const hsm = new MilitaryHSM(SecurityClearance.LEVEL_5);
    expect(hsm.storeEncryptedData).toHaveBeenCalledWith(
      'subscription_data',
      'encrypted-data',
      expect.objectContaining({
        type: 'subscription',
        clearanceLevel: SecurityClearance.LEVEL_5
      })
    );
  });

  it('should validate quantum key strength before payment', async () => {
    // Mock weak key generation
    (QuantumKeyDistribution as jest.Mock).mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      generateKeyPair: jest.fn().mockResolvedValue({
        publicKey: 'weak-public-key',
        privateKey: 'weak-private-key',
        strength: 128 // Too weak for military-grade
      })
    }));

    await act(async () => {
      render(<PaymentFlow />);
    });

    // Select Military tier
    const militaryTier = screen.getByText('Military');
    await act(async () => {
      fireEvent.click(militaryTier);
    });

    // Attempt payment
    const subscribeButton = screen.getByText(/Subscribe to Military/);
    await act(async () => {
      fireEvent.click(subscribeButton);
    });

    expect(screen.getByText('Insufficient quantum key strength for military-grade security')).toBeInTheDocument();
  });

  it('should handle subscription upgrades with secure key rotation', async () => {
    // Mock existing subscription
    (starknet.checkAccess as jest.Mock).mockResolvedValue({
      hasAccess: true,
      tier: 1,
      expiration: Date.now() + 15 * 24 * 60 * 60 * 1000
    });

    await act(async () => {
      render(<PaymentFlow />);
    });

    // Select Premium tier (upgrade from Basic)
    const premiumTier = screen.getByText('Premium');
    await act(async () => {
      fireEvent.click(premiumTier);
    });

    // Process upgrade
    const upgradeButton = screen.getByText(/Subscribe to Premium/);
    await act(async () => {
      fireEvent.click(upgradeButton);
    });

    const qkd = new QuantumKeyDistribution();
    const hsm = new MilitaryHSM(SecurityClearance.LEVEL_5);

    expect(qkd.generateKeyPair).toHaveBeenCalled();
    expect(hsm.storeKey).toHaveBeenCalled();
    expect(starknet.processPayment).toHaveBeenCalledWith(
      '0x123...',
      2,
      '10'
    );
  });
});
