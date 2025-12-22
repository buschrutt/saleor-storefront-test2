'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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

type ProfileUpdatePayload = {
    firstName?: string;
    lastName?: string;
    shippingAddress?: {
        streetAddress1?: string;
        streetAddress2?: string;
        city?: string;
        countryArea?: string;
        postalCode?: string;
        country?: string;
    };
    password?: {
        currentPassword: string;
        newPassword: string;
    };
};

/* =========================
   Page
   ========================= */
export default function ProfilePage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // display
    const [email, setEmail] = useState('');

    // profile
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');

    // shipping
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
       Load profile + shipping
       ========================= */

    async function loadProfile() {
        setLoading(true);
        setError(null);

        try {
            const profileRes = await fetch('/api/profile', {
                credentials: 'include',
            });

            console.log('Profile load response:', profileRes.status);

            if (!profileRes.ok) {
                const errorText = await profileRes.text();
                throw new Error(`Failed to load profile: ${errorText}`);
            }

            const profileData = await profileRes.json();
            console.log('Profile data:', profileData);

            const me = profileData.me;

            setEmail(me.email);
            setFirstName(me.firstName ?? '');
            setLastName(me.lastName ?? '');

            const a = me.defaultShippingAddress;
            if (a) {
                setStreet1(a.streetAddress1 ?? '');
                setStreet2(a.streetAddress2 ?? '');
                setCity(a.city ?? '');
                setZip(a.postalCode ?? '');
                setState(a.countryArea ?? '');
                setCountry(a.country?.code ?? 'US');
            }
        } catch (err) {
            console.error('Load profile error:', err);
            setError(err instanceof Error ? err.message : 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadProfile();
    }, []);

    /* =========================
       Submit
       ========================= */
    async function submit() {
        setError(null);
        setSuccess(false);

        // Validation
        if (newPassword || confirmPassword || currentPassword) {
            if (!currentPassword) {
                setError('Current password is required');
                return;
            }
            if (newPassword !== confirmPassword) {
                setError('Passwords do not match');
                return;
            }
        }

        // Build payload
        const payload: ProfileUpdatePayload = {};

        // Only include fields that have changed or are required
        if (firstName.trim() || lastName.trim()) {
            payload.firstName = firstName.trim();
            payload.lastName = lastName.trim();
        }

        // Shipping address
        if (street1.trim() || city.trim() || zip.trim()) {
            payload.shippingAddress = {
                streetAddress1: street1.trim(),
                streetAddress2: street2.trim(),
                city: city.trim(),
                countryArea: state.trim(),
                postalCode: zip.trim(),
                country: country.trim(),
            };
        }

        // Password change
        if (newPassword && currentPassword) {
            payload.password = {
                currentPassword,
                newPassword,
            };
        }

        // Check if there's anything to update
        if (!payload.firstName && !payload.shippingAddress && !payload.password) {
            setError('No changes to save');
            return;
        }

        console.log('Sending payload:', payload);

        try {
            const res = await fetch('/api/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            console.log('Update response status:', res.status);

            const data = await res.json();
            console.log('Update response data:', data);

            if (!res.ok) {
                throw new Error(data.error || data.message || `Update failed with status ${res.status}`);
            }

            // Clear password fields on success
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');

            // Reload profile to get updated data
            await loadProfile();

            setSuccess(true);

            // Hide success message after 3 seconds
            setTimeout(() => setSuccess(false), 3000);

        } catch (err) {
            console.error('Update error:', err);
            setError(err instanceof Error ? err.message : 'Update failed');
        }
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
                    onClick={async () => {
                        await fetch('/api/logout', { method: 'POST' });
                        router.replace('/login');
                    }}
                    className="bg-[#2B3A4A] text-white px-4 py-3 uppercase text-sm tracking-wide rounded-sm hover:bg-[#111a2e] transition"
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

                {success && (
                    <div className="bg-green-100 text-green-700 text-sm p-3 rounded">
                        Profile updated successfully!
                    </div>
                )}

                {/* PROFILE */}
                <section className="space-y-6">
                    <h2 className="text-xs uppercase tracking-wide text-gray-600">
                        Personal Information
                    </h2>
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
                    className="bg-[#2B3A4A] text-white px-6 py-3 mb-24 uppercase text-sm tracking-wide rounded-sm hover:bg-[#111a2e] transition"
                >
                    Save →
                </button>
            </div>
        </main>
    );
}