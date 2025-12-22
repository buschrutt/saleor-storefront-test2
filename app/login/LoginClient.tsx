'use client'

import { useState, useEffect } from 'react'
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
                    className={`relative px-5 py-4 pr-10 rounded-md text-sm
            ${
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
type FormFieldProps = {
    label: string
    type?: string
    value: string
    onChange: (value: string) => void
}

function FormField({
                       label,
                       type = 'text',
                       value,
                       onChange,
                   }: FormFieldProps) {
    return (
        <fieldset className="border border-gray-300 px-3 pb-3 pt-1 rounded-md">
            <legend className="px-1 text-xs tracking-wide text-gray-600">
                {label}
            </legend>
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

    const [loadingSignIn, setLoadingSignIn] = useState(false)
    const [loadingRecover, setLoadingRecover] = useState(false)

    async function signIn() {
        setLoadingSignIn(true)
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            })

            const data = await res.json()

            if (!res.ok) {
                pushToast('error', data.error || 'Invalid credentials')
                return
            }

            pushToast('success', 'Successfully signed in')
            window.location.href = '/profile'
        } catch {
            pushToast('error', 'Sign in failed')
        } finally {
            setLoadingSignIn(false)
        }
    }

    async function recover() {
        if (!recoveryEmail.trim()) {
            pushToast('error', 'Please enter recovery email')
            return
        }

        setLoadingRecover(true)

        try {
            const result = await saleorFetch(
                `
        mutation RequestPasswordReset($email: String!, $redirectUrl: String!) {
          requestPasswordReset(email: $email, redirectUrl: $redirectUrl) {
            errors { message }
          }
        }
        `,
                {
                    variables: {
                        email: recoveryEmail,
                        redirectUrl: 'https://pacificmule.com/login',
                    },
                }
            )

            if (result?.data?.requestPasswordReset?.errors?.length) {
                pushToast(
                    'error',
                    result.data.requestPasswordReset.errors[0].message
                )
                return
            }

            pushToast(
                'success',
                'If this email exists, recovery instructions were sent'
            )
        } catch {
            pushToast('error', 'Recovery request failed')
        } finally {
            setLoadingRecover(false)
        }
    }

    return (
        <div className="space-y-6">
            <FormField label="Your Email (Login)" value={email} onChange={setEmail} />
            <FormField
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
            />

            <button onClick={signIn} disabled={loadingSignIn} className="bg-gray-700 text-white rounded-sm px-4 py-3 text-sm uppercase tracking-wide hover:bg-gray-800 transition">
                {loadingSignIn ? 'Signing In…' : 'Sign In'}
            </button>

            <FormField
                label="Recovery Email"
                type="email"
                value={recoveryEmail}
                onChange={setRecoveryEmail}
            />

            <button onClick={recover} disabled={loadingRecover} className="bg-gray-700 text-white rounded-sm px-4 py-3 text-sm uppercase tracking-wide hover:bg-gray-800 transition">
                {loadingRecover ? 'Recovering…' : 'Recover'}
            </button>
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
            const result = await saleorFetch(
                `
        mutation Register(
          $email: String!
          $password: String!
          $firstName: String!
          $lastName: String!
        ) {
          accountRegister(
            input: {
              email: $email
              password: $password
              firstName: $firstName
              lastName: $lastName
              redirectUrl: "https://pacificmule.com/login"
            }
          ) {
            errors { message }
          }
        }
        `,
                { variables: { email, password, firstName, lastName } }
            )

            if (result?.errors?.length) {
                pushToast('error', result.errors[0].message)
                return
            }

            const errors = result?.data?.accountRegister?.errors ?? []
            if (errors.length) {
                pushToast('error', errors[0].message)
                return
            }

            pushToast(
                'success',
                'If this email is not registered, you will receive a confirmation email.'
            )

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

            <button onClick={submit} disabled={loading} className="bg-gray-700 text-white rounded-sm px-4 py-3 text-sm uppercase tracking-wide hover:bg-gray-800 transition">
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

    function pushToast(type: ToastType, message: string) {
        const id = Date.now()
        setToasts((t) => [...t, { id, type, message }])
        setTimeout(() => {
            setToasts((t) => t.filter((toast) => toast.id !== id))
        }, 4000)
    }

    function closeToast(id: number) {
        setToasts((t) => t.filter((toast) => toast.id !== id))
    }

    useEffect(() => {
        const email = params.get('email')
        const token = params.get('token')

        if (email && token && window.location.search.includes('token')) {
            router.replace(
                `/password-reset?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`
            )
            return
        }

        if (email && token) {
            ;(async () => {
                const result = await saleorFetch(
                    `
          mutation ConfirmAccount($email: String!, $token: String!) {
            confirmAccount(email: $email, token: $token) {
              errors { message }
            }
          }
          `,
                    { variables: { email, token } }
                )

                if (result?.data?.confirmAccount?.errors?.length) {
                    pushToast(
                        'error',
                        result.data.confirmAccount.errors[0].message
                    )
                } else {
                    pushToast('success', 'Email successfully confirmed')
                }

                router.replace('/login')
            })()
        }
    }, [params, router])

    return (
        <main className="min-h-screen bg-gray-100 relative">
            <ToastContainer toasts={toasts} onClose={closeToast} />

            <div className="absolute top-6 left-6 flex flex-col gap-3">
                <button
                    onClick={() => router.push('/')}
                    className="bg-gray-700 text-white rounded-sm px-4 py-3 text-sm uppercase tracking-wide hover:bg-gray-800 transition"
                >
                    Main
                </button>

                <button
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
