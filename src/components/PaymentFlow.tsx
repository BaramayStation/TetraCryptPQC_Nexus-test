/**
 * TetraCryptPQC Payment Flow Component
 * TOP SECRET//COSMIC//THAUMIEL
 * 
 * Implements quantum-safe payment processing and subscription management
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useAccount } from '@starknet-react/core';
import { SecurityClearance } from '../lib/security-protocols';
import { MilitaryHSM } from '../lib/hardware-security-module';
import { QuantumKeyDistribution } from '../lib/quantum-key-distribution';
import { OpenFHE } from '../lib/homomorphic-encryption';
import { starknet } from '../lib/starknet-integration';
import { shake256 } from '@noble/hashes/sha3';

// Subscription tiers with military-grade security levels
const SUBSCRIPTION_TIERS = {
  BASIC: {
    id: 1,
    name: 'Basic',
    price: '5',
    features: [
      'Post-Quantum Encryption',
      'Basic Key Management',
      'Standard Security Clearance'
    ],
    clearanceLevel: SecurityClearance.LEVEL_1
  },
  PREMIUM: {
    id: 2,
    name: 'Premium',
    price: '10',
    features: [
      'Advanced Quantum Encryption',
      'Hardware Security Module',
      'Enhanced Security Clearance',
      'Priority Support'
    ],
    clearanceLevel: SecurityClearance.LEVEL_2
  },
  BUSINESS: {
    id: 3,
    name: 'Business',
    price: '100',
    features: [
      'Military-Grade Encryption',
      'Dedicated HSM',
      'High Security Clearance',
      '24/7 Support',
      'Custom Security Policies'
    ],
    clearanceLevel: SecurityClearance.LEVEL_3
  },
  MILITARY: {
    id: 4,
    name: 'Military',
    price: '1000',
    features: [
      'Top Secret Clearance',
      'Quantum Key Distribution',
      'Homomorphic Encryption',
      'AI Security Orchestration',
      'Custom Hardware Integration',
      'Dedicated Security Team'
    ],
    clearanceLevel: SecurityClearance.LEVEL_5
  }
};

interface PaymentState {
  selectedTier: keyof typeof SUBSCRIPTION_TIERS | null;
  isProcessing: boolean;
  currentSubscription: {
    tier: number;
    expiration: number;
  } | null;
  error: string | null;
}

export const PaymentFlow: React.FC = () => {
  // Core payment state
  const [state, setState] = useState<PaymentState>({
    selectedTier: null,
    isProcessing: false,
    currentSubscription: null,
    error: null
  });

  // Security components
  const [hsm] = useState(() => new MilitaryHSM(SecurityClearance.LEVEL_5));
  const [qkd] = useState(() => new QuantumKeyDistribution());
  const [openfhe] = useState(() => new OpenFHE());

  // StarkNet account
  const { account } = useAccount();

  /**
   * Initialize component
   */
  useEffect(() => {
    const initialize = async () => {
      if (!account?.address) return;

      try {
        // Check current subscription
        const accessStatus = await starknet.checkAccess(account.address);
        if (accessStatus.hasAccess) {
          setState(prev => ({
            ...prev,
            currentSubscription: {
              tier: accessStatus.tier,
              expiration: accessStatus.expiration
            }
          }));
        }
      } catch (error) {
        console.error('Failed to check subscription:', error);
      }
    };

    initialize();
  }, [account]);

  /**
   * Handle tier selection
   */
  const handleTierSelect = useCallback((tier: keyof typeof SUBSCRIPTION_TIERS) => {
    setState(prev => ({ ...prev, selectedTier: tier, error: null }));
  }, []);

  /**
   * Process payment
   */
  const handlePayment = useCallback(async () => {
    if (!state.selectedTier || !account?.address) return;

    setState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      const tier = SUBSCRIPTION_TIERS[state.selectedTier];

      // Generate quantum key pair for payment
      const { publicKey, privateKey } = await qkd.generateKeyPair();

      // Store payment keys in HSM
      await hsm.storeKey(privateKey, {
        type: 'quantum',
        usage: ['sign'],
        extractable: false,
        metadata: {
          tier: tier.id,
          timestamp: Date.now()
        }
      });

      // Process payment through StarkNet
      const result = await starknet.processPayment(
        account.address,
        tier.id,
        tier.price
      );

      if (result.status === 'COMPLETED') {
        // Encrypt subscription data
        const encryptedData = await openfhe.encrypt(
          JSON.stringify({
            tier: tier.id,
            timestamp: Date.now(),
            transactionHash: result.transactionHash
          })
        );

        // Store encrypted subscription data
        await hsm.storeEncryptedData('subscription_data', encryptedData, {
          type: 'subscription',
          clearanceLevel: tier.clearanceLevel
        });

        // Update subscription status
        const accessStatus = await starknet.checkAccess(account.address);
        setState(prev => ({
          ...prev,
          isProcessing: false,
          currentSubscription: {
            tier: accessStatus.tier,
            expiration: accessStatus.expiration
          }
        }));
      } else {
        throw new Error(result.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment processing failed:', error);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Payment failed'
      }));
    }
  }, [state.selectedTier, account]);

  return (
    <div className="flex flex-col space-y-6 p-6 bg-gray-900 rounded-lg shadow-xl">
      {/* Current Subscription */}
      {state.currentSubscription && (
        <div className="p-4 bg-blue-900/50 border border-blue-700 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Current Subscription</h3>
          <p className="text-sm font-mono">
            Tier: {Object.values(SUBSCRIPTION_TIERS).find(
              t => t.id === state.currentSubscription?.tier
            )?.name}
          </p>
          <p className="text-sm font-mono">
            Expires: {new Date(state.currentSubscription.expiration * 1000).toLocaleString()}
          </p>
        </div>
      )}

      {/* Subscription Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(SUBSCRIPTION_TIERS).map(([key, tier]) => (
          <div
            key={tier.id}
            className={`p-4 rounded-lg cursor-pointer transition-all ${
              state.selectedTier === key
                ? 'bg-blue-900 border-2 border-blue-500'
                : 'bg-gray-800 border border-gray-700 hover:border-gray-600'
            }`}
            onClick={() => handleTierSelect(key as keyof typeof SUBSCRIPTION_TIERS)}
          >
            <h3 className="text-lg font-semibold mb-2">{tier.name}</h3>
            <p className="text-2xl font-bold mb-4">${tier.price} USDC</p>
            <ul className="space-y-2">
              {tier.features.map((feature, index) => (
                <li key={index} className="text-sm flex items-center">
                  <span className="mr-2">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Payment Action */}
      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={handlePayment}
          disabled={!state.selectedTier || state.isProcessing || !account}
          className={`w-full max-w-md py-3 px-6 rounded-lg text-lg font-semibold ${
            !state.selectedTier || state.isProcessing || !account
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {state.isProcessing
            ? 'Processing...'
            : !account
            ? 'Connect Wallet'
            : `Subscribe to ${state.selectedTier ? SUBSCRIPTION_TIERS[state.selectedTier].name : 'Selected Plan'}`}
        </button>

        {/* Error Display */}
        {state.error && (
          <div className="w-full max-w-md p-3 bg-red-900/50 border border-red-700 rounded-md">
            <p className="text-sm text-red-400 font-mono">{state.error}</p>
          </div>
        )}
      </div>
    </div>
  );
};
