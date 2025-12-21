import { NextResponse } from 'next/server';
import { saleorFetch } from '@/lib/saleor';

export async function POST(req: Request) {
    try {
        const { checkoutId } = await req.json();

        if (!checkoutId) {
            return NextResponse.json(
                { error: 'Missing checkoutId' },
                { status: 400 }
            );
        }

        const mutation = `
      mutation AttachCheckoutToUser {
        checkoutCustomerAttach(checkoutId: "${checkoutId}") {
          checkout {
            id
            user {
              email
            }
          }
          errors {
            field
            message
          }
        }
      }
    `;

        const result = await saleorFetch(mutation);

        return NextResponse.json(result.data.checkoutCustomerAttach);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to attach checkout' },
            { status: 500 }
        );
    }
}
