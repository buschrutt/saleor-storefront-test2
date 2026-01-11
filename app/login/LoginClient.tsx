'use client'

import { useState, useEffect, useRef } from 'react'
import { saleorFetch } from '@/lib/saleor'
import { useSearchParams, useRouter } from 'next/navigation'

/* =========================
   Toast system
   ========================= */
type ToastType = 'error' | 'success' | 'info'

type Toast = {
    id: number
    type: ToastType
    message: string
}

const STOREFRONT_URL =
    process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3000'

function ToastContainer({
                            toasts,
                            onClose,
                        }: {
    toasts: Toast[]
    onClose: (id: number) => void
}) {
    return (
        <div className="fixed top-6 right-6 z-50 space-y-3">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`relative px-5 py-4 pr-10 rounded-md text-sm ${
                        toast.type === 'error'
                            ? 'bg-red-600 text-red-50'
                            : toast.type === 'success'
                                ? 'bg-green-600 text-green-50'
                                : toast.type === 'info'
                                    ? 'bg-yellow-500 text-yellow-50'
                                    : 'bg-gray-600 text-gray-50'
                    }`}
                >
                    <button
                        onClick={() => onClose(toast.id)}
                        className="absolute top-2 right-3 text-xs opacity-70 hover:opacity-100"
                        type="button"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                    {toast.message}
                </div>
            ))}
        </div>
    )
}

/* =========================
   Reusable form field
   ========================= */
function FormField({
                       label,
                       type = 'text',
                       value,
                       onChange,
                   }: {
    label: string
    type?: string
    value: string
    onChange: (value: string) => void
}) {
    return (
        <fieldset className="border border-gray-300 px-3 pb-3 pt-1 rounded-md">
            <legend className="px-1 text-xs tracking-wide text-gray-600">
                {label}
            </legend>
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
   Login form
   ========================= */
function LoginForm({
                       pushToast,
                   }: {
    pushToast: (t: ToastType, m: string) => void
}) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [recoveryEmail, setRecoveryEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [recoveryLoading, setRecoveryLoading] = useState(false)

    async function signIn() {
        setLoading(true)
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            })

            const data = await res.json().catch(() => null)

            if (!res.ok) {
                pushToast('error', data?.error || 'Invalid credentials')
                return
            }

            pushToast('success', 'Successfully signed in')
            window.location.href = '/profile'
        } catch {
            pushToast('error', 'Sign in failed')
        } finally {
            setLoading(false)
        }
    }

    async function recovery() {
        const cleanEmail = recoveryEmail.trim()
        if (!cleanEmail) {
            pushToast('error', 'Enter your email')
            return
        }

        setRecoveryLoading(true)

        try {
            const redirectUrl = `${STOREFRONT_URL}/password-reset`

            const result = await saleorFetch<{
                requestPasswordReset: { errors: { message: string }[] }
            }>({
                query: `
          mutation RequestPasswordReset($email: String!, $redirectUrl: String!) {
            requestPasswordReset(email: $email, redirectUrl: $redirectUrl) {
              errors { message }
            }
          }
        `,
                variables: {
                    email: cleanEmail,
                    redirectUrl,
                },
            })

            // Saleor часто возвращает success даже когда email не существует — это нормально.
            if (result.requestPasswordReset.errors?.length) {
                pushToast('error', result.requestPasswordReset.errors[0].message)
                return
            }

            // Правильный UX: не раскрываем, существует ли email.
            pushToast(
                'success',
                'If this email exists, a recovery link has been sent. Check your inbox and spam folder.'
            )
            setRecoveryEmail('')
        } catch (e) {
            // Оставим один “тихий” лог для дебага, без спама в консоль
            console.error(e)
            pushToast('error', 'Password recovery failed')
        } finally {
            setRecoveryLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* SIGN IN */}
            <FormField label="Your Email (Login)" value={email} onChange={setEmail} />
            <FormField
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
            />

            <button
                onClick={signIn}
                disabled={loading}
                className="bg-gray-700 text-white rounded-sm px-4 py-3 text-sm uppercase tracking-wide hover:bg-gray-800 transition disabled:opacity-60"
                type="button"
            >
                {loading ? 'Signing In…' : 'Sign In'}
            </button>

            {/* PASSWORD RECOVERY */}
            <div className="space-y-6 pt-8">
                <div className="text-sm uppercase tracking-wide text-gray-600">
                    Password Recovery
                </div>

                <FormField
                    label="Email for recovery"
                    value={recoveryEmail}
                    onChange={setRecoveryEmail}
                />

                <button
                    onClick={recovery}
                    disabled={recoveryLoading}
                    className="bg-gray-700 text-white rounded-sm px-4 py-3 text-sm uppercase tracking-wide hover:bg-gray-800 transition disabled:opacity-60"
                    type="button"
                >
                    {recoveryLoading ? 'Sending…' : 'Recovery'}
                </button>
            </div>
        </div>
    )
}

