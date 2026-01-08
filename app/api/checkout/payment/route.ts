// app/api/checkout/payment/route.ts

import { NextResponse } from 'next/server';
import { runPaymentFlow } from '@/lib/graphql/mutations/paymentFlow';

// Типы для запроса
interface PaymentRequest {
    checkoutId: string;
    email: string;
    billingAddress: {
        firstName: string;
        lastName: string;
        streetAddress1: string;
        streetAddress2?: string;
        city: string;
        countryArea: string;
        postalCode: string;
        country: string;
    };
    amount: number;
    paymentData: Record<string, unknown>;
}

// Типы для ответа
interface PaymentResponse {
    success: boolean;
    orderId?: string;
    transactionId?: string;
    error?: string;
    details?: string;
}

// Тип результата из runPaymentFlow
interface PaymentFlowResult {
    order?: {
        id: string;
    };
    transactionId?: string;
}

export async function POST(req: Request): Promise<NextResponse<PaymentResponse>> {
    try {
        console.log('📨 /api/checkout/payment called');

        const requestData: PaymentRequest = await req.json();
        const {
            checkoutId,
            email,
            billingAddress,
            amount,
            paymentData,
        } = requestData;

        console.log('📦 Payment request data:', {
            checkoutId,
            email: email ? `${email.substring(0, 3)}...` : 'none',
            hasBillingAddress: !!billingAddress,
            amount,
            paymentDataKeys: Object.keys(paymentData || {})
        });

        // 🔒 Валидация
        const validationErrors: string[] = [];

        if (!checkoutId) validationErrors.push('checkoutId is required');
        if (!email) validationErrors.push('email is required');
        if (!billingAddress) validationErrors.push('billingAddress is required');
        if (!amount || amount <= 0) validationErrors.push('Valid amount is required');

        if (validationErrors.length > 0) {
            console.error('❌ Validation errors:', validationErrors);
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid request',
                    details: validationErrors.join(', ')
                },
                { status: 400 }
            );
        }

        // Проверка обязательных полей billingAddress
        if (!billingAddress.firstName || !billingAddress.lastName) {
            console.error('❌ Missing name in billing address');
            return NextResponse.json(
                {
                    success: false,
                    error: 'First name and last name are required in billing address'
                },
                { status: 400 }
            );
        }

        console.log('🔄 Starting payment flow...');

        const result = await runPaymentFlow({
            checkoutId,
            email,
            billingAddress,
            amount,
            paymentData,
        });

        if (!result?.order?.id) {
            console.error('❌ No order created in payment flow');
            return NextResponse.json(
                {
                    success: false,
                    error: 'Order creation failed'
                },
                { status: 500 }
            );
        }

        console.log('✅ Payment flow completed successfully', {
            orderId: result.order.id,
            transactionId: result.transactionId
        });

        return NextResponse.json({
            success: true,
            orderId: result.order.id,
            transactionId: result.transactionId,
        });
    } catch (error) {
        console.error('❌ [PAYMENT FLOW ERROR]', error);

        let errorMessage = 'Unknown error';
        let errorDetails = '';

        if (error instanceof Error) {
            errorMessage = error.message;
            errorDetails = error.stack || '';

            // Логируем полную информацию об ошибке
            console.error('📋 Full error:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
        } else if (typeof error === 'string') {
            errorMessage = error;
        } else if (error && typeof error === 'object') {
            errorMessage = JSON.stringify(error);
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Payment failed',
                details: errorMessage
            },
            { status: 500 }
        );
    }
}