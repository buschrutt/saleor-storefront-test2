type CheckoutImage = {
    imageUrl: string
    alt?: string
} | null

const PAYLOAD_URL = process.env.PAYLOAD_PUBLIC_URL!

export async function getCheckoutImage(): Promise<CheckoutImage> {
    const res = await fetch(
        `${PAYLOAD_URL}/api/pages?where[slug][equals]=test-image-test&depth=2`,
        { cache: 'no-store' }
    )

    if (!res.ok) return null

    const data = await res.json()
    const page = data.docs?.[0]
    if (!page) return null

    const imageBlock = page.layout?.find(
        (b: any) => b.blockType === 'imageLinks'
    )

    const image = imageBlock?.images?.[0]
    if (!image?.url) return null

    return {
        imageUrl: image.url,
        alt: image.alt ?? '',
    }
}
