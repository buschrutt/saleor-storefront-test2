'use client';

import { useToast } from '@/app/components/useToast';
import ToastContainer from '@/app/components/ToastContainer';
import React, { useEffect, useState } from 'react';
import {
    CardNumberElement,
    CardExpiryElement,
    CardCvcElement,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js';
import StripeProvider from './StripeProvider';
import { useRouter } from 'next/navigation';

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

type CheckoutUser = {
    email: string;
};

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
    user?: CheckoutUser | null;
    shippingAddress?: Address | null;
    lines: CheckoutLine[];
    subtotalPrice: {
        net: { amount: number };
    };
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

type CheckoutImage = {
    imageUrl: string;
    alt?: string;
} | null;

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
        <fieldset className="w-full border border-gray-300 px-3 pb-3 pt-1 rounded-md">
            <legend className="px-1 text-xs tracking-wide text-gray-600">
                {label}
            </legend>
            <div className="pt-1 w-full">
                <div className="w-full min-h-10 py-2">
                    {children}
                </div>
            </div>
        </fieldset>
    );
}


function PayForm({
                     clientSecret,
                     billing,
                     setBilling,
                     taxReady,
                     updatingTax,
                     pushToast,
                 }: {
    clientSecret: string;
    billing: Billing;
    setBilling: React.Dispatch<React.SetStateAction<Billing>>;
    taxReady: boolean;
    setTaxReady: React.Dispatch<React.SetStateAction<boolean>>;
    updatingTax: boolean;
    updateTaxFromAddress: () => Promise<void>;
    pushToast: (t: 'error' | 'success' | 'info', m: string) => void;
}) {
    const stripe = useStripe();
    const elements = useElements();
    const router = useRouter();
    const [paying, setPaying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function pay() {
        // Налог не готов — платёж запрещён
        if (!taxReady) {
            pushToast('error', 'Please enter shipping address to calculate tax');
            return;
        }

        if (!stripe || !elements) return;

        setPaying(true);
        setError(null);

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
            pushToast('success', 'Payment successful. Redirecting…');
            setTimeout(() => {
                router.push('/profile');
            }, 2000); // 2 секунды
        }
    }

    return (
        <section className="pt-12 border-t border-gray-200 w-full">
            <h2 className="mb-6 text-sm uppercase tracking-wide text-gray-700">
                Card Payment Details
            </h2>

            {/* STRIPE CARD FIELDS */}
            <div className="space-y-6 w-full">
                <StripeField label="Card Number">
                    <CardNumberElement className="w-full" options={CARD_STYLE} />
                </StripeField>
                <StripeField label="MM / YY">
                    <CardExpiryElement className="w-full" options={CARD_STYLE} />
                </StripeField>
                <StripeField label="CVC">
                    <CardCvcElement className="w-full" options={CARD_STYLE} />
                </StripeField>
            </div><br/>

            {/* BILLING */}
            <div className="space-y-6 w-full mt-8">
                {/* Billing — нужно Stripe */}
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

                    {updatingTax && (
                        <p className="text-sm text-gray-500 mt-2">
                            Calculating tax…
                        </p>
                    )}

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
            </div>

            {/* ADDRESS / TAX ERRORS */}

            {updatingTax && (
                <p className="text-sm text-gray-500 mt-2">
                    Calculating tax…
                </p>
            )}

            {/* PAYMENT ERROR */}
            {error && (
                <p className="text-sm text-red-600 mt-4">
                    {error}
                </p>
            )}

            {/* PAY BUTTON */}
            <br/>
            <button
                type="button"
                onClick={pay}
                disabled={!stripe || paying || !taxReady}
                className={`bg-[#2B3A4A] text-white rounded-sm px-4 py-3 text-sm uppercase tracking-wide hover:bg-[#111a2e] transition
                    ${taxReady
                    ? 'bg-[#2B3A4A] text-white'
                    : 'bg-gray-400 text-gray-100 cursor-not-allowed'}
                `}
            >
                {paying ? 'Processing…' : 'PAY →'}
            </button>
            <br/><br/><br/>
        </section>
    );
}


