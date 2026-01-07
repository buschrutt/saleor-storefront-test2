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
                       className = "",
                       disabled = false,
                   }: {
    label: string
    children: React.ReactNode
    className?: string
    disabled?: boolean
}) {
    return (
        <fieldset
            className={`relative w-full border border-gray-300 px-3 pb-3 pt-1 rounded-md
            ${disabled ? 'opacity-60 pointer-events-none' : ''}
            ${className}`}
        >
            <legend className="px-1 text-xs tracking-wide text-gray-600 pointer-events-none">
                {label}
            </legend>
            <div className="pt-1 w-full relative z-10">
                {children}
            </div>
        </fieldset>
    )
}


const CARD_STYLE = {
    style: {
        base: {
            fontSize: '14px',
            fontFamily: 'Inter, system-ui, sans-serif',
            color: '#0f172a',
            '::placeholder': {
                color: '#9ca3af',
                fontSize: '14px'
            },
            lineHeight: '40px', // Важно: задаем высоту строки
        },
        invalid: {
            color: '#dc2626'
        },
    },
};

/* =========================
   Payment form (INSIDE Elements)
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
        if (!stripe || !elements) return;

        if (!billing.firstName || !billing.lastName) {
            pushToast('error', 'Enter billing name');
            return;
        }

        if (!taxReady) {
            pushToast('error', 'Shipping address required');
            return;
        }

        setPaying(true);

        const result = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: elements.getElement(CardNumberElement)!,
                billing_details: {
                    name: `${billing.firstName} ${billing.lastName}`,
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
            <h2 className="text-sm uppercase tracking-wide text-gray-700">
                Payment Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label="First Name">
                    <input
                        value={billing.firstName}
                        onChange={e =>
                            setBilling(b => ({ ...b, firstName: e.target.value }))
                        }
                        className="w-full bg-transparent outline-none h-10 text-sm"
                    />
                </FormField>

                <FormField label="Last Name">
                    <input
                        value={billing.lastName}
                        onChange={e =>
                            setBilling(b => ({ ...b, lastName: e.target.value }))
                        }
                        className="w-full bg-transparent outline-none h-10 text-sm"
                    />
                </FormField>
            </div>

            <FormField label="Billing State">
                <input
                    value={billing.state}
                    onChange={e =>
                        setBilling(b => ({ ...b, state: e.target.value }))
                    }
                    className="w-full bg-transparent outline-none h-10 text-sm"
                />
            </FormField>

            <FormField label="Billing ZIP">
                <input
                    value={billing.postalCode}
                    onChange={e =>
                        setBilling(b => ({ ...b, postalCode: e.target.value }))
                    }
                    className="w-full bg-transparent outline-none h-10 text-sm"
                />
            </FormField>

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
                onClick={pay}
                disabled={!stripe || paying}
                className="bg-[#2B3A4A] text-white px-4 py-3 text-sm uppercase rounded-sm"
            >
                {paying ? 'Processing…' : 'Pay'}
            </button>
        </section>
    );
}

/* =========================
   CheckoutLogic (RIGHT COLUMN)
   ========================= */

export function CheckoutLogic({
                                  user,
                                  address,
                                  setAddress,
                                  billing,
                                  setBilling,
                                  clientSecret,
                                  taxReady,
                                  updatingTax,
                                  updateTaxFromAddress,
                              }: {
    user: User | null;
    checkout: Checkout;
    address: Address;
    setAddress: React.Dispatch<React.SetStateAction<Address>>;
    billing: Billing;
    setBilling: React.Dispatch<React.SetStateAction<Billing>>;
    clientSecret?: string;
    taxReady: boolean;
    updatingTax: boolean;
    updateTaxFromAddress: () => Promise<void>;
}) {
    const router = useRouter();
    const { toasts, closeToast, pushToast } = useToast();
    const [paymentOpen, setPaymentOpen] = React.useState(false);

    const shippingValid =
        address.fullName.trim() &&
        address.streetAddress1.trim() &&
        address.city.trim() &&
        address.countryArea.trim().length >= 2 &&
        /^\d{5}$/.test(address.postalCode.trim());

    if (!user) {
        return (
            <section>
                <p className="text-sm">Please sign in to continue</p>
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

            {/* SHIPPING */}
            <section className="space-y-6">
                <h2 className="text-sm uppercase tracking-wide text-gray-700">
                    Shipping Address
                </h2>

                <FormField label="Full Name" disabled={paymentOpen}>
                    <input
                        value={address.fullName}
                        onChange={e =>
                            setAddress(a => ({ ...a, fullName: e.target.value }))
                        }
                        className="w-full bg-transparent outline-none h-10 text-sm"
                    />
                </FormField>

                <FormField label="Street" disabled={paymentOpen}>
                    <input
                        value={address.streetAddress1}
                        onChange={e =>
                            setAddress(a => ({ ...a, streetAddress1: e.target.value }))
                        }
                        className="w-full bg-transparent outline-none h-10 text-sm"
                    />
                </FormField>

                <FormField label="Street Line 2 (Apt, Suite, Unit)" disabled={paymentOpen}>
                    <input
                        value={address.streetAddress2 ?? ''}
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

                <FormField label="City" disabled={paymentOpen}>
                    <input
                        value={address.city}
                        onChange={e =>
                            setAddress(a => ({ ...a, city: e.target.value }))
                        }
                        className="w-full bg-transparent outline-none h-10 text-sm"
                    />
                </FormField>

                <FormField label="State" disabled={paymentOpen}>
                    <input
                        value={address.countryArea}
                        onChange={e =>
                            setAddress(a => ({ ...a, countryArea: e.target.value }))
                        }
                        className="w-full bg-transparent outline-none h-10 text-sm"
                    />
                </FormField>

                <FormField label="ZIP" disabled={paymentOpen}>
                    <input
                        value={address.postalCode}
                        onChange={e =>
                            setAddress(a => ({ ...a, postalCode: e.target.value }))
                        }
                        className="w-full bg-transparent outline-none h-10 text-sm"
                    />
                </FormField>
            </section>

            {/* PAYMENT */}
            {!paymentOpen ? (
                <button
                    disabled={!shippingValid || updatingTax || paymentOpen}
                    onClick={async () => {
                        if (!shippingValid) {
                            pushToast('error', 'Complete shipping address');
                            return;
                        }

                        await updateTaxFromAddress();
                        setPaymentOpen(true);
                    }}
                    className="bg-[#2B3A4A] text-white px-4 py-3 text-sm uppercase rounded-sm mb-12"
                >
                    {updatingTax ? 'Calculating tax…' : 'PAYMENT'}
                </button>
            ) : !clientSecret ? (
                <p className="text-sm text-gray-500">Preparing payment…</p>
            ) : (
                <StripeProvider clientSecret={clientSecret}>
                    <PayForm
                        clientSecret={clientSecret}
                        billing={billing}
                        setBilling={setBilling}
                        taxReady={taxReady}
                    />
                </StripeProvider>
            )}
        </div>
    );
}
