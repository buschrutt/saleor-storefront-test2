import { NextResponse } from 'next/server'
import { saleorFetch } from '@/lib/saleor'

const VARIANT_ID = 'UHJvZHVjdFZhcmlhbnQ6MQ=='
const CHANNEL = 'default-channel'

/* =========================
   Types
   ========================= */

type LeftColumnQueryResult = {
    productVariant: {
        id: string
        pricing: {
            price: {
                net: {
                    amount: number
                    currency: string
                }
            }
        }
        product: {
            name: string
            description: string | null
            media: {
                url: string
                alt: string | null
            }[]
        }
    } | null
}

/* =========================
   Editor.js minimal types
   ========================= */

type EditorJsParagraphBlock = {
    type: 'paragraph'
    data: {
        text: string
    }
}

type EditorJsBlock = EditorJsParagraphBlock | {
    type: string
    data?: unknown
}

type EditorJsDocument = {
    time?: number
    version?: string
    blocks: EditorJsBlock[]
}

/* =========================
   Helpers
   ========================= */

/**
 * Converts Editor.js JSON (stored as string) to plain text.
 * Only paragraph blocks are supported (intentionally).
 */
function editorJsToText(description: string | null): string | null {
    if (!description) return null

    try {
        const doc = JSON.parse(description) as EditorJsDocument

        if (!Array.isArray(doc.blocks)) {
            return description
        }

        return doc.blocks
            .filter(
                (block): block is EditorJsParagraphBlock =>
                    block.type === 'paragraph' &&
                    typeof block.data === 'object' &&
                    block.data !== null &&
                    typeof (block.data as EditorJsParagraphBlock['data']).text === 'string'
            )
            .map(block => block.data.text)
            .join('\n\n')
    } catch {
        // Fallback: return raw string if it's not valid JSON
        return description
    }
}

/* =========================
   GET — checkout left column
   ========================= */

export async function GET() {
    const query = `
        query LeftColumn($variantId: ID!, $channel: String!) {
            productVariant(id: $variantId, channel: $channel) {
                id
                pricing {
                    price {
                        net {
                            amount
                            currency
                        }
                    }
                }
                product {
                    name
                    description
                    media {
                        url
                        alt
                    }
                }
            }
        }
    `

    const data = await saleorFetch<LeftColumnQueryResult>({
        query,
        variables: {
            variantId: VARIANT_ID,
            channel: CHANNEL,
        },
    })

    if (!data.productVariant) {
        return NextResponse.json(
            { error: 'Variant not found' },
            { status: 404 }
        )
    }

    const v = data.productVariant
    const image = v.product.media?.[0] ?? null

    return NextResponse.json({
        product: {
            name: v.product.name,
            description: editorJsToText(v.product.description),
        },
        quantity: 1,
        image: image
            ? {
                url: image.url,
                alt: image.alt,
            }
            : null,
        basePrice: {
            net: v.pricing.price.net.amount,
            currency: v.pricing.price.net.currency,
        },
    })
}
