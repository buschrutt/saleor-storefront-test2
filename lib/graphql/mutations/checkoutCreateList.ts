import { saleorFetch } from '@/lib/saleor';
import { importGraphQL } from '../utils/importGraphQL';

// Импортируем GraphQL запросы
const CHECKOUT_CREATE_QUERY = importGraphQL(
    'lib/graphql/queries/checkoutCreate.graphql'
);

const CHECKOUT_DELIVERY_METHOD_UPDATE_QUERY = importGraphQL(
    'lib/graphql/queries/checkoutDeliveryMethodUpdate.graphql'
);

console.log('=== DEBUG: Imported CHECKOUT_CREATE_QUERY ===');
console.log(CHECKOUT_CREATE_QUERY);
console.log('=== END DEBUG ===');

// Базовый тип для любого GraphQL ответа
type GraphQLResponse<T> = { data?: T; errors?: Array<{ message: string }> };

// Типы для ответов
type CheckoutResponse = {
    checkoutCreate?: {
        checkout?: { id: string };
        errors?: Array<{ message: string }>;
    };
};

type DeliveryResponse = {
    checkoutDeliveryMethodUpdate?: {
        checkout?: Record<string, unknown>;
        errors?: Array<{ message: string }>;
    };
};

// Базовые типы для адреса
export type SimpleAddress = {
    firstName?: string;
    lastName?: string;
    streetAddress1: string;
    streetAddress2?: string;
    city: string;
    countryArea?: string;
    postalCode?: string;
    country: string;
};

export type Checkout = {
    id: string;
    subtotalPrice?: {
        net?: {
            amount: number;
        };
    };
    totalPrice?: {
        net?: {
            amount: number;
        };
        gross?: {
            amount: number;
            currency: string;
        };
    };
    shippingAddress?: {
        id?: string;
        streetAddress1?: string;
        city?: string;
        country?: {
            code: string;
        };
    };
};

// Основная функция
export async function checkoutCreateList(
    variantId: string,
    address: SimpleAddress,
    deliveryMethodId?: string
) {
    // 1. Типизированный вызов создания checkout

    const createResponse = await saleorFetch<CheckoutResponse>({
        query: CHECKOUT_CREATE_QUERY,
        variables: { variantId, address },
    });

    // Проверяем наличие данных
    const createData = createResponse.checkoutCreate;

    if (!createData?.checkout?.id) {
        const errorMsg = createData?.errors?.[0]?.message || 'Failed to create checkout';
        throw new Error(errorMsg);
    }

    const checkoutId = createData.checkout.id;
    let deliveryData: DeliveryResponse['checkoutDeliveryMethodUpdate'] | undefined;
    const errors = [...(createData.errors || [])];

    // 2. Обновляем способ доставки если передан ID
    if (deliveryMethodId) {
        const deliveryResponse = await saleorFetch<DeliveryResponse>({
            query: CHECKOUT_DELIVERY_METHOD_UPDATE_QUERY,
            variables: { checkoutId, deliveryMethodId },
        });

        deliveryData = deliveryResponse.checkoutDeliveryMethodUpdate;

        if (deliveryData?.errors?.length) {
            errors.push(...deliveryData.errors);
        }
    }

    // 3. Возвращаем результат
    return {
        checkoutId,
        checkout: {
            ...createData.checkout,
            ...(deliveryData?.checkout || {}),
        } as Checkout,
        errors,
    };
}

export default checkoutCreateList;