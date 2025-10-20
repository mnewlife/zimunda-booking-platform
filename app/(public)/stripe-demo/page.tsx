import StripeCheckoutDemo from '@/components/checkout/stripe-checkout-demo';

export default function StripeDemoPage() {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Stripe Integration Demo</h1>
          <p className="text-muted-foreground mt-2">
            Test the Stripe checkout functionality with sample products
          </p>
        </div>
        <StripeCheckoutDemo />
      </div>
    </div>
  );
}