'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import type { Billing, Address, User } from '@/types/checkout';
import type { Checkout } from '@/lib/graphql/mutations/checkoutCreateList';
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
            lineHeight: '40px',
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
                     billing,
                     setBilling,
                     taxReady,
                     checkout,
                     address,
                     user,
                     pushToast,
                 }: {
    billing: Billing;
    setBilling: React.Dispatch<React.SetStateAction<Billing>>;
    taxReady: boolean;
    checkout: Checkout;
    address: Address;
    user: User;
    pushToast: (type: 'success' | 'error' | 'info', message: string) => void;
}) {
    const stripe = useStripe();
    const elements = useElements();
    const router = useRouter();
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

        if (!checkout?.id) {
            pushToast('error', 'Checkout missing');
            return;
        }

        setPaying(true);
        pushToast('info', 'Processing payment…');

        // 1. Получаем данные карты от Stripe Elements
        const cardElement = elements.getElement(CardNumberElement);
        if (!cardElement) {
            pushToast('error', 'Card details missing');
            setPaying(false);
            return;
        }

        // 2. Создаем payment method в Stripe
        const { paymentMethod, error } = await stripe.createPaymentMethod({
            type: 'card',
            card: cardElement,
            billing_details: {
                name: `${billing.firstName} ${billing.lastName}`,
                address: {
                    postal_code: billing.postalCode,
                    state: billing.state,
                    country: billing.country,
                },
            },
        });

        if (error || !paymentMethod) {
            pushToast('error', error?.message || 'Failed to create payment method');
            setPaying(false);
            return;
        }

        // 3. Определяем тип для paymentData
        type PaymentData = {
            paymentMethod: string;
            type: string;
            savePaymentMethod?: boolean;
            returnUrl?: string;
        };

        const paymentData: PaymentData = {
            paymentMethod: paymentMethod.id,
            type: 'card',
            savePaymentMethod: false,
            returnUrl: window.location.href,
        };

        // 4. Запускаем Saleor Payment Flow
        const res = await fetch('/api/checkout/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                checkoutId: checkout.id,
                email: user.email,
                billingAddress: {
                    firstName: billing.firstName,
                    lastName: billing.lastName,
                    streetAddress1: address.streetAddress1,
                    streetAddress2: address.streetAddress2 || '',
                    city: address.city,
                    countryArea: address.countryArea,
                    postalCode: address.postalCode,
                    country: address.country,
                },
                amount: checkout.totalPrice?.gross?.amount || 0,
                paymentData,
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            pushToast('error', data.error || 'Payment failed');
            setPaying(false);
            return;
        }

        const orderId = data.orderId;
        const total = checkout.totalPrice?.gross?.amount ?? 0;
        const currency = checkout.totalPrice?.gross?.currency ?? 'USD';

        pushToast('success', `Order ${orderId} created · $${total} ${currency}`);

        setTimeout(() => {
            router.push('/profile');
        }, 3000);
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
                                  taxReady,
                                  updatingTax,
                                  updateTaxFromAddress,
                                  checkout,
                                  setCheckout,
                                  setTaxReady,
                              }: {
    user: User | null;
    address: Address;
    setAddress: React.Dispatch<React.SetStateAction<Address>>;
    billing: Billing;
    setBilling: React.Dispatch<React.SetStateAction<Billing>>;
    taxReady: boolean;
    updatingTax: boolean;
    updateTaxFromAddress: () => Promise<void>;
    checkout: Checkout | null;
    setCheckout: React.Dispatch<React.SetStateAction<Checkout | null>>;
    setTaxReady: React.Dispatch<React.SetStateAction<boolean>>;
}) {
    const router = useRouter();
    const { toasts, closeToast, pushToast } = useToast();
    const [paymentOpen, setPaymentOpen] = React.useState(false);
    const [checkoutId, setCheckoutId] = React.useState<string | undefined>();
    const [creatingCheckout, setCreatingCheckout] = React.useState(false);
    const DELIVERY_METHOD_ID = 'U2hpcHBpbmdNZXRob2Q6MQ==';

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

    const createCheckout = async () => {
        console.log('🔘 PAYMENT button clicked');
        console.log('📝 Shipping address:', address);
        console.log('✅ Shipping valid:', shippingValid);

        if (!shippingValid) {
            console.log('❌ Shipping not valid');
            pushToast('error', 'Complete shipping address');
            return;
        }

        setCreatingCheckout(true);
        console.log('🔄 Creating checkout...');

        try {
            const checkoutAddress = {
                firstName: address.fullName.split(' ')[0] || '',
                lastName: address.fullName.split(' ').slice(1).join(' ') || '',
                streetAddress1: address.streetAddress1,
                streetAddress2: address.streetAddress2 || '',
                city: address.city,
                countryArea: address.countryArea,
                postalCode: address.postalCode,
                country: 'US',
            };

            console.log('📤 Sending to API:', { checkoutAddress, DELIVERY_METHOD_ID });

            const res = await fetch('/api/checkout/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address: checkoutAddress,
                    deliveryMethodId: DELIVERY_METHOD_ID,
                }),
            });

            console.log('📥 API response status:', res.status);

            const data = await res.json();
            console.log('📦 API response data:', data);

            if (!res.ok) {
                console.error('❌ API error:', data);
                throw new Error(data.error || 'Checkout create failed');
            }

            const checkoutId = data.checkoutId;
            if (!checkoutId) {
                console.error('❌ No checkoutId in response');
                throw new Error('Checkout ID missing');
            }

            console.log('✅ Checkout created:', checkoutId);
            setCheckout(data.checkout);
            setCheckoutId(checkoutId);
            setTaxReady(true);
            setPaymentOpen(true);

            const net = data.checkout?.totalPrice?.net?.amount;
            const gross = data.checkout?.totalPrice?.gross?.amount;
            const currency = data.checkout?.totalPrice?.gross?.currency ?? 'USD';
            const tax = net !== undefined && gross !== undefined
                ? +(gross - net).toFixed(2)
                : null;
            const shipping = data.checkout?.shippingPrice?.gross?.amount;

            if (tax !== null) {
                pushToast('success', `Tax updated · $${tax} ${currency}`);
            }

            if (shipping !== undefined) {
                pushToast('success', `Delivery method added · $${shipping} ${currency}`);
            }

            pushToast('success', `Checkout created · Total $${gross} ${currency}`);

        } catch (err) {
            console.error('❌ Error in createCheckout:', err);
            pushToast('error', 'Failed to create checkout');
        } finally {
            setCreatingCheckout(false);
            console.log('🏁 createCheckout finished');
        }
    };

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
                    disabled={!shippingValid || updatingTax || creatingCheckout || paymentOpen}
                    onClick={createCheckout}
                    className="bg-[#2B3A4A] text-white px-4 py-3 text-sm uppercase rounded-sm mb-12 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {creatingCheckout ? 'Creating checkout…' :
                        updatingTax ? 'Calculating tax…' : 'PAYMENT'}
                </button>
            ) : !checkout ? (
                <p className="text-sm text-gray-500">Preparing checkout…</p>
            ) : (
                <StripeProvider>
                    <PayForm
                        billing={billing}
                        setBilling={setBilling}
                        taxReady={taxReady}
                        checkout={checkout}
                        address={address}
                        user={user}
                        pushToast={pushToast}
                    />
                </StripeProvider>
            )}
        </div>
    );
}