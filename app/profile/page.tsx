'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saleorFetch } from '@/lib/saleor';

/* =========================
   Reusable form field
   ========================= */
function FormField({
                       label,
                       value,
                       onChange,
                       type = 'text',
                   }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
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
                className="w-full bg-transparent outline-none text-sm"
                autoComplete="off"
            />
        </fieldset>
    );
}

/* =========================
   Page
   ========================= */
export default function ProfilePage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);

    // display
    const [email, setEmail] = useState('');

    // profile
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');

    // shipping
    const [street, setStreet] = useState('');
    const [city, setCity] = useState('');
    const [zip, setZip] = useState('');
    const [country, setCountry] = useState('US');

    // security
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    /* =========================
       Load profile
       ========================= */
    useEffect(() => {
        const token = localStorage.getItem('saleor_token') ?? undefined;
        if (!token) {
            router.replace('/login');
            return;
        }

        async function loadProfile() {
            const result = await saleorFetch(
                `
        query Me {
          me {
            email
            firstName
            lastName
            defaultShippingAddress {
              streetAddress1
              city
              postalCode
              country { code }
            }
          }
        }
        `,
                { token }
            );

            const me = result?.data?.me;
            if (!me) {
                router.replace('/login');
                return;
            }

            setEmail(me.email ?? '');
            setFirstName(me.firstName ?? '');
            setLastName(me.lastName ?? '');

            if (me.defaultShippingAddress) {
                setStreet(me.defaultShippingAddress.streetAddress1 ?? '');
                setCity(me.defaultShippingAddress.city ?? '');
                setZip(me.defaultShippingAddress.postalCode ?? '');
                setCountry(me.defaultShippingAddress.country?.code ?? 'US');
            }

            setLoading(false);
        }

        loadProfile();
    }, [router]);

    /* =========================
       Logout
       ========================= */
    function logout() {
        localStorage.removeItem('saleor_token');
        router.replace('/login');
    }

    /* =========================
       Submit
       ========================= */
    async function submit() {
        const token = localStorage.getItem('saleor_token') ?? undefined;
        if (!token) return;

        if (!currentPassword) {
            alert('Current password is required');
            return;
        }

        // update profile
        await saleorFetch(
            `
      mutation UpdateAccount(
        $firstName: String!
        $lastName: String!
      ) {
        accountUpdate(
          input: {
            firstName: $firstName
            lastName: $lastName
          }
        ) {
          errors { message }
        }
      }
      `,
            {
                token,
                variables: { firstName, lastName },
            }
        );

        // change password (optional)
        if (newPassword) {
            if (newPassword !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }

            await saleorFetch(
                `
        mutation ChangePassword(
          $oldPassword: String!
          $newPassword: String!
        ) {
          accountChangePassword(
            oldPassword: $oldPassword
            newPassword: $newPassword
          ) {
            errors { message }
          }
        }
        `,
                {
                    token,
                    variables: {
                        oldPassword: currentPassword,
                        newPassword,
                    },
                }
            );
        }

        alert('Profile updated');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
    }

    if (loading) {
        return (
            <div className="p-8 text-sm uppercase tracking-wide text-gray-500">
                Loading profile…
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gray-100 relative">

            {/* CHECKOUT button */}
            <div className="absolute top-6 left-6">
                <button
                    type="button"
                    onClick={() => router.push('/checkout')}
                    className="bg-[#2B3A4A] text-white rounded-sm px-4 py-3 text-sm uppercase tracking-wide hover:bg-[#111a2e] transition"
                >
                    Checkout
                </button>
            </div>

            {/* LOGOUT */}
            <div className="absolute bottom-6 left-15">
                <button
                    onClick={logout}
                    className="text-xs uppercase tracking-wide text-gray-500 hover:text-gray-800"
                >
                    Logout →
                </button>
            </div>

            <div className="max-w-xl mx-auto pt-24 px-4 space-y-10">

                <h1 className="text-sm uppercase tracking-wide text-gray-700">
                    Profile · {email}
                </h1>

                {/* PROFILE */}
                <section className="space-y-6">
                    <FormField label="First Name" value={firstName} onChange={setFirstName} />
                    <FormField label="Last Name" value={lastName} onChange={setLastName} />
                </section>

                {/* SHIPPING */}
                <section className="space-y-6">
                    <h2 className="text-xs uppercase tracking-wide text-gray-600">
                        Shipping Address
                    </h2>
                    <FormField label="Street" value={street} onChange={setStreet} />
                    <FormField label="City" value={city} onChange={setCity} />
                    <FormField label="ZIP Code" value={zip} onChange={setZip} />
                    <FormField label="Country" value={country} onChange={setCountry} />
                </section>

                {/* SECURITY */}
                <section className="space-y-6">
                    <h2 className="text-xs uppercase tracking-wide text-gray-600">
                        Security
                    </h2>
                    <FormField
                        label="New Password"
                        type="password"
                        value={newPassword}
                        onChange={setNewPassword}
                    />
                    <FormField
                        label="Confirm New Password"
                        type="password"
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                    />
                    <FormField
                        label="Current Password"
                        type="password"
                        value={currentPassword}
                        onChange={setCurrentPassword}
                    />
                </section>

                <button
                    onClick={submit}
                    className="bg-[#2B3A4A] text-white px-6 py-3 mb-24 uppercase text-sm tracking-wide rounded-sm"
                >
                    Send →
                </button>
            </div>
        </main>
    );
}
