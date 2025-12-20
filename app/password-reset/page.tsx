'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { saleorFetch } from '@/lib/saleor';

/* =========================
   Toast types
   ========================= */

type ToastType = 'error' | 'success';

type Toast = {
    id: number;
    type: ToastType;
    message: string;
};

type ToastContainerProps = {
    toasts: Toast[];
    onClose: (id: number) => void;
};

function ToastContainer({ toasts, onClose }: ToastContainerProps) {
    return (
        <div className="fixed top-6 right-6 z-50 space-y-3">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`relative px-5 py-4 pr-10 rounded-sm text-sm shadow-lg ${
                        toast.type === 'error'
                            ? 'bg-red-600 text-red-50'
                            : 'bg-green-600 text-green-50'
                    }`}
                >
                    <button
                        onClick={() => onClose(toast.id)}
                        className="absolute top-2 right-3 text-xs opacity-70 hover:opacity-100"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                    {toast.message}
                </div>
            ))}
        </div>
    );
}

/* =========================
   Reusable FormField
   ========================= */

type FormFieldProps = {
    label: string;
    type?: string;
    value: string;
    onChange: (value: string) => void;
};

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
                autoComplete="new-password"
            />
        </fieldset>
    );
}

/* =========================
   Page
   ========================= */

export default function PasswordResetPage() {
    const params = useSearchParams();
    const router = useRouter();

    const email = params.get('email');
    const token = params.get('token');

    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);

    function pushToast(type: ToastType, message: string) {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    }

    async function submit() {
        if (!email || !token) {
            pushToast('error', 'Invalid recovery link');
            return;
        }

        setLoading(true);

        try {
            const result = await saleorFetch(
                `
                mutation SetPassword(
                  $email: String!
                  $token: String!
                  $password: String!
                ) {
                  setPassword(
                    email: $email
                    token: $token
                    password: $password
                  ) {
                    token
                    errors {
                      message
                    }
                  }
                }
                `,
                {
                    variables: {
                        email,
                        token,
                        password,
                    },
                }
            );

            const data = result?.data?.setPassword;

            if (data?.errors?.length) {
                pushToast('error', data.errors[0].message);
                return;
            }

            localStorage.setItem('saleor_token', data.token);
            pushToast('success', 'Password updated');

            router.replace('/profile');
            router.refresh(); // 🔥 критично для App Router
        } catch {
            pushToast('error', 'Password reset failed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-gray-100 relative">
            <ToastContainer
                toasts={toasts}
                onClose={(id) =>
                    setToasts((prev) => prev.filter((t) => t.id !== id))
                }
            />

            <div className="max-w-2xl mx-auto pt-24 px-4">
                <h2 className="mb-6 text-sm uppercase tracking-wide text-gray-700">
                    Reset Password
                </h2>

                <div className="space-y-6">
                    <FormField
                        label="New Password"
                        type="password"
                        value={password}
                        onChange={setPassword}
                    />

                    <button
                        onClick={submit}
                        disabled={loading}
                        className="flex items-center gap-2 uppercase text-sm tracking-wide disabled:opacity-50"
                    >
                        <span>{loading ? 'Saving…' : 'Save Password'}</span>
                        <span>→</span>
                    </button>
                </div>
            </div>
        </main>
    );
}
