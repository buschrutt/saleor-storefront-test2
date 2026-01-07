'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckoutSummary } from './CheckoutSummary'
import { CheckoutLogic } from './CheckoutLogic'
import type { Billing, Address } from '@/types/checkout'
import { useToast } from '@/app/components/useToast'
import ToastContainer from '@/app/components/ToastContainer'

/* =========================
   Types
   ========================= */

type CheckoutUser = {
    email: string
}

type Money = {
    amount: number
    currency: string
}

type Checkout = {
    id: string
    user?: CheckoutUser | null
    shippingAddress?: Address | null
    totalPrice?: {
        net?: { amount: number }
        gross?: Money
    }
}

type CheckoutImage = {
    imageUrl: string
    alt?: string
} | null

type LeftColumn = {
    product: {
        name: string
        description: string | null
    }
    quantity: number
    image: {
        url: string
        alt: string | null
    } | null
    basePrice: {
        net: number
        currency: string
    }
}

/* =========================
   Page
   ========================= */

export default function CheckoutClient({
                                           checkoutImage,
                                       }: {
    checkoutImage: CheckoutImage
}) {
    const router = useRouter()
    const { toasts, pushToast, closeToast } = useToast()

    /* =========================
       State
       ========================= */
    const [user, setUser] = useState<{ email: string } | null>(null)
    const [checkout, setCheckout] = useState<Checkout | null>(null)
    const [leftColumn, setLeftColumn] = useState<LeftColumn | null>(null)

    const [clientSecret, setClientSecret] = useState<string>()
    const [taxReady, setTaxReady] = useState(false)
    const [updatingTax, setUpdatingTax] = useState(false)

    const [address, setAddress] = useState<Address>({
        fullName: '',
        streetAddress1: '',
        streetAddress2: '',
        city: '',
        countryArea: '',
        postalCode: '',
        country: 'US',
    })

    const [billing, setBilling] = useState<Billing>({
        firstName: '',
        lastName: '',
        postalCode: '',
        state: '',
        country: 'US',
    })

    /* =========================
       Load LEFT column (static product data)
       ========================= */
    useEffect(() => {
        fetch('/api/checkout/leftColumn')
            .then(r => r.json())
            .then(setLeftColumn)
            .catch(console.error)
    }, [])

    /* =========================
       Load user (optional)
       ========================= */
    useEffect(() => {
        fetch('/api/me')
            .then(r => r.json())
            .then(data => setUser(data.user))
            .catch(() => setUser(null))
    }, [])

    /* =========================
       Create checkout
       ========================= */
    useEffect(() => {
        fetch('/api/checkout/create', { method: 'POST' })
            .then(r => r.json())
            .then(setCheckout)
            .catch(console.error)
    }, [])

    /* =========================
       CREATE PAYMENT INTENT
       =========================
    */
    useEffect(() => {
        if (!taxReady) return
        if (!checkout?.totalPrice?.gross) return
        if (clientSecret) return //

        fetch('/api/checkout/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: checkout.totalPrice.gross.amount,
                currency: checkout.totalPrice.gross.currency.toLowerCase(),
            }),
        })
            .then(r => r.json())
            .then(d => setClientSecret(d.clientSecret))
            .catch(() =>
                pushToast('error', 'Failed to prepare payment')
            )
    }, [taxReady, checkout, pushToast])

    /* =========================
       Safe totals
       ========================= */
    const totalNet =
        checkout?.totalPrice?.net?.amount ??
        leftColumn?.basePrice.net ??
        0

    const totalGross =
        checkout?.totalPrice?.gross?.amount ??
        totalNet

    const currency =
        checkout?.totalPrice?.gross?.currency ??
        leftColumn?.basePrice.currency ??
        'USD'

    const tax = +(totalGross - totalNet).toFixed(2)

    /* =========================
       Tax update (called by button)
       ========================= */
    async function updateTaxFromAddress() {
        if (!checkout) return

        if (!address.streetAddress1 || !address.city) {
            pushToast('info', 'Please enter street and city first')
            return
        }

        if (!address.countryArea || address.countryArea.length < 2) {
            pushToast('error', 'Please enter state')
            return
        }

        if (!/^\d{5}$/.test(address.postalCode)) {
            pushToast('error', 'ZIP code must be 5 digits')
            return
        }

        setUpdatingTax(true)

        try {
            const res = await fetch('/api/checkout/address', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    checkoutId: checkout.id,
                    address: {
                        firstName: address.fullName.split(' ')[0] || ' ',
                        lastName:
                            address.fullName.split(' ').slice(1).join(' ') ||
                            ' ',
                        streetAddress1: address.streetAddress1,
                        streetAddress2: address.streetAddress2 || '',
                        city: address.city,
                        country: 'US',
                        countryArea: address.countryArea,
                        postalCode: address.postalCode,
                    },
                }),
            })

            const updated = await res.json()

            setCheckout(prev =>
                prev
                    ? { ...prev, totalPrice: updated.totalPrice }
                    : prev
            )

            setTaxReady(true)
            pushToast('success', 'Tax calculated')
        } catch {
            pushToast('error', 'Tax calculation failed')
        } finally {
            setUpdatingTax(false)
        }
    }

    /* =========================
       Render
       ========================= */
    return (
        <main className="min-h-screen bg-gray-100 px-6 pt-24">
            <ToastContainer toasts={toasts} onClose={closeToast} />

            {/* HARD LOADING ONLY */}
            {(!checkout || !leftColumn) && (
                <div className="flex items-center justify-center h-[60vh]">
                    <p className="text-sm text-gray-500">
                        Loading checkout…
                    </p>
                </div>
            )}

            {/* MAIN UI (ALWAYS VISIBLE) */}
            {checkout && leftColumn && (
                <>
                    {/* NAV */}
                    <div className="max-w-6xl mx-auto mb-6 flex gap-3">
                        <button
                            onClick={() => router.push('/')}
                            className="bg-gray-700 text-white px-4 py-3 text-sm uppercase rounded-sm"
                        >
                            Main
                        </button>

                        <button
                            onClick={() => router.push('/profile')}
                            className="bg-[#2B3A4A] text-white px-4 py-3 text-sm uppercase rounded-sm"
                        >
                            Profile
                        </button>
                    </div>

                    {/* CONTENT */}
                    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
                        <CheckoutSummary
                            checkoutImage={
                                leftColumn.image
                                    ? {
                                        imageUrl: leftColumn.image.url,
                                        alt: leftColumn.image.alt ?? '',
                                    }
                                    : null
                            }
                            line={{
                                quantity: leftColumn.quantity,
                                variant: {
                                    product: {
                                        name: leftColumn.product.name,
                                        description:
                                            leftColumn.product.description ??
                                            '',
                                    },
                                },
                            }}
                            subtotal={leftColumn.basePrice.net}
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
                            clientSecret={clientSecret}
                            taxReady={taxReady}
                            updatingTax={updatingTax}
                            updateTaxFromAddress={updateTaxFromAddress}
                        />
                    </div>
                </>
            )}
        </main>
    )
}
