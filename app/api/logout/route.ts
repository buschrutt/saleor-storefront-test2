import { NextResponse } from 'next/server'

export async function POST() {
    const res = NextResponse.json({ ok: true })

    res.cookies.set({
        name: 'saleor_token', // ✅ ТОТ ЖЕ COOKIE
        value: '',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 0,
    })

    return res
}
