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
    const [error, setError] = useState<string | null>(null);

    // display
    const [email, setEmail] = useState('');

    // profile
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');

    // shipping
    const [addressId, setAddressId] = useState<string | null>(null);
    const [street1, setStreet1] = useState('');
    const [street2, setStreet2] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [zip, setZip] = useState('');
    const [country, setCountry] = useState('US');

    // security
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    /* =========================
       Auth helpers (TS-safe)
       ========================= */
    function requireToken(): string {
        const token = localStorage.getItem('saleor_token');
        if (!token) {
            localStorage.removeItem('saleor_token');
            router.replace('/login');
            throw new Error('No auth token');
        }
        return token;
    }

    function authHeaders(token: string): Record<string, string> {
        return { Authorization: `Bearer ${token}` };
    }

    function logout() {
        localStorage.removeItem('saleor_token');
        router.replace('/login');
    }

    function forceLogout() {
        localStorage.removeItem('saleor_token');
        router.replace('/login');
    }

    /* =========================
       Load profile + shipping
       ========================= */
    useEffect(() => {
        let token: string;
        try {
            token = requireToken();
        } catch {
            return;
        }

        async function loadProfile() {
            try {
                const res = await saleorFetch(
                    `
                    query Me {
                      me {
                        email
                        firstName
                        lastName
                        defaultShippingAddress {
                          id
                          streetAddress1
                          streetAddress2
                          city
                          postalCode
                          countryArea
                          country { code }
                        }
                      }
                    }
                    `,
                    { headers: authHeaders(token) }
                );

                const me = res?.data?.me;
                if (!me) {
                    forceLogout();
                    return;
                }

                setEmail(me.email ?? '');
                setFirstName(me.firstName ?? '');
                setLastName(me.lastName ?? '');

                if (me.defaultShippingAddress) {
                    const a = me.defaultShippingAddress;
                    setAddressId(a.id);
                    setStreet1(a.streetAddress1 ?? '');
                    setStreet2(a.streetAddress2 ?? '');
                    setCity(a.city ?? '');
                    setZip(a.postalCode ?? '');
                    setState(a.countryArea ?? '');
                    setCountry(a.country?.code ?? 'US');
                }

                setLoading(false);
            } catch {
                forceLogout();
            }
        }

        loadProfile();
    }, [router]);

    /* =========================
       Submit
       ========================= */
    async function submit() {
        let token: string;
        try {
            token = requireToken();
        } catch {
            return;
        }

        setError(null);

        /* ---- Update profile ---- */
        const profileRes = await saleorFetch(
            `
            mutation UpdateAccount($firstName: String!, $lastName: String!) {
              accountUpdate(input: { firstName: $firstName, lastName: $lastName }) {
                errors { message }
              }
            }
            `,
            {
                headers: authHeaders(token),
                variables: { firstName, lastName },
            }
        );

        if (profileRes?.data?.accountUpdate?.errors?.length) {
            setError(profileRes.data.accountUpdate.errors[0].message);
            return;
        }

        /* ---- Create / update shipping address ---- */
        let currentAddressId = addressId;

        if (street1 && city && zip) {
            const addressInput = {
                streetAddress1: street1,
                streetAddress2: street2 || null,
                city,
                postalCode: zip,
                country,
                countryArea: state || null,
            };

            if (!currentAddressId) {
                const createRes = await saleorFetch(
                    `
                    mutation CreateAddress($input: AddressInput!) {
                      accountAddressCreate(input: $input) {
                        address { id }
                        errors { message }
                      }
                    }
                    `,
                    {
                        headers: authHeaders(token),
                        variables: { input: addressInput },
                    }
                );

                if (createRes?.data?.accountAddressCreate?.errors?.length) {
                    setError(createRes.data.accountAddressCreate.errors[0].message);
                    return;
                }

                currentAddressId =
                    createRes?.data?.accountAddressCreate?.address?.id ?? null;

                setAddressId(currentAddressId);
            } else {
                const updateRes = await saleorFetch(
                    `
                    mutation UpdateAddress($id: ID!, $input: AddressInput!) {
                      accountAddressUpdate(id: $id, input: $input) {
                        errors { message }
                      }
                    }
                    `,
                    {
                        headers: authHeaders(token),
                        variables: {
                            id: currentAddressId,
                            input: addressInput,
                        },
                    }
                );

                if (updateRes?.data?.accountAddressUpdate?.errors?.length) {
                    setError(updateRes.data.accountAddressUpdate.errors[0].message);
                    return;
                }
            }

            /* ---- Set default shipping ---- */
            if (currentAddressId) {
                await saleorFetch(
                    `
                    mutation SetDefault($id: ID!) {
                      accountSetDefaultAddress(id: $id, type: SHIPPING) {
                        errors { message }
                      }
                    }
                    `,
                    {
                        headers: authHeaders(token),
                        variables: { id: currentAddressId },
                    }
                );
            }
        }

        /* ---- Change password (optional) ---- */
        if (newPassword) {
            if (!currentPassword) {
                setError('Current password is required');
                return;
            }
            if (newPassword !== confirmPassword) {
                setError('Passwords do not match');
                return;
            }

            const pwdRes = await saleorFetch(
                `
                mutation ChangePassword($oldPassword: String!, $newPassword: String!) {
                  accountChangePassword(oldPassword: $oldPassword, newPassword: $newPassword) {
                    errors { message }
                  }
                }
                `,
                {
                    headers: authHeaders(token),
                    variables: {
                        oldPassword: currentPassword,
                        newPassword,
                    },
                }
            );

            if (pwdRes?.data?.accountChangePassword?.errors?.length) {
                setError(pwdRes.data.accountChangePassword.errors[0].message);
                return;
            }

            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        }

        alert('Profile updated');
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

                {error && (
                    <div className="bg-red-100 text-red-700 text-sm p-3 rounded">
                        {error}
                    </div>
                )}

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
                    <FormField label="Street line 1" value={street1} onChange={setStreet1} />
                    <FormField label="Street line 2" value={street2} onChange={setStreet2} />
                    <FormField label="City" value={city} onChange={setCity} />
                    <FormField label="State / Province" value={state} onChange={setState} />
                    <FormField label="ZIP / Postal Code" value={zip} onChange={setZip} />
                    <FormField label="Country" value={country} onChange={setCountry} />
                </section>

                {/* SECURITY */}
                <section className="space-y-6">
                    <h2 className="text-xs uppercase tracking-wide text-gray-600">
                        Change Password
                    </h2>
                    <FormField label="New Password" type="password" value={newPassword} onChange={setNewPassword} />
                    <FormField label="Confirm New Password" type="password" value={confirmPassword} onChange={setConfirmPassword} />
                    <h2 className="text-xs uppercase tracking-wide text-gray-600">
                        CONFIRM CHANGES
                    </h2>
                    <FormField label="Current Password" type="password" value={currentPassword} onChange={setCurrentPassword} />
                </section>

                <button
                    onClick={submit}
                    className="bg-[#2B3A4A] text-white px-6 py-3 mb-24 uppercase text-sm tracking-wide rounded-sm"
                >
                    Save →
                </button>
            </div>
        </main>
    );
}
