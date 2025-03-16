/**
 * TetraCryptPQC Wallet Connection Component
 * TOP SECRET//COSMIC//THAUMIEL
 * 
 * Implements quantum-safe wallet connection and management
 */

import React, { useEffect, useState, useCallback } from 'react';
import { connect, disconnect } from '@starknet-react/core';
import { useAccount, useConnectors } from '@starknet-react/core';
import { SecurityClearance } from '../lib/security-protocols';
import { MilitaryHSM } from '../lib/hardware-security-module';
import { QuantumKeyDistribution } from '../lib/quantum-key-distribution';
import { OpenFHE } from '../lib/homomorphic-encryption';
import { starknet } from '../lib/starknet-integration';
import { shake256 } from '@noble/hashes/sha3';

interface WalletState {
  address: string | null;
  network: string | null;
  clearanceLevel: SecurityClearance;
  isConnecting: boolean;
  error: string | null;
}

export const WalletConnect: React.FC = () => {
  // Core wallet state
  const [state, setState] = useState<WalletState>({
    address: null,
    network: null,
    clearanceLevel: SecurityClearance.LEVEL_1,
    isConnecting: false,
    error: null
  });

  // Security components
  const [hsm] = useState(() => new MilitaryHSM(SecurityClearance.LEVEL_5));
  const [qkd] = useState(() => new QuantumKeyDistribution());
  const [openfhe] = useState(() => new OpenFHE());

  // StarkNet hooks
  const { account } = useAccount();
  const { available: connectors } = useConnectors();

  /**
   * Initialize security components
   */
  useEffect(() => {
    const initializeSecurity = async () => {
      try {
        await hsm.initialize();
        await qkd.initialize();
        await openfhe.initialize();
        await starknet.initialize();
      } catch (error) {
        console.error('Failed to initialize security components:', error);
        setState(prev => ({ ...prev, error: 'Security initialization failed' }));
      }
    };

    initializeSecurity();
  }, []);

  /**
   * Handle wallet connection
   */
  const handleConnect = useCallback(async () => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Generate quantum key pair
      const { publicKey, privateKey } = await qkd.generateKeyPair();

      // Store private key in HSM
      await hsm.storeKey(privateKey, {
        type: 'quantum',
        usage: ['sign'],
        extractable: false
      });

      // Connect wallet
      const connector = connectors[0];
      if (!connector) {
        throw new Error('No wallet connectors available');
      }

      await connect({ connector });

      // Encrypt wallet data
      const encryptedData = await openfhe.encrypt(
        JSON.stringify({
          timestamp: Date.now(),
          publicKey
        })
      );

      // Store encrypted data
      await hsm.storeEncryptedData('wallet_data', encryptedData, {
        type: 'wallet',
        clearanceLevel: SecurityClearance.LEVEL_5
      });

      setState(prev => ({
        ...prev,
        address: account?.address || null,
        network: connector.network,
        clearanceLevel: SecurityClearance.LEVEL_5,
        isConnecting: false
      }));
    } catch (error) {
      console.error('Wallet connection failed:', error);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      }));
    }
  }, [account, connectors]);

  /**
   * Handle wallet disconnection
   */
  const handleDisconnect = useCallback(async () => {
    try {
      // Remove wallet data from HSM
      await hsm.deleteData('wallet_data');

      // Disconnect wallet
      await disconnect();

      setState(prev => ({
        ...prev,
        address: null,
        network: null,
        clearanceLevel: SecurityClearance.LEVEL_1,
        error: null
      }));
    } catch (error) {
      console.error('Wallet disconnection failed:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Disconnection failed'
      }));
    }
  }, []);

  /**
   * Handle network change
   */
  useEffect(() => {
    if (!account) return;

    const handleNetworkChange = async () => {
      try {
        const connector = connectors.find(c => c.available());
        if (!connector) return;

        setState(prev => ({
          ...prev,
          network: connector.network
        }));

        // Re-initialize StarkNet with new network
        await starknet.initialize(connector.network as 'testnet' | 'mainnet');
      } catch (error) {
        console.error('Network change handling failed:', error);
      }
    };

    handleNetworkChange();
  }, [account, connectors]);

  return (
    <div className="flex flex-col space-y-4 p-4 bg-gray-900 rounded-lg shadow-xl">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-mono">
          Status: {state.address ? 'Connected' : 'Disconnected'}
        </span>
        <div className={`w-3 h-3 rounded-full ${
          state.address ? 'bg-green-500' : 'bg-red-500'
        }`} />
      </div>

      {/* Wallet Info */}
      {state.address && (
        <div className="space-y-2">
          <p className="text-sm font-mono break-all">
            Address: {state.address}
          </p>
          <p className="text-sm font-mono">
            Network: {state.network}
          </p>
          <p className="text-sm font-mono">
            Clearance: Level {state.clearanceLevel}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-4">
        {!state.address ? (
          <button
            onClick={handleConnect}
            disabled={state.isConnecting}
            className={`flex-1 py-2 px-4 rounded-md ${
              state.isConnecting
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {state.isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        ) : (
          <button
            onClick={handleDisconnect}
            className="flex-1 py-2 px-4 rounded-md bg-red-600 hover:bg-red-700"
          >
            Disconnect
          </button>
        )}
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="p-3 bg-red-900/50 border border-red-700 rounded-md">
          <p className="text-sm text-red-400 font-mono">{state.error}</p>
        </div>
      )}
    </div>
  );
};
