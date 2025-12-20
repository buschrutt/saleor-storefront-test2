import { NextResponse } from 'next/server';
import { saleorFetch } from '@/lib/saleor';

const CHANNEL = 'default-channel';
const VARIANT_ID = 'UHJvZHVjdFZhcmlhbnQ6MQ==';

/* =========================
   Editor.js types
   ========================= */

type EditorJsParagraphBlock = {
    type: 'paragraph';
    data: {
        text: string;
    };
};

type EditorJsBlock =
    | EditorJsParagraphBlock
    | {
    type: string;
    data?: unknown;
};

type EditorJsDocument = {
    blocks: EditorJsBlock[];
};

/* =========================
   Checkout types
   ========================= */

type CheckoutProduct = {
    name: string;
    description?: string;
};

type CheckoutVariant = {
    product: CheckoutProduct;
};

type CheckoutLine = {
    quantity: number;
    variant: CheckoutVariant;
};

type Checkout = {
    id: string;
    lines: CheckoutLine[];
    subtotalPrice: {
        net: { amount: number };
    };
    totalPrice: {
        net: { amount: number };
        gross: { amount: number; currency: string };
    };
};

/* =========================
   Type guards & helpers
   ========================= */

function isEditorJsDocument(value: unknown): value is EditorJsDocument {
    if (typeof value !== 'object' || value === null) return false;
    if (!('blocks' in value)) return false;

    const blocks = (value as { blocks: unknown }).blocks;
    return Array.isArray(blocks);
}

function normalizeDescription(description?: string): string {
    if (!description) return '';

    let parsed: unknown;

    try {
        parsed = JSON.parse(description);
    } catch {
        // уже обычный текст
        return description.trim();
    }

    if (!isEditorJsDocument(parsed)) {
        return '';
    }

    return parsed.blocks
        .filter(
            (block): block is EditorJsParagraphBlock =>
                block.type === 'paragraph' &&
                typeof block.data === 'object' &&
                block.data !== null &&
                'text' in block.data &&
                typeof (block.data as { text: unknown }).text === 'string'
        )
        .map(block => block.data.text)
        .join(' ')
        .trim();
}

/* =========================
   Route
   ========================= */

export async function POST() {
    try {
        const result = await saleorFetch(
            `
            mutation CreateCheckout($variantId: ID!) {
                checkoutCreate(
                    input: {
                        channel: "${CHANNEL}"
                        lines: [{ quantity: 1, variantId: $variantId }]
                    }
                ) {
                    checkout {
                        id
                        lines {
                            quantity
                            variant {
                                product {
                                    name
                                    description
                                }
                            }
                        }
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
                    variantId: VARIANT_ID,
                },
            }
        );

        const data = result?.data?.checkoutCreate;

        if (data?.errors?.length) {
            return NextResponse.json({ errors: data.errors }, { status: 400 });
        }

        if (!data?.checkout) {
            return NextResponse.json(
                { error: 'Checkout not created' },
                { status: 400 }
            );
        }

        // ⬇⬇⬇ КЛЮЧЕВОЙ МОМЕНТ ⬇⬇⬇
        const checkout: Checkout = data.checkout;

        checkout.lines = checkout.lines.map(line => ({
            ...line,
            variant: {
                ...line.variant,
                product: {
                    ...line.variant.product,
                    description: normalizeDescription(
                        line.variant.product.description
                    ),
                },
            },
        }));

        return NextResponse.json(checkout);
    } catch (error) {
        console.error('checkoutCreate exception:', error);
        return NextResponse.json(
            { error: 'Saleor checkoutCreate failed' },
            { status: 500 }
        );
    }
}
