'use client';

import { ReactNode } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function StripeProvider({
                                           clientSecret,
                                           children,
                                       }: {
    clientSecret: string;
    children: ReactNode;
}) {
    return (
        <Elements
            stripe={stripePromise}
            options={{ clientSecret }}
            key={clientSecret}   // КРИТИЧЕСКИ ВАЖНО
        >
            {children}
        </Elements>
    );
}
