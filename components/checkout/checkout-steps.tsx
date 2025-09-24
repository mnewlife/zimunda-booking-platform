'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckoutStepsProps {
  currentStep: number;
  onStepChange: (step: number) => void;
}

const steps = [
  {
    id: 1,
    name: 'Shipping',
    description: 'Delivery information',
  },
  {
    id: 2,
    name: 'Payment',
    description: 'Payment method',
  },
  {
    id: 3,
    name: 'Review',
    description: 'Order confirmation',
  },
];

export function CheckoutSteps({ currentStep, onStepChange }: CheckoutStepsProps) {
  return (
    <div className="bg-white rounded-lg border p-6">
      <nav aria-label="Progress">
        <ol className="flex items-center">
          {steps.map((step, stepIdx) => (
            <li
              key={step.id}
              className={cn(
                stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : '',
                'relative'
              )}
            >
              {/* Connector Line */}
              {stepIdx !== steps.length - 1 && (
                <div
                  className="absolute inset-0 flex items-center"
                  aria-hidden="true"
                >
                  <div
                    className={cn(
                      'h-0.5 w-full',
                      currentStep > step.id
                        ? 'bg-green-600'
                        : 'bg-gray-200'
                    )}
                  />
                </div>
              )}
              
              {/* Step Button */}
              <button
                onClick={() => onStepChange(step.id)}
                className={cn(
                  'relative flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
                  currentStep > step.id
                    ? 'border-green-600 bg-green-600 text-white hover:bg-green-700'
                    : currentStep === step.id
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300 bg-white text-gray-500 hover:border-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                )}
                aria-current={currentStep === step.id ? 'step' : undefined}
              >
                {currentStep > step.id ? (
                  <Check className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <span className="text-sm font-medium">{step.id}</span>
                )}
              </button>
              
              {/* Step Info */}
              <div className="ml-4 min-w-0 flex flex-col">
                <span
                  className={cn(
                    'text-sm font-medium',
                    currentStep >= step.id
                      ? 'text-gray-900'
                      : 'text-gray-500'
                  )}
                >
                  {step.name}
                </span>
                <span className="text-xs text-gray-500">
                  {step.description}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}