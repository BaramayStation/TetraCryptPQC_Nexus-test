/**
 * TetraCryptPQC Pricing Plans
 * TOP SECRET//COSMIC//THAUMIEL
 */

import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import * as RadixUI from '@radix-ui/react-primitive';
import { cva, type VariantProps } from 'class-variance-authority';
import { SubscriptionTier as VaultTier } from '../../services/vault-service';
import { SubscriptionTier as MessengerTier } from '../../services/messenger-service';
import { subscription, PaymentProcessor, BillingCycle } from '../../services/subscription-service';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

// Styles
const container = cva([
  'w-full',
  'max-w-7xl',
  'mx-auto',
  'px-4',
  'sm:px-6',
  'lg:px-8'
]);

const card = cva([
  'bg-white',
  'dark:bg-gray-800',
  'rounded-lg',
  'shadow-lg',
  'p-6',
  'border',
  'border-gray-200'
]);

const button = cva([
  'inline-flex',
  'items-center',
  'px-4',
  'py-2',
  'border',
  'border-transparent',
  'text-sm',
  'font-medium',
  'rounded-md',
  'shadow-sm',
  'text-white',
  'bg-indigo-600',
  'hover:bg-indigo-700',
  'focus:outline-none',
  'focus:ring-2',
  'focus:ring-offset-2',
  'focus:ring-indigo-500'
]);

/**
 * Vault pricing plans
 */
const VAULT_PLANS = [
  {
    tier: VaultTier.FREE,
    name: 'Free',
    price: 0,
    storage: '100MB',
    features: [
      'Post-quantum encryption',
      'Basic file storage',
      'Web access',
      'Community support'
    ]
  },
  {
    tier: VaultTier.PREMIUM,
    name: 'Premium',
    price: 10,
    storage: '100GB',
    features: [
      'Advanced encryption',
      'IPFS storage',
      'Filecoin backup',
      'Priority support',
      'API access'
    ]
  },
  {
    tier: VaultTier.BUSINESS,
    name: 'Business',
    price: 100,
    storage: '1TB',
    features: [
      'Enterprise encryption',
      'Custom deployment',
      'Dedicated support',
      'Audit logs',
      'SLA guarantee'
    ]
  },
  {
    tier: VaultTier.MILITARY,
    name: 'Military',
    price: 1000,
    storage: 'Unlimited',
    features: [
      'THAUMIEL clearance',
      'Homomorphic encryption',
      'HSM integration',
      'FIPS 140-3 compliance',
      'DISA STIG compliance'
    ]
  }
];

/**
 * Messenger pricing plans
 */
const MESSENGER_PLANS = [
  {
    tier: MessengerTier.BASIC,
    name: 'Basic',
    price: 50,
    messages: '100/day',
    features: [
      'Post-quantum encryption',
      'Basic messaging',
      'Web access',
      'Community support'
    ]
  },
  {
    tier: MessengerTier.PROFESSIONAL,
    name: 'Professional',
    price: 200,
    messages: '10,000/day',
    features: [
      'Advanced encryption',
      'Matrix integration',
      'Waku P2P',
      'Priority support',
      'API access'
    ]
  },
  {
    tier: MessengerTier.ENTERPRISE,
    name: 'Enterprise',
    price: 1000,
    messages: 'Unlimited',
    features: [
      'Enterprise encryption',
      'Custom deployment',
      'Dedicated support',
      'Audit logs',
      'SLA guarantee'
    ]
  },
  {
    tier: MessengerTier.MILITARY,
    name: 'Military',
    price: 5000,
    messages: 'Unlimited',
    features: [
      'THAUMIEL clearance',
      'Homomorphic encryption',
      'HSM integration',
      'FIPS 140-3 compliance',
      'DISA STIG compliance'
    ]
  }
];

/**
 * Pricing card props
 */
interface PricingCardProps {
  name: string;
  price: number;
  features: string[];
  isPopular?: boolean;
  onSubscribe: () => void;
  isLoading?: boolean;
}

/**
 * Pricing card component
 */
const PricingCard: React.FC<PricingCardProps> = ({
  name,
  price,
  features,
  isPopular,
  onSubscribe,
  isLoading
}) => {
  return (
    <div
      className={`${card()} ${
        isPopular ? 'border-indigo-500 border-2' : ''
      }`}
    >
      {isPopular && (
        <span className="absolute top-0 right-0 px-3 py-1 text-sm text-white bg-indigo-500 rounded-bl">
          Popular
        </span>
      )}

      <h3 className="text-lg font-medium text-gray-900">{name}</h3>
      <p className="mt-4 text-sm text-gray-500">
        Starting from
      </p>
      <p className="mt-2 text-3xl font-bold text-gray-900">
        ${price}
        <span className="text-sm font-medium text-gray-500">/month</span>
      </p>

      <ul className="mt-6 space-y-4">
        {features.map((feature) => (
          <li key={feature} className="flex items-start">
            <span className="flex-shrink-0 h-6 w-6 text-indigo-500">
              ✓
            </span>
            <span className="ml-3 text-sm text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        className={`${button()} w-full mt-8`}
        onClick={onSubscribe}
        disabled={isLoading}
      >
        {isLoading ? 'Processing...' : 'Subscribe Now'}
      </button>
    </div>
  );
};

/**
 * Service type
 */
type ServiceType = 'vault' | 'messenger';

/**
 * Pricing plans component
 */
export const PricingPlans: React.FC<{
  service: ServiceType;
}> = ({ service }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Subscribe mutation
  const subscribeMutation = useMutation(
    async ({
      tier,
      processor,
      cycle
    }: {
      tier: VaultTier | MessengerTier;
      processor: PaymentProcessor;
      cycle: BillingCycle;
    }) => {
      if (service === 'vault') {
        return await subscription.createVaultSubscription(
          user!.id,
          tier as VaultTier,
          processor,
          cycle
        );
      } else {
        return await subscription.createMessengerSubscription(
          user!.id,
          tier as MessengerTier,
          processor,
          cycle
        );
      }
    },
    {
      onSuccess: () => {
        toast({
          title: 'Success',
          description: 'Subscription created successfully',
          type: 'success'
        });
      },
      onError: (error) => {
        toast({
          title: 'Error',
          description: error.message,
          type: 'error'
        });
      }
    }
  );

  const plans = service === 'vault' ? VAULT_PLANS : MESSENGER_PLANS;

  return (
    <div className={container()}>
      <div className="py-10">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            TetraCryptPQC {service === 'vault' ? 'Vault' : 'Messenger'} Pricing
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Choose the perfect plan for your needs
          </p>
        </header>

        <main className="mt-16">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            {plans.map((plan) => (
              <PricingCard
                key={plan.tier}
                name={plan.name}
                price={plan.price}
                features={plan.features}
                isPopular={plan.tier === (service === 'vault' ? VaultTier.PREMIUM : MessengerTier.PROFESSIONAL)}
                onSubscribe={() =>
                  subscribeMutation.mutate({
                    tier: plan.tier,
                    processor: PaymentProcessor.STRIPE,
                    cycle: BillingCycle.MONTHLY
                  })
                }
                isLoading={subscribeMutation.isLoading}
              />
            ))}
          </div>

          <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              Enterprise Solutions
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Need a custom solution? Contact our sales team for enterprise pricing
              and features.
            </p>
            <button className={`${button()} mt-8`}>
              Contact Sales
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};
