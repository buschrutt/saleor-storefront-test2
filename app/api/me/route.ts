import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { saleorFetch } from '@/lib/saleor';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('saleor_session')?.value;

        // ❌ Нет cookie → не залогинен
        if (!token) {
            return NextResponse.json({ user: null });
        }

        const query = `
      query Me {
        me {
          email
        }
      }
    `;

        const result = await saleorFetch(query, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const me = result?.data?.me;

        // ❌ Токен есть, но невалиден
        if (!me) {
            return NextResponse.json({ user: null });
        }

        // ✅ Залогинен
        return NextResponse.json({
            user: {
                email: me.email,
            },
        });
    } catch {
        return NextResponse.json({ user: null });
    }
}
