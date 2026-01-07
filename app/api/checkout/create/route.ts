import { NextResponse } from 'next/server'
import { saleorFetch } from '@/lib/saleor'
import {
    PRODUCT_INFO_MUTATION,
    type CheckoutCreateVariables,
    type CheckoutCreateResult
} from '@/lib/graphql/mutations/productInfo'

const CHANNEL = 'default-channel'
const VARIANT_ID = 'UHJvZHVjdFZhcmlhbnQ6MQ=='

export async function POST() {
    try {
        const variables: CheckoutCreateVariables = {
            channel: CHANNEL,
            lines: [
                {
                    variantId: VARIANT_ID,
                    quantity: 1,
                },
            ],
        }

        const data = await saleorFetch<CheckoutCreateResult>({
            query: PRODUCT_INFO_MUTATION,
            variables,
        })

        const result = data.checkoutCreate

        if (result.errors.length || !result.checkout) {
            console.error('checkoutCreate errors:', result.errors)
            return NextResponse.json(
                { error: 'Checkout create failed' },
                { status: 400 }
            )
        }

        return NextResponse.json(result.checkout)
    } catch (error) {
        console.error('checkoutCreate exception:', error)
        return NextResponse.json(
            { error: 'Saleor checkoutCreate failed' },
            { status: 500 }
        )
    }
}