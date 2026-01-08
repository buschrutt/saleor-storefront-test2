'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ToastContainer, { Toast, ToastType } from '@/app/components/ToastContainer'
import { saleorFetch } from '@/lib/saleor'
import { authFetch } from '@/lib/authFetch'

/* =========================
   Reusable form field
   ========================= */
function FormField({
                       label,
                       value,
                       onChange,
                       type = 'text',
                   }: {
    label: string
    value: string
    onChange: (v: string) => void
    type?: string
}) {
    return (
        <fieldset className="border border-gray-300 px-3 pb-3 pt-1 rounded-md">
            <legend className="px-1 text-xs tracking-wide text-gray-600">{label}</legend>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-transparent outline-none text-sm h-10"
                autoComplete="off"
            />
        </fieldset>
    )
}

/* =========================
   Types
   ========================= */
type ProfileUpdatePayload = {
    firstName?: string
    lastName?: string
    shippingAddress?: {
        streetAddress1?: string
        streetAddress2?: string
        city?: string
        countryArea?: string
        postalCode?: string
        country?: string
    }
    password?: {
        currentPassword: string
        newPassword: string
    }
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message
    if (typeof error === 'string') return error
    return 'An unknown error occurred'
}

function isAuthError(error: unknown): boolean {
    const msg = getErrorMessage(error).toLowerCase()
    return msg.includes('401') || msg.includes('403') || msg.includes('unauthorized')
}

/* =========================
   Page
   ========================= */