/* =========================
   Page
   ========================= */

export default function CheckoutClient({
                                           checkoutImage,
                                       }: {
    checkoutImage: CheckoutImage;
}) {
    const { toasts, pushToast, closeToast } = useToast();
    const router = useRouter();
    const [user, setUser] = useState<{ email: string } | null>(null);
    const isAuthenticated = Boolean(user);
    const [checkout, setCheckout] = useState<Checkout | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [taxReady, setTaxReady] = useState(false);
    const [updatingTax, setUpdatingTax] = useState(false);

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
        fetch('/api/me')
            .then(r => r.json())
            .then(data => setUser(data.user))
            .catch(() => setUser(null));
    }, []);

    useEffect(() => {
        if (!checkout || !taxReady) return;

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
    }, [checkout, taxReady]);


    useEffect(() => {
        if (!checkout?.shippingAddress || !isAuthenticated) return;

        setAddress(a => ({
            ...a,
            fullName: checkout.shippingAddress!.fullName || '',
            streetAddress1: checkout.shippingAddress!.streetAddress1 || '',
            streetAddress2: checkout.shippingAddress!.streetAddress2 || '',
            city: checkout.shippingAddress!.city || '',
            country: checkout.shippingAddress!.country || 'US',
            countryArea: '',   // ← ВСЕГДА вручную
            postalCode: '',    // ← ВСЕГДА вручную
        }));
    }, [checkout?.shippingAddress, isAuthenticated]);


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

    async function updateTaxFromAddress() {
        if (!checkout) return;

        if (!address.streetAddress1 || !address.city) {
            pushToast('info', 'Please enter street and city first');
            setTaxReady(false);
            return;
        }

        if (!address.countryArea || address.countryArea.length < 2) {
            pushToast('error', 'Please enter state');
            setTaxReady(false);
            return;
        }

        if (!/^\d{5}$/.test(address.postalCode)) {
            pushToast('error', 'ZIP code must be 5 digits');
            setTaxReady(false);
            return;
        }

        setUpdatingTax(true);

        try {
            const res = await fetch('/api/checkout/address', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    checkoutId: checkout.id,
                    address: {
                        firstName: address.fullName.split(' ')[0] || ' ',
                        lastName: address.fullName.split(' ').slice(1).join(' ') || ' ',
                        streetAddress1: address.streetAddress1,
                        streetAddress2: address.streetAddress2 || '',
                        city: address.city,
                        country: 'US',
                        countryArea: address.countryArea,
                        postalCode: address.postalCode,
                    },
                }),
            });

            const updatedCheckout = await res.json();

            // 🔑 API ВОЗВРАЩАЕТ CHECKOUT НАПРЯМУЮ
            setCheckout(prev =>
                prev
                    ? {
                        ...prev,
                        subtotalPrice: updatedCheckout.subtotalPrice,
                        totalPrice: updatedCheckout.totalPrice,
                    }
                    : prev
            );
            setTaxReady(true);
            pushToast('success', 'Address received. Tax updated');
        } catch {
            setTaxReady(false);
            pushToast('error', 'Tax calculation failed');
        } finally {
            setUpdatingTax(false);
        }
    }

    return (
        <main className="min-h-screen bg-gray-100 px-6 pt-24">
            {/* TOASTS */}
            <ToastContainer toasts={toasts} onClose={closeToast} />
            <div className="max-w-6xl mx-auto mb-6 flex gap-3">
                <button
                    type="button"
                    onClick={() => router.push('/')}
                    className="bg-gray-700 text-white rounded-sm px-4 py-3 text-sm uppercase tracking-wide hover:bg-gray-800 transition"
                >
                    Main
                </button>

                <button
                    type="button"
                    onClick={() => router.push('/profile')}
                    className="bg-[#2B3A4A] text-white rounded-sm px-4 py-3 text-sm uppercase tracking-wide hover:bg-[#111a2e] transition"
                >
                    Profile
                </button>
            </div>
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">

                {/* LEFT */}
                <div>
                    {checkoutImage && (
                        <div className="mb-8">
                            <img
                                src={checkoutImage.imageUrl}
                                alt={checkoutImage.alt ?? ''}
                                className="w-full rounded-2xl"
                            />
                        </div>
                    )}

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
                {/* RIGHT */}
                <div className="w-full">

                    {/* NOT AUTHENTICATED */}
                    {!isAuthenticated && (
                        <section className="space-y-4">
                            <p className="text-sm text-gray-700">
                                Please sign in to continue checkout
                            </p>

                            <button
                                type="button"
                                onClick={() => router.push('/login')}
                                className="bg-[#2B3A4A] text-white rounded-sm px-4 py-3 text-sm uppercase tracking-wide hover:bg-[#111a2e] transition"
                            >
                                Sign in
                            </button>
                        </section>
                    )}

                    {/* AUTHENTICATED */}
                    {isAuthenticated && (
                        <div className="space-y-20 w-full">

                            {/* USER HEADER */}
                            <section className="space-y-2 text-sm">
                                <div className="text-gray-700">
                                    <strong>{user!.email}</strong>
                                </div>
                            </section>

                            {/* SHIPPING ADDRESS FORM */}
                            <section>
                                <h2 className="mb-6 text-sm uppercase tracking-wide text-gray-700">
                                    Shipping Address
                                </h2>

                                <div className="space-y-6">
                                    <FormField label="Full Name">
                                        <input
                                            value={address.fullName}
                                            onChange={e =>
                                                setAddress(a => ({ ...a, fullName: e.target.value }))
                                            }
                                            className="w-full bg-transparent outline-none text-sm"
                                        />
                                    </FormField>

                                    <FormField label="Street Address">
                                        <input
                                            value={address.streetAddress1}
                                            onChange={e =>
                                                setAddress(a => ({ ...a, streetAddress1: e.target.value }))
                                            }
                                            className="w-full bg-transparent outline-none text-sm"
                                        />
                                    </FormField>

                                    <FormField label="Street Address 2">
                                        <input
                                            value={address.streetAddress2}
                                            onChange={e =>
                                                setAddress(a => ({ ...a, streetAddress2: e.target.value }))
                                            }
                                            className="w-full bg-transparent outline-none text-sm"
                                        />
                                    </FormField>

                                    <FormField label="City">
                                        <input
                                            value={address.city}
                                            onChange={e =>
                                                setAddress(a => ({ ...a, city: e.target.value }))
                                            }
                                            className="w-full bg-transparent outline-none text-sm"
                                        />
                                    </FormField>

                                    <FormField label="State">
                                        <input
                                            value={address.countryArea}
                                            onChange={e => {
                                                setAddress(a => ({
                                                    ...a,
                                                    countryArea: e.target.value.toUpperCase(),
                                                }));
                                                setTaxReady(false);
                                            }}
                                            className="w-full bg-transparent outline-none text-sm"
                                            placeholder="TX"
                                        />
                                    </FormField>

                                    <FormField label="ZIP Code">
                                        <input
                                            value={address.postalCode}
                                            onChange={e =>
                                                setAddress(a => ({ ...a, postalCode: e.target.value }))
                                            }
                                            onBlur={updateTaxFromAddress}
                                            className="w-full bg-transparent outline-none text-sm"
                                            placeholder="78717"
                                        />
                                    </FormField>
                                </div>
                            </section>

                            {/* PAYMENT */}
                            <StripeProvider clientSecret={clientSecret}>
                                <PayForm
                                    clientSecret={clientSecret}
                                    billing={billing}
                                    setBilling={setBilling}
                                    taxReady={taxReady}
                                    setTaxReady={setTaxReady}
                                    updatingTax={updatingTax}
                                    updateTaxFromAddress={updateTaxFromAddress}
                                    pushToast={pushToast}
                                />
                            </StripeProvider>
                        </div>
                    )}
                </div>




            </div>

        </main>
    );
}
