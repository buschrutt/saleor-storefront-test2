'use client';

import React, { useEffect, useState } from 'react';
import {
    CardNumberElement,
    CardExpiryElement,
    CardCvcElement,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js';
import StripeProvider from './StripeProvider';

/* =========================
   Reusable FormField
   ========================= */

type FormFieldProps = {
    label: string;
    children: React.ReactNode;
};

function FormField({ label, children }: FormFieldProps) {
    return (
        <fieldset className="w-full border border-gray-300 px-3 pb-3 pt-1 rounded-md">
            <legend className="px-1 text-xs tracking-wide text-gray-600">
                {label}
            </legend>

            <div className="pt-1 w-full">
                <div className="w-full min-h-10 flex items-center">
                    {children}
                </div>
            </div>
        </fieldset>
    );
}


/* =========================
   Types
   ========================= */

type Money = {
    amount: number;
    currency: string;
};

type CheckoutLine = {
    quantity: number;
    variant: {
        product: {
            name: string;
            description?: string; // HTML
        };
    };
};

type Checkout = {
    id: string;
    lines: CheckoutLine[];
    subtotalPrice: { net: { amount: number } };
    totalPrice: {
        net: { amount: number };
        gross: Money;
    };
};

type Address = {
    fullName: string;
    streetAddress1: string;
    streetAddress2: string;
    city: string;
    countryArea: string;
    postalCode: string;
    country: string;
};

type Billing = {
    postalCode: string;
    state: string;
    country: string;
};

type AddressField = {
    label: string;
    key: keyof Address;
};

/* =========================
   Address fields
   ========================= */

const ADDRESS_FIELDS: AddressField[] = [
    { label: 'Full Name', key: 'fullName' },
    { label: 'Street Address', key: 'streetAddress1' },
    { label: 'Street Address 2', key: 'streetAddress2' },
    { label: 'City', key: 'city' },
    { label: 'State', key: 'countryArea' },
    { label: 'ZIP Code', key: 'postalCode' },
];

/* =========================
   Stripe card style
   ========================= */

const CARD_STYLE = {
    style: {
        base: {
            fontSize: '14px',
            fontFamily: 'Inter, system-ui, sans-serif',
            color: '#0f172a',
            lineHeight: '20px',
            '::placeholder': {
                color: '#9ca3af',
            },
        },
        invalid: {
            color: '#dc2626',
        },
    },
};

/* =========================
   PayForm
   ========================= */

function StripeField({
                         label,
                         children,
                     }: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="w-full">
            <div className="mb-1 px-1 text-xs tracking-wide text-gray-600">
                {label}
            </div>

            <div className="w-full border border-gray-300 rounded-md px-3 py-3">
                {children}
            </div>
        </div>
    );
}

function PayForm({
                     clientSecret,
                     billing,
                     setBilling,
                 }: {
    clientSecret: string;
    billing: Billing;
    setBilling: React.Dispatch<React.SetStateAction<Billing>>;
}) {
    const stripe = useStripe();
    const elements = useElements();

    const [paying, setPaying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        console.log('Debug Stripe/Elements:');
        console.log('- Stripe loaded:', stripe ? 'YES' : 'NO');
        console.log('- Elements loaded:', elements ? 'YES' : 'NO');
        console.log('- Client secret:', clientSecret ? 'YES' : 'NO');
    }, [stripe, elements, clientSecret]);

    async function pay() {
        if (!stripe || !elements) return;

        setPaying(true);

        const result = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: elements.getElement(CardNumberElement)!,
                billing_details: {
                    address: {
                        postal_code: billing.postalCode,
                        state: billing.state,
                        country: billing.country,
                    },
                },
            },
        });

        if (result.error) {
            setError(result.error.message ?? 'Payment failed');
            setPaying(false);
        } else {
            window.location.href = '/checkout/success';
        }
    }

    return (
        <section className="pt-12 border-t border-gray-200 w-full">
        <br/><br/>
            <h2 className="mb-6 text-sm uppercase tracking-wide text-gray-700">
                Card Payment Details
            </h2>

            {/* Card fields — по одному в строке */}
            <div className="space-y-6 w-full">
                <div className="space-y-6 w-full">
                    <StripeField label="Card Number">
                        <CardNumberElement options={CARD_STYLE} />
                    </StripeField>

                    <StripeField label="MM / YY">
                        <CardExpiryElement options={CARD_STYLE} />
                    </StripeField>

                    <StripeField label="CVC">
                        <CardCvcElement options={CARD_STYLE} />
                    </StripeField>
                </div>
            </div>
            <br/>
            {/* Billing — тоже по одному в строке */}
            <div className="space-y-6 w-full">
                <FormField label="ZIP Code">
                    <input
                        value={billing.postalCode}
                        onChange={(e) =>
                            setBilling(b => ({ ...b, postalCode: e.target.value }))
                        }
                        className="w-full bg-transparent outline-none text-sm"
                    />
                </FormField>

                <FormField label="State">
                    <input
                        value={billing.state}
                        onChange={(e) =>
                            setBilling(b => ({ ...b, state: e.target.value }))
                        }
                        className="w-full bg-transparent outline-none text-sm"
                    />
                </FormField>

                <FormField label="Country">
                    <select
                        value={billing.country}
                        onChange={(e) =>
                            setBilling(b => ({ ...b, country: e.target.value }))
                        }
                        className="w-full bg-transparent outline-none text-sm"
                    >
                        <option value="US">United States</option>
                    </select>
                </FormField>
            </div>

            {error && (
                <p className="text-sm text-red-600">{error}</p>
            )}

            <br/><button
                type="button"
                onClick={pay}
                disabled={!stripe || paying}
                className="bg-[#2B3A4A] text-white px-6 py-3 mb-24 uppercase text-sm tracking-wide rounded-sm"
            >
                {paying ? 'Processing…' : 'PAY →'}
            </button>
        </section>
    );
}

