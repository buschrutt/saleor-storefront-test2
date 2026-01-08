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

/* =========================
   Payment flow
========================= */

export async function runPaymentFlow(params: {
    checkoutId: string;
    email: string;
    billingAddress: AddressInput;
    amount: number;
    paymentData: unknown;
}) {
    const { checkoutId, email, billingAddress, amount, paymentData } = params;

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
    const gatewayInit = (await saleorFetch({
        query: GatewayInitialization,
        variables: { checkoutId, amount },
    })) as {
        paymentGatewayInitialize?: {
            gatewayConfigs?: { id: string }[];
        };
    };

    const gatewayId =
        gatewayInit.paymentGatewayInitialize?.gatewayConfigs?.[0]?.id;

    if (!gatewayId) {
        throw new Error('Stripe gateway not initialized');
    }

    /* 3️⃣ Transaction init */
    const transactionInit = (await saleorFetch({
        query: TransactionInitialization,
        variables: {
            checkoutId,
            paymentGatewayId: gatewayId,
            amount,
            data: paymentData,
        },
    })) as {
        transactionInitialize?: {
            transaction?: { id: string };
        };
    };

    const transactionId =
        transactionInit.transactionInitialize?.transaction?.id;

    if (!transactionId) {
        throw new Error('Transaction not created');
    }

    /* 4️⃣ Process transaction */
    await saleorFetch({
        query: TransactionProcessing,
        variables: { transactionId },
    });

    /* 5️⃣ Complete checkout */
    const completed = (await saleorFetch({
        query: CompleteCheckout,
        variables: { checkoutId },
    })) as {
        checkoutComplete?: {
            order?: { id: string };
        };
    };

    const order = completed.checkoutComplete?.order;

    if (!order) {
        throw new Error('Checkout not completed');
    }

    return order;
}
