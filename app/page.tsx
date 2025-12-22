'use client'

import { useRouter } from 'next/navigation'

export default function HomePage() {
    const router = useRouter()

    return (
        <main className="min-h-screen bg-gray-100 flex flex-col relative">

            {/* Center content */}
            <div className="flex flex-1 items-center justify-center px-4">
                <div className="max-w-xl text-center space-y-6">
                    <h1 className="text-xl tracking-widest text-gray-800">
                        <strong>saleor-storefront-test2</strong>
                    </h1>

                    <p className="text-sm text-gray-600 leading-relaxed">
                        This project is a test implementation of core Saleor services,
                        including authentication, checkout flow, Stripe payments,
                        and customer profile management.<br/>
                        The purpose of this application is to validate API integration,
                        session handling, and end-to-end commerce workflows
                        in a controlled environment.
                    </p>

                    <div className="pt-4 flex justify-center gap-4">
                        <button
                            onClick={() => router.push('/checkout')}
                            className="bg-[#2B3A4A] text-white rounded-sm px-4 py-3 text-sm uppercase tracking-wide"
                        >
                            Checkout
                        </button>

                        <button
                            onClick={() => router.push('/profile')}
                            className="bg-gray-700 text-white rounded-sm px-4 py-3 text-sm uppercase tracking-wide"
                        >
                            Profile
                        </button>
                    </div>
                </div>
            </div>
        </main>
    )
}