/* =========================
   Page
   ========================= */

export default function CheckoutPage() {
    const [checkout, setCheckout] = useState<Checkout | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);

    const [address, setAddress] = useState<Address>({
        fullName: '',
        streetAddress1: '',
        streetAddress2: '',
        city: '',
        countryArea: '',
        postalCode: '',
        country: 'US',
    });

    const [billing, setBilling] = useState<Billing>({
        postalCode: '',
        state: '',
        country: 'US',
    });

    useEffect(() => {
        fetch('/api/checkout/create', { method: 'POST' })
            .then(r => r.json())
            .then(data => {
                console.log('CHECKOUT RESPONSE:', data);
                setCheckout(data);
            });
    }, []);

    useEffect(() => {
        if (!checkout) return;

        fetch('/api/checkout/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: checkout.totalPrice.gross.amount,
                currency: checkout.totalPrice.gross.currency,
            }),
        })
            .then(r => r.json())
            .then(d => setClientSecret(d.clientSecret));
    }, [checkout]);

    if (!checkout || !clientSecret) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <p className="text-sm text-gray-600">Loading checkout…</p>
            </main>
        );
    }

    const line = checkout.lines[0];
    const subtotal = checkout.subtotalPrice.net.amount;
    const totalNet = checkout.totalPrice.net.amount;
    const totalGross = checkout.totalPrice.gross.amount;
    const currency = checkout.totalPrice.gross.currency;

    const tax = +(totalGross - totalNet).toFixed(2);
    return (
        <main className="min-h-screen bg-gray-100 px-6 pt-24">
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">

                {/* LEFT */}
                <div>
                    <h2 className="mb-6 text-sm uppercase tracking-wide text-gray-700"><strong>Order Summary</strong></h2>
                    <div className="space-y-6 text-sm">
                        {/* Product */}
                        <div className="space-y-1">
                            <div className="font-medium">{line.variant.product.name}</div>
                            {line.variant.product.description && (
                                <div className="text-gray-500 text-sm leading-snug">{line.variant.product.description}</div>
                            )}
                            <div className="text-gray-400 text-xs tracking-wide"><br/>Qty: {line.quantity}.00</div>
                        </div>

                        <div className="border-t border-gray-200" />

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span>SUBTOTAL:&nbsp;</span>
                                <span>${subtotal.toFixed(2)} {currency}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Tax:&nbsp;</span>
                                <span>${tax.toFixed(2)} {currency}</span>
                            </div>
                        </div>
                        {/* Divider */}
                        <div className="border-t border-gray-200" />
                        {/* Total */}
                        <div className="flex justify-between font-medium text-base">
                            <span><strong>TOTAL:&nbsp;</strong></span>
                            <span><strong>${totalGross.toFixed(2)} {currency}</strong></span>
                        </div>
                    </div>
                </div>

                {/* RIGHT */}
                <div className="space-y-20 w-full">

                    {/* ADDRESS */}
                    <section>
                        <h2 className="mb-6 text-sm uppercase tracking-wide text-gray-700">
                            Shipping & Billing Address
                        </h2>

                        <div className="space-y-6">
                            {ADDRESS_FIELDS.map(({ label, key }) => (
                                <FormField key={key} label={label}>
                                    <input
                                        value={address[key]}
                                        onChange={(e) =>
                                            setAddress(a => ({
                                                ...a,
                                                [key]: e.target.value,
                                            }))
                                        }
                                        className="w-full bg-transparent outline-none text-sm"
                                    />
                                </FormField>
                            ))}
                        </div>
                    </section>

                    {/* PAYMENT */}
                    <StripeProvider>
                        <PayForm
                            clientSecret={clientSecret}
                            billing={billing}
                            setBilling={setBilling}
                        />
                    </StripeProvider>

                </div>
            </div>
        </main>
    );
}
