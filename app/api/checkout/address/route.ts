import { NextResponse } from 'next/server';
import { saleorFetch } from '@/lib/saleor';

type AddressInput = {
    fullName?: string;
    streetAddress1: string;
    streetAddress2?: string;
    city: string;
    countryArea?: string;
    postalCode: string;
    country: string;
};

export async function POST(req: Request) {
    try {
        const { checkoutId, address }: { checkoutId: string; address: AddressInput } =
            await req.json();

        const result = await saleorFetch(
            `
      mutation UpdateShippingAddress(
        $checkoutId: ID!
        $address: AddressInput!
      ) {
        checkoutShippingAddressUpdate(
          checkoutId: $checkoutId
          shippingAddress: $address
        ) {
          checkout {
            id

            subtotalPrice {
              net { amount }
            }

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
      `,
            {
                variables: {
                    checkoutId,
                    address,
                },
            }
        );

        const data = result?.data?.checkoutShippingAddressUpdate;

        if (data?.errors?.length) {
            console.error('address update errors:', data.errors);
            return NextResponse.json({ errors: data.errors }, { status: 400 });
        }

        if (!data?.checkout) {
            return NextResponse.json(
                { error: 'Checkout not returned' },
                { status: 400 }
            );
        }

        return NextResponse.json(data.checkout);
    } catch (err) {
        console.error('address update exception:', err);
        return NextResponse.json(
            { error: 'Failed to update address' },
            { status: 500 }
        );
    }
}
