import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const SALEOR_URL = process.env.SALEOR_API_URL!

/* =========================
   Types
   ========================= */

type SaleorError = {
    message: string
    field?: string | null
}

type SaleorMutationResult = {
    errors: SaleorError[]
}

type SaleorResponse<T> = {
    data?: T
    errors?: SaleorError[]
}

type AddressInput = {
    streetAddress1?: string
    streetAddress2?: string
    city?: string
    countryArea?: string
    postalCode?: string
    country?: string
}

type ProfileUpdatePayload = {
    firstName?: string
    lastName?: string
    shippingAddress?: AddressInput
    password?: {
        currentPassword: string
        newPassword: string
    }
}

/* =========================
   Helpers
   ========================= */

async function getTokenFromCookie(): Promise<string | undefined> {
    const store = await cookies()
    return store.get('saleor_token')?.value
}

function collectErrors(block?: SaleorMutationResult): string | null {
    if (!block || block.errors.length === 0) return null
    return block.errors.map(e => e.message).join(', ')
}

/* =========================
   GET — load profile
   ========================= */

export async function GET() {
    try {
        const token = await getTokenFromCookie()

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const res = await fetch(SALEOR_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                query: `
                    query Profile {
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
            }),
        })

        const json = await res.json()

        if (json.errors || !json.data?.me) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        return NextResponse.json({ me: json.data.me })
    } catch (err) {
        console.error('Profile GET error:', err)
        return NextResponse.json(
            { error: 'Failed to load profile' },
            { status: 500 }
        )
    }
}

/* =========================
   POST — update profile
   ========================= */

export async function POST(req: Request) {
    try {
        const token = await getTokenFromCookie()

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = (await req.json()) as ProfileUpdatePayload

        const hasProfileChanges =
            body.firstName !== undefined || body.lastName !== undefined

        const hasPasswordChange =
            !!body.password?.currentPassword &&
            !!body.password?.newPassword

        /* 1️⃣ Update name */

        let updateError: string | null = null

        if (hasProfileChanges) {
            const res = await fetch(SALEOR_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    query: `
                        mutation UpdateName($firstName: String, $lastName: String) {
                            accountUpdate(
                                input: {
                                    firstName: $firstName
                                    lastName: $lastName
                                }
                            ) {
                                errors { message field }
                            }
                        }
                    `,
                    variables: {
                        firstName: body.firstName ?? null,
                        lastName: body.lastName ?? null,
                    },
                }),
            })

            const json = (await res.json()) as SaleorResponse<{
                accountUpdate?: SaleorMutationResult
            }>

            updateError =
                collectErrors(json.data?.accountUpdate) ||
                json.errors?.[0]?.message ||
                null
        }

        /* 2️⃣ Update password */

        let passwordError: string | null = null

        if (hasPasswordChange) {
            const res = await fetch(SALEOR_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    query: `
                        mutation ChangePassword(
                            $oldPassword: String!
                            $newPassword: String!
                        ) {
                            passwordChange(
                                oldPassword: $oldPassword
                                newPassword: $newPassword
                            ) {
                                errors { message field }
                            }
                        }
                    `,
                    variables: {
                        oldPassword: body.password!.currentPassword,
                        newPassword: body.password!.newPassword,
                    },
                }),
            })

            const json = (await res.json()) as SaleorResponse<{
                passwordChange?: SaleorMutationResult
            }>

            passwordError =
                collectErrors(json.data?.passwordChange) ||
                json.errors?.[0]?.message ||
                null
        }

        const combinedError = updateError || passwordError

        if (combinedError) {
            return NextResponse.json({ error: combinedError }, { status: 400 })
        }

        /* 3️⃣ Create + set default shipping address */

        if (body.shippingAddress) {
            const addressCreateRes = await fetch(SALEOR_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    query: `
                        mutation CreateAddress($input: AddressInput!) {
                            accountAddressCreate(input: $input) {
                                address { id }
                                errors { message field }
                            }
                        }
                    `,
                    variables: {
                        input: {
                            ...body.shippingAddress,
                            country: body.shippingAddress.country || 'US',
                        },
                    },
                }),
            })

            const addressJson = (await addressCreateRes.json()) as SaleorResponse<{
                accountAddressCreate?: {
                    address?: { id: string }
                    errors: SaleorError[]
                }
            }>

            const addressError =
                addressJson.data?.accountAddressCreate?.errors
                    ?.map(e => e.message)
                    .join(', ') ||
                addressJson.errors?.[0]?.message ||
                null

            const addressId =
                addressJson.data?.accountAddressCreate?.address?.id

            if (addressError || !addressId) {
                return NextResponse.json(
                    { error: addressError || 'Failed to create address' },
                    { status: 400 }
                )
            }

            const setDefaultRes = await fetch(SALEOR_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    query: `
                        mutation SetDefaultAddress($id: ID!) {
                            accountSetDefaultAddress(
                                id: $id
                                type: SHIPPING
                            ) {
                                errors { message field }
                            }
                        }
                    `,
                    variables: { id: addressId },
                }),
            })

            const setDefaultJson = (await setDefaultRes.json()) as SaleorResponse<{
                accountSetDefaultAddress?: SaleorMutationResult
            }>

            const setDefaultError =
                collectErrors(setDefaultJson.data?.accountSetDefaultAddress) ||
                setDefaultJson.errors?.[0]?.message ||
                null

            if (setDefaultError) {
                return NextResponse.json(
                    { error: setDefaultError },
                    { status: 400 }
                )
            }
        }

        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('Profile POST error:', err)
        return NextResponse.json(
            { error: 'Profile update failed' },
            { status: 500 }
        )
    }
}
