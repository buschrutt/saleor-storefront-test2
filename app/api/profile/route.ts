import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const SALEOR_URL = process.env.SALEOR_API_URL!

async function getTokenFromCookie(): Promise<string | undefined> {
    const cookieStore = await cookies()
    return cookieStore.get('saleor_token')?.value
}

/* =========================
   GET — load profile
   ========================= */
export async function GET() {
    try {
        const token = await getTokenFromCookie() // ✅ await

        if (!token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
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
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
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
        const token = await getTokenFromCookie() // ✅ await

        if (!token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await req.json()

        const res = await fetch(SALEOR_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        })

        const json = await res.json()

        if (json.errors) {
            return NextResponse.json(
                { error: json.errors[0]?.message || 'Update failed' },
                { status: 400 }
            )
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
