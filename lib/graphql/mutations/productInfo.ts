import { importGraphQL } from '../utils/importGraphQL';

export const PRODUCT_INFO_MUTATION = importGraphQL('lib/graphql/queries/productInfo.graphql');

export type CheckoutCreateVariables = {
    channel: string;
    lines: {
        variantId: string;
        quantity: number;
    }[];
};

export type CheckoutCreateResult = {
    checkoutCreate: {
        checkout: {
            id: string;
            totalPrice: {
                net: { amount: number };
                gross: { amount: number; currency: string };
            };
        } | null;
        errors: { field: string | null; message: string }[];
    };
};