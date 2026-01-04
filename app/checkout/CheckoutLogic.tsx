'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import type { Billing, Address, User } from '@/types/checkout';
import StripeProvider from './StripeProvider';
import ToastContainer from '@/app/components/ToastContainer';
import { useToast } from '@/app/components/useToast';
import {
    CardNumberElement,
    CardExpiryElement,
    CardCvcElement,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js';

/* =========================
   Types
   ========================= */

type Checkout = {
    id: string;
    shippingAddress?: Address | null;
};

/* =========================
   UI helpers
   ========================= */

function FormField({
                       label,
                       children,
                   }: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <fieldset className="w-full border border-gray-300 px-3 pb-3 pt-1 rounded-md">
            <legend className="px-1 text-xs tracking-wide text-gray-600">
                {label}
            </legend>
            <div className="pt-1 w-full">{children}</div>
        </fieldset>
    );
}

const CARD_STYLE = {
    style: {
        base: {
            fontSize: '14px',
            fontFamily: 'Inter, system-ui, sans-serif',
            color: '#0f172a',
            '::placeholder': {
                color: '#9ca3af',
            },
        },
        invalid: {
            color: '#dc2626',
        },
    },
    classes: {
        base: 'w-full h-10 py-3',
        focus: 'outline-none',
        empty: '',
        invalid: '',
    },
};

/* =========================
   Payment form
   ========================= */

function PayForm({
                     clientSecret,
                     billing,
                     setBilling,
                     taxReady,
                 }: {
    clientSecret: string;
    billing: Billing;
    setBilling: React.Dispatch<React.SetStateAction<Billing>>;
    taxReady: boolean;
}) {
    const stripe = useStripe();
    const elements = useElements();
    const router = useRouter();
    const { pushToast } = useToast();
    const [paying, setPaying] = React.useState(false);

    async function pay() {
        if (!billing.firstName || !billing.lastName) {
            pushToast('error', 'Please enter billing first and last name');
            return;
        }
        if (!stripe || !elements) return;
        if (!taxReady) {
            pushToast('error', 'Please enter shipping address');
            return;
        }

        setPaying(true);

        const result = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: elements.getElement(CardNumberElement)!,
                billing_details: {
                    name: `${billing.firstName} ${billing.lastName}`.trim(),
                    address: {
                        postal_code: billing.postalCode,
                        state: billing.state,
                        country: billing.country,
                    },
                },
            },
        });

        if (result.error) {
            pushToast('error', result.error.message ?? 'Payment failed');
            setPaying(false);
        } else {
            pushToast('success', 'Payment successful');
            router.push('/profile');
        }
    }

    return (
        <section className="pt-12 pb-12 border-t border-gray-200 space-y-6">
            {/* BILLING (for Stripe) */}
            <h2 className="text-sm uppercase tracking-wide text-gray-700">
                Payment Details
            </h2>
            {/* BILLING NAME */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label="First Name">
                    <input
                        value={billing.firstName}
                        onChange={(e) =>
                            setBilling(b => ({ ...b, firstName: e.target.value }))
                        }
                        className="w-full bg-transparent outline-none h-10 text-sm"
                        placeholder="John"
                    />
                </FormField>

                <FormField label="Last Name">
                    <input
                        value={billing.lastName}
                        onChange={(e) =>
                            setBilling(b => ({ ...b, lastName: e.target.value }))
                        }
                        className="w-full bg-transparent outline-none h-10 text-sm"
                        placeholder="Doe"
                    />
                </FormField>
            </div>
            <div className="pt-2 space-y-6">
                <FormField label="Billing ZIP Code">
                    <input
                        value={billing.postalCode}
                        onChange={(e) =>
                            setBilling((b) => ({ ...b, postalCode: e.target.value }))
                        }
                        className="w-full bg-transparent outline-none h-10 text-sm"
                        placeholder="78717"
                    />
                </FormField>

                <FormField label="Billing State">
                    <input
                        value={billing.state}
                        onChange={(e) =>
                            setBilling((b) => ({ ...b, state: e.target.value }))
                        }
                        className="w-full bg-transparent outline-none h-10 text-sm"
                        placeholder="TX"
                    />
                </FormField>
            </div>
            <FormField label="Card Number">
                <CardNumberElement options={CARD_STYLE} />
            </FormField>
            <FormField label="MM / YY">
                <CardExpiryElement options={CARD_STYLE} />
            </FormField>
            <FormField label="CVC">
                <CardCvcElement options={CARD_STYLE} />
            </FormField>


            <button
                type="button"
                onClick={pay}
                disabled={!stripe || paying || !taxReady}
                className="bg-[#2B3A4A] text-white px-4 py-3 text-sm uppercase rounded-sm"
            >
                {paying ? 'Processing…' : 'Pay'}
            </button>
        </section>
    );
}

