import { NextResponse } from 'next/server'
import { saleorFetch } from '@/lib/saleor'

type AddressInput = {
    fullName?: string
    streetAddress1: string
    streetAddress2?: string
    city: string
    countryArea: string
    postalCode: string
    country: string
}

type CheckoutAddressUpdateResult = {
    checkoutShippingAddressUpdate: {
        checkout: {
            id: string
            totalPrice: {
                net: { amount: number }
                gross: { amount: number; currency: string }
            }
        } | null
        errors: { field: string | null; message: string }[]
    }
}

export async function POST(req: Request) {
    try {
        const {
            checkoutId,
            address,
        }: { checkoutId: string; address: AddressInput } = await req.json()

        const query = `
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
        `

        const data = await saleorFetch<CheckoutAddressUpdateResult>({
            query,
            variables: {
                checkoutId,
                address,
            },
        })

        const result = data.checkoutShippingAddressUpdate

        if (result.errors.length || !result.checkout) {
            console.error('address update errors:', result.errors)
            return NextResponse.json(
                { error: 'Address update failed' },
                { status: 400 }
            )
        }

        // ⬅️ ВАЖНО: возвращаем ТОЛЬКО checkout с totalPrice
        return NextResponse.json(result.checkout)
    } catch (err) {
        console.error('address update exception:', err)
        return NextResponse.json(
            { error: 'Failed to update address' },
            { status: 500 }
        )
    }
}
