/**
 * TetraCryptPQC SubscriptionManager Tests
 * TOP SECRET//COSMIC//THAUMIEL
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import { SubscriptionManager } from '../../src/components/SubscriptionManager';
import { MilitaryHSM } from '../../src/lib/hardware-security-module';
import { QuantumKeyDistribution } from '../../src/lib/quantum-key-distribution';
import { OpenFHE } from '../../src/lib/homomorphic-encryption';
import { starknet } from '../../src/lib/starknet-integration';
import { SecurityClearance } from '../../src/lib/security-protocols';

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

describe('SubscriptionManager Component', () => {
  const mockSubscriptionData = {
    tier: 4, // Military tier
    expiration: Date.now() + 30 * 24 * 60 * 60 * 1000,
    features: [
      'Top Secret Clearance',
      'Quantum Key Distribution',
      'Homomorphic Encryption',
      'AI Security Orchestration',
      'Custom Hardware Integration',
      'Dedicated Security Team'
    ],
    clearanceLevel: SecurityClearance.LEVEL_5,
    paymentHistory: [
      {
        amount: '1000',
        timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000,
        transactionHash: '0xdef...'
      }
    ]
  };

  const mockSecurityMetrics = {
    quantumKeyStrength: 1024,
    lastKeyRotation: Date.now() - 12 * 60 * 60 * 1000,
    activeSecurityZones: 3,
    threatLevel: 'LOW' as const
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock implementations
    (MilitaryHSM as jest.Mock).mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      getEncryptedData: jest.fn().mockResolvedValue('encrypted-subscription-data'),
      getKeyMetadata: jest.fn().mockResolvedValue({
        lastRotation: mockSecurityMetrics.lastKeyRotation
      }),
      getActiveSecurityZones: jest.fn().mockResolvedValue([
        { id: 1, status: 'active' },
        { id: 2, status: 'active' },
        { id: 3, status: 'active' }
      ]),
      rotateKey: jest.fn().mockResolvedValue(undefined),
      storeKey: jest.fn().mockResolvedValue(undefined)
    }));

    (QuantumKeyDistribution as jest.Mock).mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      generateKeyPair: jest.fn().mockResolvedValue({
        publicKey: 'mock-public-key',
        privateKey: 'mock-private-key'
      }),
      measureKeyStrength: jest.fn().mockResolvedValue(1024)
    }));

    (OpenFHE as jest.Mock).mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      decrypt: jest.fn().mockResolvedValue(JSON.stringify(mockSubscriptionData))
    }));

    (starknet.checkAccess as jest.Mock).mockResolvedValue({
      hasAccess: true,
      tier: mockSubscriptionData.tier,
      expiration: mockSubscriptionData.expiration
    });

    (starknet.getPaymentHistory as jest.Mock).mockResolvedValue(
      mockSubscriptionData.paymentHistory[0]
    );
  });

  it('should initialize with quantum-safe security components', async () => {
    await act(async () => {
      render(<SubscriptionManager />);
    });

    const hsm = new MilitaryHSM(SecurityClearance.LEVEL_5);
    const qkd = new QuantumKeyDistribution();
    const openfhe = new OpenFHE();

    expect(hsm.initialize).toHaveBeenCalled();
    expect(qkd.initialize).toHaveBeenCalled();
    expect(openfhe.initialize).toHaveBeenCalled();
  });

  it('should load and decrypt subscription data securely', async () => {
    await act(async () => {
      render(<SubscriptionManager />);
    });

    const hsm = new MilitaryHSM(SecurityClearance.LEVEL_5);
    const openfhe = new OpenFHE();

    expect(hsm.getEncryptedData).toHaveBeenCalledWith(
      'subscription_data',
      expect.objectContaining({
        type: 'subscription',
        clearanceLevel: SecurityClearance.LEVEL_5
      })
    );
    expect(openfhe.decrypt).toHaveBeenCalledWith('encrypted-subscription-data');

    // Verify displayed data
    expect(screen.getByText('Military')).toBeInTheDocument();
    expect(screen.getByText('Level 5')).toBeInTheDocument();
    mockSubscriptionData.features.forEach(feature => {
      expect(screen.getByText(feature)).toBeInTheDocument();
    });
  });

  it('should calculate and display security metrics', async () => {
    await act(async () => {
      render(<SubscriptionManager />);
    });

    const qkd = new QuantumKeyDistribution();
    const hsm = new MilitaryHSM(SecurityClearance.LEVEL_5);

    expect(qkd.measureKeyStrength).toHaveBeenCalled();
    expect(hsm.getKeyMetadata).toHaveBeenCalledWith('subscription_key');
    expect(hsm.getActiveSecurityZones).toHaveBeenCalled();

    // Verify displayed metrics
    expect(screen.getByText('1024 bits')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('LOW')).toBeInTheDocument();
  });

  it('should handle quantum key rotation', async () => {
    await act(async () => {
      render(<SubscriptionManager />);
    });

    const rotateButton = screen.getByText('Rotate Keys');
    await act(async () => {
      fireEvent.click(rotateButton);
    });

    const qkd = new QuantumKeyDistribution();
    const hsm = new MilitaryHSM(SecurityClearance.LEVEL_5);

    expect(qkd.generateKeyPair).toHaveBeenCalled();
    expect(hsm.rotateKey).toHaveBeenCalledWith(
      'subscription_key',
      'mock-private-key',
      expect.objectContaining({
        type: 'quantum',
        usage: ['sign'],
        extractable: false
      })
    );
  });

  it('should enforce military-grade security for top-tier subscriptions', async () => {
    // Mock insufficient key strength
    (QuantumKeyDistribution as jest.Mock).mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      measureKeyStrength: jest.fn().mockResolvedValue(256), // Too weak
      generateKeyPair: jest.fn().mockResolvedValue({
        publicKey: 'weak-public-key',
        privateKey: 'weak-private-key'
      })
    }));

    await act(async () => {
      render(<SubscriptionManager />);
    });

    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
  });

  it('should handle payment history securely', async () => {
    await act(async () => {
      render(<SubscriptionManager />);
    });

    expect(starknet.getPaymentHistory).toHaveBeenCalledWith(
      '0x123...',
      expect.any(String)
    );

    // Verify displayed payment history
    expect(screen.getByText('1000 USDC')).toBeInTheDocument();
    expect(screen.getByText('0xdef...')).toBeInTheDocument();
  });

  it('should maintain security during subscription updates', async () => {
    // Mock subscription update
    const updatedData = {
      ...mockSubscriptionData,
      tier: 3, // Downgrade to Business
      clearanceLevel: SecurityClearance.LEVEL_3
    };

    (OpenFHE as jest.Mock).mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      decrypt: jest.fn()
        .mockResolvedValueOnce(JSON.stringify(mockSubscriptionData))
        .mockResolvedValueOnce(JSON.stringify(updatedData))
    }));

    await act(async () => {
      render(<SubscriptionManager />);
    });

    // Simulate subscription update
    await act(async () => {
      (starknet.checkAccess as jest.Mock).mockResolvedValueOnce({
        hasAccess: true,
        tier: 3,
        expiration: Date.now() + 30 * 24 * 60 * 60 * 1000
      });
    });

    expect(screen.getByText('Business')).toBeInTheDocument();
    expect(screen.getByText('Level 3')).toBeInTheDocument();
  });

  it('should handle security zone changes', async () => {
    await act(async () => {
      render(<SubscriptionManager />);
    });

    // Simulate security zone change
    await act(async () => {
      const hsm = new MilitaryHSM(SecurityClearance.LEVEL_5);
      (hsm.getActiveSecurityZones as jest.Mock).mockResolvedValueOnce([
        { id: 1, status: 'active' },
        { id: 2, status: 'compromised' },
        { id: 3, status: 'active' }
      ]);
    });

    expect(screen.getByText('HIGH')).toBeInTheDocument();
  });
});