/* =========================
   Register form
   ========================= */
function RegisterForm({
                          pushToast,
                      }: {
    pushToast: (t: ToastType, m: string) => void
}) {
    const [email, setEmail] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [password, setPassword] = useState('')
    const [passwordConfirm, setPasswordConfirm] = useState('')
    const [loading, setLoading] = useState(false)

    async function submit() {
        if (password !== passwordConfirm) {
            pushToast('error', 'Passwords do not match')
            return
        }

        setLoading(true)
        try {
            const result = await saleorFetch<{
                accountRegister: { errors: { message: string }[] }
            }>({
                query: `
          mutation Register(
            $email: String!
            $password: String!
            $firstName: String!
            $lastName: String!
            $redirectUrl: String!
          ) {
            accountRegister(
              input: {
                email: $email
                password: $password
                firstName: $firstName
                lastName: $lastName
                redirectUrl: $redirectUrl
              }
            ) {
              errors { message }
            }
          }
        `,
                variables: {
                    email,
                    password,
                    firstName,
                    lastName,
                    redirectUrl: `${STOREFRONT_URL}/login`,
                },
            })

            if (result.accountRegister.errors.length) {
                pushToast('error', result.accountRegister.errors[0].message)
                return
            }

            pushToast('success', 'Check your email to confirm registration')
            setEmail('')
            setFirstName('')
            setLastName('')
            setPassword('')
            setPasswordConfirm('')
        } catch {
            pushToast('error', 'Registration failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <FormField label="Your Email" value={email} onChange={setEmail} />
            <FormField label="First Name" value={firstName} onChange={setFirstName} />
            <FormField label="Last Name" value={lastName} onChange={setLastName} />
            <FormField
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
            />
            <FormField
                label="Confirm Password"
                type="password"
                value={passwordConfirm}
                onChange={setPasswordConfirm}
            />

            <button
                onClick={submit}
                disabled={loading}
                className="bg-gray-700 text-white rounded-sm px-4 py-3 text-sm uppercase tracking-wide hover:bg-gray-800 transition disabled:opacity-60"
                type="button"
            >
                {loading ? 'Signing Up…' : 'Sign Up'}
            </button>
        </div>
    )
}

/* =========================
   Client Page
   ========================= */
export default function LoginClient() {
    const [toasts, setToasts] = useState<Toast[]>([])
    const params = useSearchParams()
    const router = useRouter()
    const processedRef = useRef(false)

    function pushToast(type: ToastType, message: string) {
        const id = Date.now()
        setToasts((t) => [...t, { id, type, message }])
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
    }

    function closeToast(id: number) {
        setToasts((t) => t.filter((x) => x.id !== id))
    }

    /* =========================
       Email confirmation
       ========================= */
    useEffect(() => {
        const email = params.get('email')
        const token = params.get('token')
        if (!email || !token || processedRef.current) return

        processedRef.current = true

        ;(async () => {
            try {
                const result = await saleorFetch<{
                    confirmAccount: { errors: { message: string }[] }
                }>({
                    query: `
            mutation ConfirmAccount($email: String!, $token: String!) {
              confirmAccount(email: $email, token: $token) {
                errors { message }
              }
            }
          `,
                    variables: { email, token },
                })

                if (result.confirmAccount.errors.length) {
                    pushToast('error', result.confirmAccount.errors[0].message)
                } else {
                    pushToast('success', 'Email successfully confirmed')
                }
            } catch {
                pushToast('error', 'Confirmation failed')
            } finally {
                router.replace('/login')
            }
        })()
    }, [params, router])

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
            </div>

            <div className="max-w-6xl mx-auto pt-24 px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div>
                        <h2 className="mb-6 text-sm uppercase tracking-wide text-gray-700">
                            Sign In
                        </h2>
                        <LoginForm pushToast={pushToast} />
                    </div>

                    <div>
                        <h2 className="mb-6 text-sm uppercase tracking-wide text-gray-700">
                            Sign Up
                        </h2>
                        <RegisterForm pushToast={pushToast} />
                    </div>
                </div>
            </div>
        </main>
    )
}
