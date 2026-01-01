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
                className="w-full bg-transparent outline-none text-sm"
                autoComplete="off"
            />
        </fieldset>
    )
}

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
    const message = getErrorMessage(error).toLowerCase()
    return (
        message.includes('401') ||
        message.includes('403') ||
        message.includes('unauthorized') ||
        message.includes('forbidden') ||
        message.includes('no user data') ||
        message.includes('user not found')
    )
}

export default function ProfilePage() {
    const router = useRouter()

    // UI / state
    const [loading, setLoading] = useState(true)
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
    const [saving, setSaving] = useState(false)

    // Toasts
    const [toasts, setToasts] = useState<Toast[]>([])
    function pushToast(type: ToastType, message: string) {
        const id = Date.now()
        setToasts((t) => [...t, { id, type, message }])
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
    }
    function closeToast(id: number) {
        setToasts((t) => t.filter((x) => x.id !== id))
    }

    // display
    const [email, setEmail] = useState('')

    // profile
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

    async function loadProfile() {
        const profileRes = await authFetch('/api/profile', {}, router)

        if (!profileRes.ok) {
            const txt = await profileRes.text().catch(() => `HTTP ${profileRes.status}`)
            throw new Error(`Failed to load profile: ${txt}`)
        }

        const profileData = await profileRes.json()
        const me = profileData?.me
        if (!me?.email) {
            setIsAuthenticated(false)
            router.replace('/login')
            return
        }

        setIsAuthenticated(true)
        setEmail(me.email || '')
        setFirstName(me.firstName ?? '')
        setLastName(me.lastName ?? '')

        const a = me.defaultShippingAddress
        if (a) {
            setStreet1(a.streetAddress1 ?? '')
            setStreet2(a.streetAddress2 ?? '')
            setCity(a.city ?? '')
            setZip(a.postalCode ?? '')
            setState(a.countryArea ?? '')
            setCountry(a.country?.code ?? 'US')
        }
    }

    /* =========================
       Initial load
       ========================= */
    useEffect(() => {
        ;(async () => {
            setLoading(true)
            try {
                await loadProfile()
            } catch (err) {
                console.error('Profile load error:', err)
                if (isAuthError(err)) {
                    setIsAuthenticated(false)
                    router.replace('/login')
                } else {
                    pushToast('error', getErrorMessage(err))
                }
            } finally {
                setLoading(false)
            }
        })()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router])

    /* =========================
       Strong check: require current password for ANY update
       Реальная проверка делается через tokenCreate (Saleor проверит пароль)
       ========================= */
    async function verifyCurrentPasswordOrThrow() {
        if (!email) throw new Error('Email is missing')

        const cp = currentPassword.trim()
        if (!cp) {
            // ВАЖНО: THROW, а не return — иначе submit продолжит выполнение
            throw new Error('Current password is required')
        }

        const result = await saleorFetch(
            `
        mutation VerifyPassword($email: String!, $password: String!) {
          tokenCreate(email: $email, password: $password) {
            errors { message code }
            token
          }
        }
      `,
            { variables: { email, password: cp } }
        )

        const errors = result?.data?.tokenCreate?.errors ?? []
        if (errors.length) {
            throw new Error(errors[0].message || 'Current password is incorrect')
        }
    }

    /* =========================
       Submit
       ========================= */
    async function submit() {
        if (saving) return

        // 1) Validation (password change)
        const wantsPasswordChange = !!(newPassword || confirmPassword)
        if (wantsPasswordChange) {
            if (!newPassword || !confirmPassword) {
                pushToast('error', 'Please enter and confirm new password')
                return
            }
            if (newPassword !== confirmPassword) {
                pushToast('error', 'Passwords do not match')
                return
            }
            if (newPassword.length < 8) {
                pushToast('error', 'New password is too short')
                return
            }
        }

        // 2) Build payload
        const payload: ProfileUpdatePayload = {}

        const fn = firstName.trim()
        const ln = lastName.trim()
        if (fn || ln) {
            payload.firstName = fn
            payload.lastName = ln
        }

        const s1 = street1.trim()
        const s2 = street2.trim()
        const c = city.trim()
        const st = state.trim()
        const z = zip.trim()
        const co = country.trim()

        if (s1 || s2 || c || st || z || co) {
            payload.shippingAddress = {
                streetAddress1: s1,
                streetAddress2: s2,
                city: c,
                countryArea: st,
                postalCode: z,
                country: co || 'US',
            }
        }

        if (wantsPasswordChange) {
            payload.password = {
                currentPassword: currentPassword.trim(),
                newPassword: newPassword,
            }
        }

        const hasAnyUpdate = !!(payload.firstName || payload.shippingAddress || payload.password)
        if (!hasAnyUpdate) {
            pushToast('error', 'No changes to save')
            return
        }

        setSaving(true)
        try {
            // 3) REQUIRE + VERIFY current password for ANY update
            await verifyCurrentPasswordOrThrow()

            pushToast('info', 'Saving…')

            // 4) Send update to your API
            const res = await authFetch(
                '/api/profile',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                },
                router
            )

            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                throw new Error(data.error || data.message || `Update failed with status ${res.status}`)
            }

            // Clear security fields after success
            setNewPassword('')
            setConfirmPassword('')
            setCurrentPassword('')

            await loadProfile()
            pushToast('success', 'Profile updated')
        } catch (err) {
            console.error('Update error:', err)
            if (isAuthError(err)) {
                setIsAuthenticated(false)
                router.replace('/login')
            } else {
                pushToast('error', getErrorMessage(err))
            }
        } finally {
            setSaving(false)
        }
    }

    /* =========================
       Render states
       ========================= */
    if (loading) {
        return (
            <main className="min-h-screen bg-gray-100 relative">
                <ToastContainer toasts={toasts} onClose={closeToast} />
                <div className="p-8 text-sm uppercase tracking-wide text-gray-500">Loading profile…</div>
            </main>
        )
    }

    if (isAuthenticated === false) {
        return (
            <main className="min-h-screen bg-gray-100 relative">
                <ToastContainer toasts={toasts} onClose={closeToast} />
                <div className="p-8 text-sm uppercase tracking-wide text-gray-500">Redirecting to login…</div>
            </main>
        )
    }

    if (!isAuthenticated) return null

    return (
        <main className="min-h-screen bg-gray-100 relative">
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
                            await fetch('/api/logout', { method: 'POST' })
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
                <h1 className="text-sm uppercase tracking-wide text-gray-700">Profile · {email}</h1>

                {/* PROFILE */}
                <section className="space-y-6">
                    <h2 className="text-xs uppercase tracking-wide text-gray-600">Personal Information</h2>
                    <FormField label="First Name" value={firstName} onChange={setFirstName} />
                    <FormField label="Last Name" value={lastName} onChange={setLastName} />
                </section>

                {/* SHIPPING */}
                <section className="space-y-6">
                    <h2 className="text-xs uppercase tracking-wide text-gray-600">Shipping Address</h2>
                    <FormField label="Street line 1" value={street1} onChange={setStreet1} />
                    <FormField label="Street line 2" value={street2} onChange={setStreet2} />
                    <FormField label="City" value={city} onChange={setCity} />
                    <FormField label="State / Province" value={state} onChange={setState} />
                    <FormField label="ZIP / Postal Code" value={zip} onChange={setZip} />
                    <FormField label="Country" value={country} onChange={setCountry} />
                </section>

                {/* SECURITY */}
                <section className="space-y-6">
                    <h2 className="text-xs uppercase tracking-wide text-gray-600">Change Password</h2>
                    <FormField label="New Password" type="password" value={newPassword} onChange={setNewPassword} />
                    <FormField
                        label="Confirm New Password"
                        type="password"
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                    />

                    <h2 className="text-xs uppercase tracking-wide text-gray-600">CONFIRM CHANGES</h2>
                    <FormField
                        label="Current Password (required to save)"
                        type="password"
                        value={currentPassword}
                        onChange={setCurrentPassword}
                    />
                </section>

                <button
                    type="button"
                    onClick={submit}
                    disabled={saving}
                    className="bg-[#2B3A4A] text-white px-6 py-3 mb-24 uppercase text-sm tracking-wide rounded-sm hover:bg-[#111a2e] transition disabled:opacity-60"
                >
                    {saving ? 'Saving…' : 'Save →'}
                </button>
            </div>
        </main>
    )
}
