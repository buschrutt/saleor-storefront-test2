// lib/graphql/mutations/paymentFlow.ts

import { saleorFetch } from '@/lib/saleor';
import { importGraphQL } from '@/lib/graphql/utils/importGraphQL';

/* =========================
   Load GraphQL documents
========================= */

const CheckoutBillingAddressUpdate = importGraphQL(
    'lib/graphql/queries/checkoutBillingAddressUpdate.graphql'
);

const GatewayInitialization = importGraphQL(
    'lib/graphql/queries/gatewayInitialization.graphql'
);

const TransactionInitialization = importGraphQL(
    'lib/graphql/queries/transactionInitialization.graphql'
);

const TransactionProcessing = importGraphQL(
    'lib/graphql/queries/transactionProcessing.graphql'
);

const CompleteCheckout = importGraphQL(
    'lib/graphql/queries/completeCheckout.graphql'
);

const CheckoutEmailUpdate = importGraphQL(
    'lib/graphql/queries/emailSet.graphql'
);

/* =========================
   Types
========================= */

export type AddressInput = {
    firstName: string;
    lastName: string;
    streetAddress1: string;
    streetAddress2?: string;
    city: string;
    countryArea?: string;
    postalCode: string;
    country: string;
    phone?: string;
    companyName?: string;
};

export type PaymentData = {
    paymentMethod?: string;
    paymentMethodId?: string;
    type?: string;
    savePaymentMethod?: boolean;
    returnUrl?: string;
    paymentIntent?: string;
    status?: string;
    [key: string]: unknown; // Для дополнительных полей
};

export type GatewayConfig = {
    id: string;
    data?: Record<string, unknown>;
    errors?: Array<{
        field: string | null;
        message: string | null;
        code: string;
    }>;
};

export type TransactionResult = {
    transaction?: {
        id: string;
    };
    data?: Record<string, unknown>;
    errors?: Array<{
        field: string | null;
        message: string | null;
        code: string;
    }>;
};

export type CheckoutCompleteResult = {
    order?: {
        id: string;
    };
    errors?: Array<{
        field: string | null;
        message: string | null;
        code: string;
    }>;
};

/* =========================
   GraphQL Response Types
========================= */

type GatewayInitResponse = {
    paymentGatewayInitialize?: {
        gatewayConfigs?: GatewayConfig[];
        errors?: Array<{
            field: string | null;
            message: string | null;
            code: string;
        }>;
    };
};

type TransactionInitResponse = {
    transactionInitialize?: TransactionResult;
};

type TransactionProcessResponse = {
    transactionProcess?: TransactionResult;
};

type CheckoutCompleteResponse = {
    checkoutComplete?: CheckoutCompleteResult;
};

/* =========================
   Payment flow
========================= */

export async function runPaymentFlow(params: {
    checkoutId: string;
    email: string;
    billingAddress: AddressInput;
    amount: number;
    paymentData: PaymentData;
}) {
    const { checkoutId, email, billingAddress, amount, paymentData } = params;

    console.log('🔄 Starting payment flow for checkout:', checkoutId);

    /* 0️⃣ EMAIL — ОБЯЗАТЕЛЬНО */
    await saleorFetch({
        query: CheckoutEmailUpdate,
        variables: { checkoutId, email },
    });

    /* 1️⃣ Billing address */
    await saleorFetch({
        query: CheckoutBillingAddressUpdate,
        variables: { checkoutId, billingAddress },
    });

    /* 2️⃣ Gateway init */
    const gatewayInit = await saleorFetch<GatewayInitResponse>({
        query: GatewayInitialization,
        variables: { checkoutId, amount },
    });

    const gatewayId =
        gatewayInit.paymentGatewayInitialize?.gatewayConfigs?.[0]?.id;

    if (!gatewayId) {
        throw new Error('Stripe gateway not initialized');
    }

    console.log('✅ Gateway initialized:', gatewayId);

    /* 3️⃣ Transaction init */
    const transactionInit = await saleorFetch<TransactionInitResponse>({
        query: TransactionInitialization,
        variables: {
            checkoutId,
            paymentGatewayId: gatewayId,
            amount,
            data: paymentData as Record<string, unknown>, // Приводим к нужному типу
        },
    });

    const transactionId =
        transactionInit.transactionInitialize?.transaction?.id;

    if (!transactionId) {
        throw new Error('Transaction not created');
    }

    console.log('✅ Transaction created:', transactionId);

    /* 4️⃣ Process transaction */
    await saleorFetch<TransactionProcessResponse>({
        query: TransactionProcessing,
        variables: { transactionId },
    });

    console.log('✅ Transaction processed');

    /* 🔴 ВАЖНОЕ ДОПОЛНЕНИЕ: Подтверждаем транзакцию */
    try {
        console.log('💳 Charging transaction:', transactionId, 'amount:', amount);

        // Создаем мутацию для подтверждения транзакции
        const chargeMutation = `
            mutation TransactionCharge($transactionId: ID!, $amount: PositiveDecimal!) {
                transactionRequestAction(
                    id: $transactionId
                    actionType: CHARGE
                    amount: $amount
                ) {
                    transaction {
                        id
                        actions
                        chargedAmount {
                            amount
                            currency
                        }
                    }
                    errors {
                        field
                        message
                        code
                    }
                }
            }
        `;

        const chargeResult = await saleorFetch({
            query: chargeMutation,
            variables: {
                transactionId,
                amount,
            },
        });

        console.log('✅ Transaction charged:', chargeResult);
    } catch (chargeError) {
        console.error('❌ Failed to charge transaction:', chargeError);
        // Не прерываем процесс, продолжаем с чекаутом
    }

    /* 5️⃣ Complete checkout */
    const completed = await saleorFetch<CheckoutCompleteResponse>({
        query: CompleteCheckout,
        variables: { checkoutId },
    });

    const order = completed.checkoutComplete?.order;

    if (!order) {
        throw new Error('Checkout not completed');
    }

    console.log('✅ Order created:', order.id);

    return {
        order,
        transactionId,
    };
}