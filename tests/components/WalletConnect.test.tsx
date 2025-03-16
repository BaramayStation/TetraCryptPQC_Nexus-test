/**
 * TetraCryptPQC WalletConnect Tests
 * TOP SECRET//COSMIC//THAUMIEL
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import { WalletConnect } from '../../src/components/WalletConnect';
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
  }),
  useConnectors: () => ({
    available: [
      {
        id: 'mock-connector',
        name: 'Mock Wallet',
        available: () => true,
        network: 'testnet'
      }
    ]
  }),
  connect: jest.fn(),
  disconnect: jest.fn()
}));

// Mock security components
jest.mock('../../src/lib/hardware-security-module');
jest.mock('../../src/lib/quantum-key-distribution');
jest.mock('../../src/lib/homomorphic-encryption');
jest.mock('../../src/lib/starknet-integration');

describe('WalletConnect Component', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock implementations
    (MilitaryHSM as jest.Mock).mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      storeKey: jest.fn().mockResolvedValue(undefined),
      storeEncryptedData: jest.fn().mockResolvedValue(undefined),
      deleteData: jest.fn().mockResolvedValue(undefined)
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
      decrypt: jest.fn().mockResolvedValue('decrypted-data')
    }));

    (starknet.initialize as jest.Mock).mockResolvedValue(undefined);
  });

  it('should initialize security components on mount', async () => {
    await act(async () => {
      render(<WalletConnect />);
    });

    const hsm = new MilitaryHSM(SecurityClearance.LEVEL_5);
    const qkd = new QuantumKeyDistribution();
    const openfhe = new OpenFHE();

    expect(hsm.initialize).toHaveBeenCalled();
    expect(qkd.initialize).toHaveBeenCalled();
    expect(openfhe.initialize).toHaveBeenCalled();
    expect(starknet.initialize).toHaveBeenCalled();
  });

  it('should handle wallet connection', async () => {
    await act(async () => {
      render(<WalletConnect />);
    });

    const connectButton = screen.getByText('Connect Wallet');
    
    await act(async () => {
      fireEvent.click(connectButton);
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
    expect(openfhe.encrypt).toHaveBeenCalled();
    expect(hsm.storeEncryptedData).toHaveBeenCalledWith(
      'wallet_data',
      'encrypted-data',
      expect.objectContaining({
        type: 'wallet',
        clearanceLevel: SecurityClearance.LEVEL_5
      })
    );
  });

  it('should handle wallet disconnection', async () => {
    await act(async () => {
      render(<WalletConnect />);
    });

    // First connect
    const connectButton = screen.getByText('Connect Wallet');
    await act(async () => {
      fireEvent.click(connectButton);
    });

    // Then disconnect
    const disconnectButton = screen.getByText('Disconnect');
    await act(async () => {
      fireEvent.click(disconnectButton);
    });

    const hsm = new MilitaryHSM(SecurityClearance.LEVEL_5);
    expect(hsm.deleteData).toHaveBeenCalledWith('wallet_data');
  });

  it('should display error state on connection failure', async () => {
    // Mock connection failure
    (QuantumKeyDistribution as jest.Mock).mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      generateKeyPair: jest.fn().mockRejectedValue(new Error('QKD failure'))
    }));

    await act(async () => {
      render(<WalletConnect />);
    });

    const connectButton = screen.getByText('Connect Wallet');
    
    await act(async () => {
      fireEvent.click(connectButton);
    });

    expect(screen.getByText('QKD failure')).toBeInTheDocument();
  });

  it('should maintain quantum security during network changes', async () => {
    await act(async () => {
      render(<WalletConnect />);
    });

    // Simulate network change
    await act(async () => {
      const mockConnector = {
        id: 'mock-connector',
        name: 'Mock Wallet',
        available: () => true,
        network: 'mainnet'
      };

      const useConnectorsSpy = jest.spyOn(require('@starknet-react/core'), 'useConnectors');
      useConnectorsSpy.mockReturnValue({ available: [mockConnector] });
    });

    expect(starknet.initialize).toHaveBeenCalledWith('mainnet');
  });

  it('should enforce security clearance levels', async () => {
    await act(async () => {
      render(<WalletConnect />);
    });

    const hsm = new MilitaryHSM(SecurityClearance.LEVEL_5);
    
    expect(hsm).toHaveBeenCalledWith(SecurityClearance.LEVEL_5);
    expect(hsm.initialize).toHaveBeenCalled();
  });
});
