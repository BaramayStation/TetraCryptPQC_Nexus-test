/**
 * TetraCryptPQC Subscription Manager Component
 * TOP SECRET//COSMIC//THAUMIEL
 * 
 * Implements quantum-safe subscription management with military-grade security
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useAccount } from '@starknet-react/core';
import { SecurityClearance } from '../lib/security-protocols';
import { MilitaryHSM } from '../lib/hardware-security-module';
import { QuantumKeyDistribution } from '../lib/quantum-key-distribution';
import { OpenFHE } from '../lib/homomorphic-encryption';
import { starknet } from '../lib/starknet-integration';
import { shake256 } from '@noble/hashes/sha3';

interface SubscriptionDetails {
  tier: number;
  expiration: number;
  features: string[];
  clearanceLevel: SecurityClearance;
  paymentHistory: {
    amount: string;
    timestamp: number;
    transactionHash: string;
  }[];
}

interface SecurityMetrics {
  quantumKeyStrength: number;
  lastKeyRotation: number;
  activeSecurityZones: number;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface SubscriptionState {
  details: SubscriptionDetails | null;
  securityMetrics: SecurityMetrics | null;
  isLoading: boolean;
  error: string | null;
}

export const SubscriptionManager: React.FC = () => {
  // Core subscription state
  const [state, setState] = useState<SubscriptionState>({
    details: null,
    securityMetrics: null,
    isLoading: false,
    error: null
  });

  // Security components
  const [hsm] = useState(() => new MilitaryHSM(SecurityClearance.LEVEL_5));
  const [qkd] = useState(() => new QuantumKeyDistribution());
  const [openfhe] = useState(() => new OpenFHE());

  // StarkNet account
  const { account } = useAccount();

  /**
   * Initialize subscription data
   */
  useEffect(() => {
    const loadSubscriptionData = async () => {
      if (!account?.address) return;

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        // Get subscription status from StarkNet
        const accessStatus = await starknet.checkAccess(account.address);

        // Retrieve encrypted subscription data from HSM
        const encryptedData = await hsm.getEncryptedData('subscription_data', {
          type: 'subscription',
          clearanceLevel: SecurityClearance.LEVEL_5
        });

        // Decrypt subscription data
        const subscriptionData = encryptedData 
          ? JSON.parse(await openfhe.decrypt(encryptedData))
          : null;

        // Get payment history
        const paymentHistory = [];
        if (subscriptionData?.paymentIds) {
          for (const paymentId of subscriptionData.paymentIds) {
            const payment = await starknet.getPaymentHistory(
              account.address,
              paymentId
            );
            paymentHistory.push(payment);
          }
        }

        // Calculate security metrics
        const metrics = await calculateSecurityMetrics();

        setState(prev => ({
          ...prev,
          isLoading: false,
          details: {
            tier: accessStatus.tier,
            expiration: accessStatus.expiration,
            features: getFeaturesByTier(accessStatus.tier),
            clearanceLevel: getClearanceByTier(accessStatus.tier),
            paymentHistory
          },
          securityMetrics: metrics
        }));
      } catch (error) {
        console.error('Failed to load subscription data:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load subscription'
        }));
      }
    };

    loadSubscriptionData();
  }, [account]);

  /**
   * Calculate security metrics
   */
  const calculateSecurityMetrics = async (): Promise<SecurityMetrics> => {
    try {
      // Get quantum key strength
      const keyStrength = await qkd.measureKeyStrength();

      // Get last key rotation timestamp
      const keyMetadata = await hsm.getKeyMetadata('subscription_key');
      const lastRotation = keyMetadata?.lastRotation || 0;

      // Get active security zones
      const activeZones = await hsm.getActiveSecurityZones();

      // Calculate threat level
      const threatLevel = calculateThreatLevel(keyStrength, lastRotation, activeZones);

      return {
        quantumKeyStrength: keyStrength,
        lastKeyRotation: lastRotation,
        activeSecurityZones: activeZones.length,
        threatLevel
      };
    } catch (error) {
      console.error('Failed to calculate security metrics:', error);
      throw error;
    }
  };

  /**
   * Calculate threat level
   */
  const calculateThreatLevel = (
    keyStrength: number,
    lastRotation: number,
    zones: any[]
  ): SecurityMetrics['threatLevel'] => {
    const now = Date.now();
    const rotationAge = now - lastRotation;

    if (keyStrength < 256 || rotationAge > 7 * 24 * 60 * 60 * 1000) {
      return 'CRITICAL';
    } else if (keyStrength < 384 || rotationAge > 3 * 24 * 60 * 60 * 1000) {
      return 'HIGH';
    } else if (keyStrength < 512 || rotationAge > 24 * 60 * 60 * 1000) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  };

  /**
   * Get features by tier
   */
  const getFeaturesByTier = (tier: number): string[] => {
    switch (tier) {
      case 1:
        return [
          'Post-Quantum Encryption',
          'Basic Key Management',
          'Standard Security Clearance'
        ];
      case 2:
        return [
          'Advanced Quantum Encryption',
          'Hardware Security Module',
          'Enhanced Security Clearance',
          'Priority Support'
        ];
      case 3:
        return [
          'Military-Grade Encryption',
          'Dedicated HSM',
          'High Security Clearance',
          '24/7 Support',
          'Custom Security Policies'
        ];
      case 4:
        return [
          'Top Secret Clearance',
          'Quantum Key Distribution',
          'Homomorphic Encryption',
          'AI Security Orchestration',
          'Custom Hardware Integration',
          'Dedicated Security Team'
        ];
      default:
        return [];
    }
  };

  /**
   * Get clearance level by tier
   */
  const getClearanceByTier = (tier: number): SecurityClearance => {
    switch (tier) {
      case 1:
        return SecurityClearance.LEVEL_1;
      case 2:
        return SecurityClearance.LEVEL_2;
      case 3:
        return SecurityClearance.LEVEL_3;
      case 4:
        return SecurityClearance.LEVEL_5;
      default:
        return SecurityClearance.LEVEL_1;
    }
  };

  /**
   * Handle key rotation
   */
  const handleKeyRotation = useCallback(async () => {
    if (!account?.address) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Generate new quantum key pair
      const { publicKey, privateKey } = await qkd.generateKeyPair();

      // Store new keys in HSM
      await hsm.rotateKey('subscription_key', privateKey, {
        type: 'quantum',
        usage: ['sign'],
        extractable: false,
        metadata: {
          rotationTimestamp: Date.now()
        }
      });

      // Update security metrics
      const metrics = await calculateSecurityMetrics();
      setState(prev => ({
        ...prev,
        isLoading: false,
        securityMetrics: metrics
      }));
    } catch (error) {
      console.error('Failed to rotate keys:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to rotate keys'
      }));
    }
  }, [account]);

  return (
    <div className="flex flex-col space-y-6 p-6 bg-gray-900 rounded-lg shadow-xl">
      {/* Loading State */}
      {state.isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      )}

      {/* Subscription Details */}
      {state.details && (
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="p-4 bg-gray-800 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Subscription Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Tier</p>
                <p className="font-mono">{`Level ${state.details.tier}`}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Expiration</p>
                <p className="font-mono">
                  {new Date(state.details.expiration * 1000).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Security Clearance</p>
                <p className="font-mono">{`Level ${state.details.clearanceLevel}`}</p>
              </div>
            </div>
          </div>

          {/* Security Metrics */}
          {state.securityMetrics && (
            <div className="p-4 bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Security Metrics</h3>
                <button
                  onClick={handleKeyRotation}
                  disabled={state.isLoading}
                  className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-600"
                >
                  Rotate Keys
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Quantum Key Strength</p>
                  <p className="font-mono">{state.securityMetrics.quantumKeyStrength} bits</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Last Key Rotation</p>
                  <p className="font-mono">
                    {new Date(state.securityMetrics.lastKeyRotation).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Active Security Zones</p>
                  <p className="font-mono">{state.securityMetrics.activeSecurityZones}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Threat Level</p>
                  <p className={`font-mono ${
                    state.securityMetrics.threatLevel === 'LOW'
                      ? 'text-green-500'
                      : state.securityMetrics.threatLevel === 'MEDIUM'
                      ? 'text-yellow-500'
                      : state.securityMetrics.threatLevel === 'HIGH'
                      ? 'text-orange-500'
                      : 'text-red-500'
                  }`}>
                    {state.securityMetrics.threatLevel}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Features */}
          <div className="p-4 bg-gray-800 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Active Features</h3>
            <ul className="space-y-2">
              {state.details.features.map((feature, index) => (
                <li key={index} className="flex items-center text-sm">
                  <span className="mr-2 text-green-500">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Payment History */}
          <div className="p-4 bg-gray-800 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Payment History</h3>
            <div className="space-y-3">
              {state.details.paymentHistory.map((payment, index) => (
                <div key={index} className="p-3 bg-gray-700 rounded-md">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-400">Amount</p>
                      <p className="font-mono">{payment.amount} USDC</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Date</p>
                      <p className="font-mono">
                        {new Date(payment.timestamp * 1000).toLocaleString()}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-400">Transaction</p>
                      <p className="font-mono text-xs break-all">
                        {payment.transactionHash}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {state.error && (
        <div className="p-3 bg-red-900/50 border border-red-700 rounded-md">
          <p className="text-sm text-red-400 font-mono">{state.error}</p>
        </div>
      )}
    </div>
  );
};
