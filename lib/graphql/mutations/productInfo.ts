export const PRODUCT_INFO_MUTATION = `
  mutation CreateCheckout(
    $channel: String!
    $lines: [CheckoutLineInput!]!
  ) {
    checkoutCreate(
      input: {
        channel: $channel
        lines: $lines
      }
    ) {
      checkout {
        id
        totalPrice {
          net { amount }
          gross { amount currency }
        }
      }
      errors {
        field
        message
      }
    }
  }
`;

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