export default function ProfilePage() {
    const router = useRouter()

    // state
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

    // toasts
    const [toasts, setToasts] = useState<Toast[]>([])
    function pushToast(type: ToastType, message: string) {
        const id = Date.now()
        setToasts((t) => [...t, { id, type, message }])
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
    }
    function closeToast(id: number) {
        setToasts((t) => t.filter((x) => x.id !== id))
    }

    // profile
    const [email, setEmail] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')

    // shipping
    const [street1, setStreet1] = useState('')
    const [street2, setStreet2] = useState('')
    const [city, setCity] = useState('')
    const [state, setState] = useState('')
    const [zip, setZip] = useState('')
    const [country, setCountry] = useState('US')

    // security
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    /* =========================
       Load profile
       ========================= */
    async function loadProfile() {
        const res = await authFetch('/api/profile', { credentials: 'include' }, router)

        if (!res.ok) {
            const txt = await res.text().catch(() => `HTTP ${res.status}`)
            throw new Error(`Failed to load profile: ${txt}`)
        }

        const { me } = await res.json()

        if (!me?.email) {
            setIsAuthenticated(false)
            router.replace('/login')
            return
        }

        setIsAuthenticated(true)
        setEmail(me.email)
        setFirstName(me.firstName ?? '')
        setLastName(me.lastName ?? '')

        const a = me.defaultShippingAddress
        if (a) {
            setStreet1(a.streetAddress1 ?? '')
            setStreet2(a.streetAddress2 ?? '')
            setCity(a.city ?? '')
            setState(a.countryArea ?? '')
            setZip(a.postalCode ?? '')
            setCountry(a.country?.code ?? 'US')
        }
    }

    useEffect(() => {
        ;(async () => {
            try {
                await loadProfile()
            } catch (err) {
                console.error(err)
                if (isAuthError(err)) {
                    router.replace('/login')
                } else {
                    pushToast('error', getErrorMessage(err))
                }
            } finally {
                setLoading(false)
            }
        })()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    /* =========================
       Verify password
       ========================= */
    async function verifyCurrentPasswordOrThrow() {
        if (!email) throw new Error('Email missing')
        if (!currentPassword.trim()) throw new Error('Current password required')

        const result = await saleorFetch<{
            tokenCreate: {
                errors: { message: string }[]
                token?: string
            }
        }>({
            query: `
                mutation VerifyPassword($email: String!, $password: String!) {
                    tokenCreate(email: $email, password: $password) {
                        errors { message }
                        token
                    }
                }
            `,
            variables: {
                email,
                password: currentPassword.trim(),
            },
        })

        if (result.tokenCreate.errors.length) {
            throw new Error(result.tokenCreate.errors[0].message)
        }
    }

    /* =========================
       Submit
       ========================= */
    async function submit() {
        if (saving) return

        if (newPassword || confirmPassword) {
            if (!newPassword || !confirmPassword) {
                pushToast('error', 'Please confirm new password')
                return
            }
            if (newPassword !== confirmPassword) {
                pushToast('error', 'Passwords do not match')
                return
            }
            if (newPassword.length < 8) {
                pushToast('error', 'Password too short')
                return
            }
        }

        const payload: ProfileUpdatePayload = {}

        if (firstName.trim() || lastName.trim()) {
            payload.firstName = firstName.trim()
            payload.lastName = lastName.trim()
        }

        if (street1 || street2 || city || state || zip) {
            payload.shippingAddress = {
                streetAddress1: street1,
                streetAddress2: street2,
                city,
                countryArea: state,
                postalCode: zip,
                country,
            }
        }

        if (newPassword) {
            payload.password = {
                currentPassword: currentPassword.trim(),
                newPassword,
            }
        }

        if (!Object.keys(payload).length) {
            pushToast('error', 'No changes to save')
            return
        }

        setSaving(true)
        try {
            await verifyCurrentPasswordOrThrow()

            const res = await authFetch(
                '/api/profile',
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                },
                router
            )

            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error || 'Update failed')

            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')

            await loadProfile()
            pushToast('success', 'Profile updated')
        } catch (err) {
            console.error(err)
            pushToast('error', getErrorMessage(err))
        } finally {
            setSaving(false)
        }
    }

    /* =========================
       Render
       ========================= */
    if (loading) {
        return (
            <main className="min-h-screen bg-gray-100">
                <ToastContainer toasts={toasts} onClose={closeToast} />
                <div className="p-8 text-sm">Loading profile…</div>
            </main>
        )
    }

    if (!isAuthenticated) return null

    return (
        <main className="min-h-screen bg-gray-100">
            <ToastContainer toasts={toasts} onClose={closeToast} />

            {/* NAV buttons */}
            <div className="absolute top-6 left-6 flex flex-col gap-3">
                <button
                    type="button"
                    onClick={() => router.push('/')}
                    className="bg-gray-700 text-white rounded-sm px-4 py-3 text-sm uppercase tracking-wide hover:bg-gray-800 transition"
                >
                    Main
                </button>

                <button
                    type="button"
                    onClick={() => router.push('/checkout')}
                    className="bg-[#2B3A4A] text-white rounded-sm px-4 py-3 text-sm uppercase tracking-wide hover:bg-[#111a2e] transition"
                >
                    Checkout
                </button>

                <button
                    type="button"
                    onClick={async () => {
                        try {
                            await fetch('/api/logout', { method: 'POST', credentials: 'include' })
                        } finally {
                            router.replace('/login')
                        }
                    }}
                    className="bg-[#2B3A4A] text-white px-4 py-3 uppercase text-sm tracking-wide rounded-sm hover:bg-[#111a2e] transition"
                >
                    Logout →
                </button>
            </div>


            <div className="max-w-xl mx-auto pt-24 px-4 space-y-10">
                <h1 className="text-sm uppercase tracking-wide">Profile · {email}</h1>

                <section className="space-y-4">
                    <FormField label="First Name" value={firstName} onChange={setFirstName} />
                    <FormField label="Last Name" value={lastName} onChange={setLastName} />
                </section>

                <section className="space-y-4">
                    <FormField label="Street line 1" value={street1} onChange={setStreet1} />
                    <FormField label="Street line 2" value={street2} onChange={setStreet2} />
                    <FormField label="City" value={city} onChange={setCity} />
                    <FormField label="State" value={state} onChange={setState} />
                    <FormField label="ZIP" value={zip} onChange={setZip} />
                </section>

                <section className="space-y-4">
                    <FormField
                        label="New Password"
                        type="password"
                        value={newPassword}
                        onChange={setNewPassword}
                    />
                    <FormField
                        label="Confirm Password"
                        type="password"
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                    />
                    <FormField
                        label="Current Password (required)"
                        type="password"
                        value={currentPassword}
                        onChange={setCurrentPassword}
                    />
                </section>

                <button
                    onClick={submit}
                    disabled={saving}
                    className="bg-[#2B3A4A] text-white px-6 py-3 uppercase text-sm rounded-sm disabled:opacity-60 mb-24"
                >
                    {saving ? 'Saving…' : 'Save →'}
                </button>
            </div>
        </main>
    )
}
