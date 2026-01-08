// app/api/checkout/payment/route.ts

import { NextResponse } from 'next/server';
import { runPaymentFlow } from '@/lib/graphql/mutations/paymentFlow';

export async function POST(req: Request) {
    try {
        const {
            checkoutId,
            email,
            billingAddress,
            amount,
            paymentData,
        } = await req.json();

        // 🔒 Жёсткая валидация
        if (!checkoutId) {
            return NextResponse.json(
                { error: 'checkoutId is required' },
                { status: 400 }
            );
        }

        if (!email) {
            return NextResponse.json(
                { error: 'email is required' },
                { status: 400 }
            );
        }

        if (!billingAddress) {
            return NextResponse.json(
                { error: 'billingAddress is required' },
                { status: 400 }
            );
        }

        if (!amount) {
            return NextResponse.json(
                { error: 'amount is required' },
                { status: 400 }
            );
        }

        console.log('[PAYMENT API]', { checkoutId, email });

        const order = await runPaymentFlow({
            checkoutId,
            email,
            billingAddress,
            amount,
            paymentData,
        });

        return NextResponse.json({
            success: true,
            orderId: order.id,
        });
    } catch (error) {
        console.error('[PAYMENT FLOW ERROR]', error);

        return NextResponse.json(
            { error: 'Checkout failed' },
            { status: 500 }
        );
    }
}
