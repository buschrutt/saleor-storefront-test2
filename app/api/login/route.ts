import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { saleorFetch } from '@/lib/saleor';

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Missing email or password' },
                { status: 400 }
            );
        }

        const mutation = `
      mutation Login($email: String!, $password: String!) {
        tokenCreate(email: $email, password: $password) {
          token
          user {
            email
          }
          errors {
            field
            message
          }
        }
      }
    `;

        const result = await saleorFetch(mutation, {
            variables: { email, password },
        });

        const data = result.data.tokenCreate;

        if (data.errors?.length || !data.token) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // 🔐 СТАВИМ httpOnly COOKIE
        const cookieStore = await cookies();
        cookieStore.set({
            name: 'saleor_session',
            value: data.token,
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
        });

        return NextResponse.json({
            email: data.user.email,
        });
    } catch (e) {
        return NextResponse.json(
            { error: 'Login failed' },
            { status: 500 }
        );
    }
}
