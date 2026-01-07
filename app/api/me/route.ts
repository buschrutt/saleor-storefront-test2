import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { saleorFetch } from '@/lib/saleor'

export async function GET() {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('saleor_token')?.value

        // ❌ нет токена → не залогинен
        if (!token) {
            return NextResponse.json({ user: null })
        }

        const query = `
            query Me {
                me {
                    email
                }
            }
        `

        const result = await saleorFetch<{
            me: { email: string } | null
        }>({
            query: `
        query Me {
            me {
                email
            }
        }
    `,
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })


        const me = result?.me

        // ❌ токен есть, но user уже невалиден
        if (!me) {
            return NextResponse.json({ user: null })
        }

        // ✅ всё ок
        return NextResponse.json({
            user: {
                email: me.email,
            },
        })
    } catch (err) {
        /**
         * 🔑 КЛЮЧЕВОЙ МОМЕНТ
         * Signature expired / invalid token
         * — это НЕ 500, это просто logout
         */
        console.warn('api/me: treating error as unauthenticated', err)
        return NextResponse.json({ user: null })
    }
}