/* =========================
   CheckoutLogic (RIGHT)
   ========================= */

export function CheckoutLogic({
                                  user,
                                  address,
                                  setAddress,
                                  billing,
                                  setBilling,
                                  clientSecret,
                                  taxReady,
                                  updateTaxFromAddress,
                              }: {
    user: User | null;
    checkout: Checkout;
    address: Address;
    setAddress: React.Dispatch<React.SetStateAction<Address>>;
    billing: Billing;
    setBilling: React.Dispatch<React.SetStateAction<Billing>>;
    clientSecret: string;
    taxReady: boolean;
    updateTaxFromAddress: () => Promise<void>;
}) {
    const router = useRouter();
    const { toasts, closeToast } = useToast();

    if (!user) {
        return (
            <section>
                <p className="text-sm text-gray-700">
                    Please sign in to continue checkout
                </p>
                <button
                    onClick={() => router.push('/login')}
                    className="bg-[#2B3A4A] text-white px-4 py-3 mt-4 text-sm uppercase"
                >
                    Sign in
                </button>
            </section>
        );
    }

    return (
        <div className="space-y-16">
            <ToastContainer toasts={toasts} onClose={closeToast} />

            <section className="text-sm">
                <strong>{user.email}</strong>
            </section>

            {/* SHIPPING */}
            <section className="space-y-6">
                <h2 className="text-sm uppercase tracking-wide text-gray-700">
                    Shipping Address
                </h2>
                <FormField label="Full Name">
                    <input
                        value={address.fullName}
                        onChange={e =>
                            setAddress(a => ({ ...a, fullName: e.target.value }))
                        }
                        className="w-full bg-transparent outline-none h-10 text-sm"
                    />
                </FormField>

                <FormField label="Street">
                    <input
                        value={address.streetAddress1}
                        onChange={e =>
                            setAddress(a => ({
                                ...a,
                                streetAddress1: e.target.value,
                            }))
                        }
                        className="w-full bg-transparent outline-none h-10 text-sm"
                    />
                </FormField>

                <FormField label="Street Line 2 (Apt, Suite, Unit)">
                    <input
                        value={address.streetAddress2}
                        onChange={e =>
                            setAddress(a => ({
                                ...a,
                                streetAddress2: e.target.value,
                            }))
                        }
                        className="w-full bg-transparent outline-none h-10 text-sm"
                        placeholder="Apartment, suite, unit, etc. (optional)"
                    />
                </FormField>

                <FormField label="City">
                    <input
                        value={address.city}
                        onChange={e =>
                            setAddress(a => ({ ...a, city: e.target.value }))
                        }
                        className="w-full bg-transparent outline-none h-10 text-sm"
                    />
                </FormField>

                <FormField label="State">
                    <input
                        value={address.countryArea}
                        onChange={e =>
                            setAddress(a => ({
                                ...a,
                                countryArea: e.target.value,
                            }))
                        }
                        onBlur={updateTaxFromAddress}
                        className="w-full bg-transparent outline-none h-10 text-sm"
                    />
                </FormField>

                <FormField label="ZIP">
                    <input
                        value={address.postalCode}
                        onChange={e =>
                            setAddress(a => ({
                                ...a,
                                postalCode: e.target.value,
                            }))
                        }
                        onBlur={updateTaxFromAddress}
                        className="w-full bg-transparent outline-none h-10 text-sm"
                    />
                </FormField>
            </section>

            {/* PAYMENT */}
            <StripeProvider clientSecret={clientSecret}>
                <PayForm
                    clientSecret={clientSecret}
                    billing={billing}
                    setBilling={setBilling}
                    taxReady={taxReady}
                />
            </StripeProvider>
        </div>
    );
}
