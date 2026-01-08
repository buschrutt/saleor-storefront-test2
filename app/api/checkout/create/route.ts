import { NextResponse } from 'next/server'
import checkoutCreateList from '@/lib/graphql/mutations/checkoutCreateList'

const VARIANT_ID = 'UHJvZHVjdFZhcmlhbnQ6MQ=='

export async function POST(req: Request) {
    try {
        const body = await req.json()

        const { address, deliveryMethodId } = body

        if (!address) {
            return NextResponse.json(
                { error: 'Address is required' },
                { status: 400 }
            )
        }

        const result = await checkoutCreateList(
            VARIANT_ID,
            address,
            deliveryMethodId
        )

        return NextResponse.json(result)
    } catch (error) {
        console.error('checkoutCreate route error:', error)

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Checkout create failed' },
            { status: 500 }
        )
    }
}
