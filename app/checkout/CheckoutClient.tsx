'use client';

import { CheckoutSummary } from './CheckoutSummary';
import type { Billing, Address} from '@/types/checkout';
import { CheckoutLogic } from './CheckoutLogic';
import { useToast } from '@/app/components/useToast';
import ToastContainer from '@/app/components/ToastContainer';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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

type CheckoutImage = {
    imageUrl: string;
    alt?: string;
} | null;

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
        firstName: '',
        lastName: '',
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

    if (!checkout) {
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
{/* LEFT & RIGHT COLUMNS */}
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
                <CheckoutSummary
                    checkoutImage={checkoutImage}
                    line={line}
                    subtotal={subtotal}
                    tax={tax}
                    total={totalGross}
                    currency={currency}
                />
                <CheckoutLogic
                    user={user}
                    checkout={checkout}
                    address={address}
                    setAddress={setAddress}
                    billing={billing}
                    setBilling={setBilling}
                    clientSecret={clientSecret} // !!!! CHECK OUT
                    taxReady={taxReady}
                    updatingTax={updatingTax}
                    updateTaxFromAddress={updateTaxFromAddress}
                />
            </div>
        </main>
    );
}