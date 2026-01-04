import React from 'react';

type CheckoutLine = {
    quantity: number;
    variant: {
        product: {
            name: string;
            description?: string;
        };
    };
};

type CheckoutImage = {
    imageUrl: string;
    alt?: string;
} | null;

export function CheckoutSummary({
                                    checkoutImage,
                                    line,
                                    subtotal,
                                    tax,
                                    total,
                                    currency,
                                }: {
    checkoutImage: CheckoutImage;
    line: CheckoutLine;
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
}) {
    return (
        <div className="text-sm">
            {checkoutImage && (
                <div className="mb-8">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={checkoutImage.imageUrl}
                        alt={checkoutImage.alt ?? ''}
                        className="w-full rounded-2xl"
                    />
                </div>
            )}

            <h2 className="mb-6 uppercase tracking-wide text-gray-700">
                <strong>Order Summary</strong>
            </h2>

            <div className="space-y-6">
                {/* PRODUCT */}
                <div className="space-y-1">
                    <div className="font-medium">
                        {line.variant.product.name}
                    </div>

                    {line.variant.product.description && (
                        <div className="text-gray-500 text-sm leading-snug">
                            {line.variant.product.description}
                        </div>
                    )}

                    <div className="text-gray-400 text-xs tracking-wide">
                        Qty: {line.quantity}.00
                    </div>
                </div>

                <div className="border-t border-gray-200" />

                {/* PRICES */}
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <span>SUBTOTAL:</span>
                        <span>
                            ${subtotal.toFixed(2)} {currency}
                        </span>
                    </div>

                    <div className="flex justify-between">
                        <span>Tax:</span>
                        <span>
                            ${tax.toFixed(2)} {currency}
                        </span>
                    </div>
                </div>

                <div className="border-t border-gray-200" />

                <div className="flex justify-between font-medium text-base">
                    <span>
                        <strong>TOTAL:</strong>
                    </span>
                    <span>
                        <strong>
                            ${total.toFixed(2)} {currency}
                        </strong>
                    </span>
                </div>
            </div>
        </div>
    );
}
