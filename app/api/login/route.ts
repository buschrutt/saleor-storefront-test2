import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { saleorFetch } from '@/lib/saleor'

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json()

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Missing email or password' },
                { status: 400 }
            )
        }

        // 1️⃣ Получаем JWT от Saleor
        const result = await saleorFetch<{
            tokenCreate: {
                token: string | null
                errors: { message: string }[]
            }
        }>({
            query: `
                mutation Login($email: String!, $password: String!) {
                    tokenCreate(email: $email, password: $password) {
                        token
                        errors { message }
                    }
                }
            `,
            variables: { email, password },
        })

        const data = result.tokenCreate

        if (!data.token || data.errors.length) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            )
        }

        // 2️⃣ ВОТ ЗДЕСЬ КЛАДЁМ COOKIE ⬇⬇⬇
        const cookieStore = await cookies()
        cookieStore.set({
            name: 'saleor_token',
            value: data.token,
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
        })

        // 3️⃣ Возвращаем ответ клиенту
        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('Login error:', err)
        return NextResponse.json(
            { error: 'Login failed' },
            { status: 500 }
        )
    }
}
